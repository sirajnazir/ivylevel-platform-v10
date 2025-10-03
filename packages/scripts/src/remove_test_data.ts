import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env") });

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

async function removeTestData() {
  const indexName = process.env.PINECONE_INDEX || "jenny-v1";
  const namespace = process.env.PINECONE_NAMESPACE || "jenny_v1";
  
  console.log(`Connecting to index: ${indexName}, namespace: ${namespace}`);
  const index = pc.index(indexName);
  const ns = index.namespace(namespace);

  // Test document identifiers - these are the docs I created
  const testDocNames = [
    "Huda_Final_Awards_Summary.docx",
    "test_gameplan.jsonl",
    "reindex_gameplan_full.jsonl", 
    "reindex_gameplan_real.jsonl"
  ];

  const testIds = [
    "Huda_Final_Awards_List", // This was the ID I used for the test awards
  ];

  try {
    // First, let's query to find all test vectors
    console.log("\nSearching for test documents...");
    
    for (const docName of testDocNames) {
      console.log(`\nSearching for vectors with doc_name: ${docName}`);
      
      const queryResult = await ns.query({
        vector: new Array(1536).fill(0), // dummy vector
        topK: 100,
        includeMetadata: true,
        filter: {
          doc_name: docName
        }
      });

      if (queryResult.matches && queryResult.matches.length > 0) {
        const ids = queryResult.matches.map(m => m.id);
        console.log(`Found ${ids.length} vectors for ${docName}`);
        console.log("IDs:", ids);
        
        // Delete them
        console.log(`Deleting vectors...`);
        await ns.deleteMany(ids);
        console.log(`✓ Deleted ${ids.length} vectors for ${docName}`);
      } else {
        console.log(`No vectors found for ${docName}`);
      }
    }

    // Also try to delete by known IDs
    console.log("\nDeleting known test IDs...");
    for (const id of testIds) {
      try {
        await ns.deleteOne(id);
        console.log(`✓ Deleted vector with ID: ${id}`);
      } catch (e) {
        console.log(`Could not delete ID ${id} - might not exist`);
      }
    }

    // Search for any remaining test data patterns
    console.log("\nSearching for any remaining test data patterns...");
    
    // Search for test award patterns
    const testAwardText = "High Honor Roll (multiple years) 2. AP Scholar Award 3. National Merit Commended Scholar 4. Dean's List Recognition 5. Academic Excellence Certificate Community Awards (3 total): 1. Presidential Volunteer Service Award - Gold Level 2. Community Leadership Award 3. Youth Service Recognition";
    
    const queryResult = await ns.query({
      vector: new Array(1536).fill(0),
      topK: 100,
      includeMetadata: true,
      filter: {
        student: "huda"
      }
    });

    if (queryResult.matches) {
      for (const match of queryResult.matches) {
        // Check if this contains the test awards
        const text = match.metadata?.text || "";
        if (text.includes("High Honor Roll") && 
            text.includes("Youth Service Recognition") &&
            text.includes("Dean's List Recognition") &&
            text.includes("Academic Excellence Certificate")) {
          console.log(`Found test vector: ${match.id} - ${match.metadata?.doc_name}`);
          await ns.deleteOne(match.id);
          console.log(`✓ Deleted test vector: ${match.id}`);
        }
      }
    }

    console.log("\n✅ Test data removal complete!");
    console.log("\nNow the agent should return the real awards from production data.");

  } catch (error) {
    console.error("Error:", error);
  }
}

removeTestData().catch(console.error);