const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');
const path = require('path');

async function getPineconeStats() {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });

  const indexName = process.env.PINECONE_INDEX || 'jenny-v1';
  const namespace = process.env.PINECONE_NAMESPACE || 'jenny_v1';
  
  console.log('Fetching stats for:', { indexName, namespace });
  
  const index = pc.index(indexName);
  const ns = index.namespace(namespace);
  
  // Get index stats
  const stats = await index.describeIndexStats();
  
  const report = {
    timestamp: new Date().toISOString(),
    index: indexName,
    namespace: namespace,
    totalVectors: stats.totalRecordCount || 0,
    dimensions: stats.dimension,
    namespaces: stats.namespaces || {},
    summary: {
      totalVectors: 0,
      byKind: {},
      byPhase: {},
      byWeek: {}
    }
  };
  
  // If we have namespace-specific stats
  if (stats.namespaces && stats.namespaces[namespace]) {
    report.summary.totalVectors = stats.namespaces[namespace].recordCount;
  }
  
  // Save report
  const reportDir = 'reports';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 10);
  const filename = path.join(reportDir, `pinecone_stats_${timestamp}.json`);
  
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  
  console.log('\n=== Pinecone Stats ===');
  console.log(`Index: ${indexName}`);
  console.log(`Namespace: ${namespace}`);
  console.log(`Total Vectors: ${report.summary.totalVectors || report.totalVectors}`);
  console.log(`Dimensions: ${report.dimensions}`);
  console.log(`\nReport saved to: ${filename}`);
  
  return report;
}

getPineconeStats().catch(console.error);