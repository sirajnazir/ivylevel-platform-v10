# build_pinecone_index.py
# Build Pinecone index for Jenny AI with jtbd and interactions namespaces only
# Facts and outcomes are served from Postgres, not vector search

import os
import json
import psycopg
from datetime import datetime
from typing import List, Dict, Optional
from pinecone import Pinecone, ServerlessSpec
import hashlib

# Constants
EMBEDDING_DIMENSION = 1536  # OpenAI ada-002 dimension
INDEX_NAME = "jenny-ai-v3"
BATCH_SIZE = 100

class PineconeIndexBuilder:
    def __init__(self, pinecone_api_key: str, openai_api_key: str, connection_string: str = None):
        self.pc = Pinecone(api_key=pinecone_api_key)
        self.openai_api_key = openai_api_key
        self.connection_string = connection_string or "postgresql://localhost/jenny_ai"
        self.index = None
        
        # Import OpenAI client
        try:
            from openai import OpenAI
            self.openai_client = OpenAI(api_key=openai_api_key)
        except ImportError:
            raise ImportError("Please install openai: pip install openai")
    
    def create_index(self):
        """Create new Pinecone index with serverless spec"""
        print(f"Creating Pinecone index: {INDEX_NAME}")
        
        # Check if index exists
        existing_indexes = [idx.name for idx in self.pc.list_indexes()]
        if INDEX_NAME in existing_indexes:
            print(f"Index {INDEX_NAME} already exists. Deleting...")
            self.pc.delete_index(INDEX_NAME)
            import time
            time.sleep(10)  # Wait for deletion
        
        # Create new index
        self.pc.create_index(
            name=INDEX_NAME,
            dimension=EMBEDDING_DIMENSION,
            metric='cosine',
            spec=ServerlessSpec(
                cloud='aws',
                region='us-east-1'
            )
        )
        
        # Wait for index to be ready
        import time
        while not self.pc.describe_index(INDEX_NAME).status['ready']:
            time.sleep(1)
        
        self.index = self.pc.Index(INDEX_NAME)
        print(f"Index {INDEX_NAME} created successfully")
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI"""
        response = self.openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    
    def generate_id(self, namespace: str, content: str) -> str:
        """Generate deterministic ID for vector"""
        hash_input = f"{namespace}:{content}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    def index_jtbd_records(self):
        """Index JTBD records"""
        print("\nIndexing JTBD records...")
        
        with psycopg.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        jtbd_id, student_id, jtbd_title, 
                        phase, domain, synopsis, 
                        date_start, date_end
                    FROM jtbd
                    ORDER BY jtbd_id
                """)
                
                vectors = []
                for row in cursor:
                    jtbd_id, student_id, title, phase, domain, synopsis, date_start, date_end = row
                    
                    # Create searchable text
                    text_parts = [title]
                    if synopsis:
                        text_parts.append(synopsis)
                    if phase:
                        text_parts.append(f"Phase: {phase}")
                    
                    text = " ".join(text_parts)
                    
                    # Generate embedding
                    embedding = self.generate_embedding(text)
                    
                    # Create metadata
                    metadata = {
                        "jtbd_id": jtbd_id,
                        "student_id": student_id,
                        "title": title,
                        "phase": phase or "",
                        "domain": domain or "",
                        "date_start": date_start.isoformat() if date_start else "",
                        "date_end": date_end.isoformat() if date_end else ""
                    }
                    
                    # Create vector
                    vector_id = self.generate_id("jtbd", jtbd_id)
                    vectors.append({
                        "id": vector_id,
                        "values": embedding,
                        "metadata": metadata
                    })
                    
                    # Batch upsert
                    if len(vectors) >= BATCH_SIZE:
                        self.index.upsert(vectors=vectors, namespace="jtbd")
                        print(f"  Indexed {len(vectors)} JTBD records")
                        vectors = []
                
                # Final batch
                if vectors:
                    self.index.upsert(vectors=vectors, namespace="jtbd")
                    print(f"  Indexed {len(vectors)} JTBD records")
        
        print("JTBD indexing complete")
    
    def index_interaction_records(self):
        """Index interaction records"""
        print("\nIndexing Interaction records...")
        
        with psycopg.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        snippet_id, jtbd_id, student_id, occurred_at,
                        channel, user_ask, jenny_reply, tactic_name,
                        framework, tags
                    FROM interactions
                    WHERE excluded_from_tactic_scoring = false
                    AND (user_ask IS NOT NULL OR jenny_reply IS NOT NULL)
                    ORDER BY snippet_id
                """)
                
                vectors = []
                total_indexed = 0
                
                for row in cursor:
                    (snippet_id, jtbd_id, student_id, occurred_at, channel, 
                     user_ask, jenny_reply, tactic_name, framework, tags) = row
                    
                    # Create searchable text
                    text_parts = []
                    if user_ask:
                        text_parts.append(f"User: {user_ask}")
                    if jenny_reply:
                        text_parts.append(f"Jenny: {jenny_reply}")
                    if tactic_name:
                        text_parts.append(f"Tactic: {tactic_name}")
                    if framework:
                        text_parts.append(f"Framework: {framework}")
                    
                    text = " ".join(text_parts)
                    
                    # Generate embedding
                    embedding = self.generate_embedding(text)
                    
                    # Create metadata
                    metadata = {
                        "snippet_id": snippet_id,
                        "jtbd_id": jtbd_id,
                        "student_id": student_id,
                        "occurred_at": occurred_at.isoformat(),
                        "channel": channel,
                        "tactic_name": tactic_name or "",
                        "framework": framework or "",
                        "tags": json.dumps(tags) if tags else "[]"
                    }
                    
                    # Create vector
                    vector_id = self.generate_id("interactions", snippet_id)
                    vectors.append({
                        "id": vector_id,
                        "values": embedding,
                        "metadata": metadata
                    })
                    
                    # Batch upsert
                    if len(vectors) >= BATCH_SIZE:
                        self.index.upsert(vectors=vectors, namespace="interactions")
                        total_indexed += len(vectors)
                        print(f"  Indexed {total_indexed} interaction records")
                        vectors = []
                
                # Final batch
                if vectors:
                    self.index.upsert(vectors=vectors, namespace="interactions")
                    total_indexed += len(vectors)
                    print(f"  Indexed {total_indexed} interaction records")
        
        print("Interaction indexing complete")
    
    def verify_index(self):
        """Verify index stats"""
        print("\nVerifying index...")
        stats = self.index.describe_index_stats()
        print(f"Index stats: {json.dumps(stats, indent=2)}")
    
    def run_test_query(self, query: str, namespace: str = "interactions"):
        """Run a test query"""
        print(f"\nTest query: '{query}' in namespace '{namespace}'")
        
        # Generate query embedding
        query_embedding = self.generate_embedding(query)
        
        # Search
        results = self.index.query(
            vector=query_embedding,
            namespace=namespace,
            top_k=5,
            include_metadata=True
        )
        
        print(f"Found {len(results['matches'])} results:")
        for i, match in enumerate(results['matches']):
            print(f"\n  {i+1}. Score: {match['score']:.3f}")
            print(f"     ID: {match['id']}")
            for key, value in match['metadata'].items():
                if key not in ['tags']:  # Skip long fields
                    print(f"     {key}: {value}")
    
    def build_full_index(self):
        """Build complete index"""
        print("=" * 60)
        print("JENNY AI PINECONE INDEX BUILDER")
        print("=" * 60)
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        # Create index
        self.create_index()
        
        # Index data
        self.index_jtbd_records()
        self.index_interaction_records()
        
        # Verify
        self.verify_index()
        
        # Test queries
        print("\n--- Test Queries ---")
        self.run_test_query("SAT practice", "interactions")
        self.run_test_query("portfolio organization", "interactions")
        self.run_test_query("USC application", "jtbd")
        
        print("\n✅ Index build complete!")

def main():
    import sys
    
    # Get environment variables
    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not pinecone_api_key:
        print("Error: PINECONE_API_KEY environment variable not set")
        sys.exit(1)
    
    if not openai_api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        sys.exit(1)
    
    conn_string = sys.argv[1] if len(sys.argv) > 1 else None
    
    builder = PineconeIndexBuilder(pinecone_api_key, openai_api_key, conn_string)
    builder.build_full_index()

if __name__ == "__main__":
    main()