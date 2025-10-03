const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

async function test() {
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const index = client.index('jenny-v2');
  
  // Get embedding for query
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'SAT score 1530',
  });
  
  const queryVector = embeddingResponse.data[0].embedding;
  
  // Query each namespace
  const namespaces = ['transcript', 'appdoc', 'gameplan', 'exec'];
  
  for (const ns of namespaces) {
    console.log(`\nQuerying namespace: ${ns}`);
    try {
      const results = await index.namespace(ns).query({
        vector: queryVector,
        topK: 3,
        includeMetadata: true,
      });
      
      if (results.matches && results.matches.length > 0) {
        console.log(`Found ${results.matches.length} results:`);
        results.matches.forEach((match, i) => {
          console.log(`  ${i+1}. Score: ${match.score.toFixed(3)}`);
          console.log(`     Text: ${match.metadata?.text?.substring(0, 100)}...`);
          console.log(`     Week: ${match.metadata?.week}, Kind: ${match.metadata?.kind}`);
        });
      } else {
        console.log('  No results found');
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }
}

test().catch(console.error);