const { Pinecone } = require('@pinecone-database/pinecone');

async function createSnapshot() {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
  });
  
  const index = pc.index('jenny-huda-v1');
  
  // Get stats
  const stats = await index.describeIndexStats();
  
  // Sample some IDs
  const sampleQuery = await index.namespace('default').query({
    topK: 10,
    includeMetadata: true,
    vector: Array(1536).fill(0) // Dummy vector for sampling
  });
  
  const snapshot = {
    date: new Date().toISOString(),
    index: 'jenny-huda-v1',
    namespace: 'default',
    totalVectors: stats.totalRecordCount || 0,
    dimension: stats.dimension || 1536,
    sampleIds: sampleQuery.matches?.map(m => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata
    })) || []
  };
  
  console.log(JSON.stringify(snapshot, null, 2));
}

createSnapshot().catch(console.error);