import fs from "node:fs";
import fetch from "node-fetch";

const RAG_JSONL = process.env.RAG_JSONL || "./jenny_master_corpus.jsonl";
const UPSERT_URL = process.env.RETRIEVER_UPSERT_URL || "http://localhost:4102/upsert";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "1000");

function* readJsonl(path:string) {
  const lines = fs.readFileSync(path, "utf-8").split(/\r?\n/).filter(Boolean);
  for (const ln of lines) yield JSON.parse(ln);
}

(async () => {
  const allRecords:any[] = [];
  
  // Read all records first
  for (const rec of readJsonl(RAG_JSONL)) {
    allRecords.push(rec);
  }
  
  console.log(`Total records to upsert: ${allRecords.length}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Total batches: ${Math.ceil(allRecords.length/BATCH_SIZE)}`);
  
  let successCount = 0;
  
  // Send in batches
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i/BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allRecords.length/BATCH_SIZE);
    const payload = { records: batch };
    
    console.log(`\nUploading batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
    
    try {
      const r = await fetch(UPSERT_URL, { 
        method:"POST", 
        headers:{ "content-type":"application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (r.status !== 200) {
        const text = await r.text();
        console.error(`Batch ${batchNum} failed with status ${r.status}: ${text}`);
      } else {
        const out = await r.json();
        successCount += batch.length;
        console.log(`✓ Batch ${batchNum} completed: ${(out as any).count || batch.length} records`);
      }
    } catch (e: any) {
      console.error(`✗ Batch ${batchNum} failed:`, e.message || e);
      // Continue with next batch instead of exiting
    }
    
    // Small delay between batches to avoid overwhelming the service
    if (i + BATCH_SIZE < allRecords.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\nUpsert completed! Successfully uploaded ${successCount}/${allRecords.length} records`);
})().catch(e => { 
  console.error("Fatal error:", e); 
  process.exit(1); 
});