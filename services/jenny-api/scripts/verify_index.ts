import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const INDEX = process.env.PINECONE_INDEX || 'jenny-v3-3072-20250930';

async function main() {
  console.log(`\nVerifying index: ${INDEX}`);
  const index = pc.index(INDEX);
  
  const jtbdStats = await index.namespace('jtbd').describeIndexStats();
  const interStats = await index.namespace('interactions').describeIndexStats();
  
  console.log('\nIndex stats:');
  console.log(`  JTBD namespace: ${jtbdStats.recordCount || 0} vectors`);
  console.log(`  Interactions namespace: ${interStats.recordCount || 0} vectors`);
  console.log(`  Total: ${(jtbdStats.recordCount || 0) + (interStats.recordCount || 0)} vectors`);
  
  if ((jtbdStats.recordCount || 0) > 0 && (interStats.recordCount || 0) > 0) {
    console.log('\n✅ Migration appears successful!');
  } else {
    console.log('\n⚠️  Migration may be incomplete');
  }
}

main();