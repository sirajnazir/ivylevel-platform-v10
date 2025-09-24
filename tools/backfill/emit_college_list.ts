import * as fs from "fs";
import fetch from "node-fetch";

const API = process.env.API || "http://localhost:4000";
const DOCS = [
  "../../data/canonical/jenny-huda/09-Raw-ApplicationDocs/Huda - Common App - UNC College Application Final Submitted .json",
  "../../data/canonical/jenny-huda/09-Raw-ApplicationDocs/Huda-Final UC College Application Submitted.json"
];

function parseColleges(txt: string) {
  const out: { name: string; status?: string }[] = [];
  
  // Pattern 1: College — Status
  const re = /^\s*[-*•]?\s*([A-Za-z0-9&().,' -]+)\s*[–—-]\s*(Admitted|Accepted|Waitlisted|Rejected|Deferred|Pending)/gmi;
  let m;
  while ((m = re.exec(txt))) {
    out.push({ name: m[1].trim(), status: m[2] });
  }
  
  // Pattern 2: College (Status)
  const re2 = /^\s*[-*•]?\s*([A-Za-z0-9&().,' -]+)\s*\((Admitted|Accepted|Waitlisted|Rejected|Deferred|Pending)\)/gmi;
  while ((m = re2.exec(txt))) {
    out.push({ name: m[1].trim(), status: m[2] });
  }
  
  return out;
}

async function post(studentId: string, colleges: any[]) {
  try {
    const response = await fetch(`${API}/observe`, {
      method: "POST",
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        studentId, 
        kind: "APPS", 
        subtype: "collegeList", 
        value: { colleges }, 
        source: "apps-pdfs",
        at: new Date().toISOString()
      })
    });
    const result = await response.json();
    console.log((result as any).ok ? "✓ Posted college list" : "✗ Failed to post college list");
  } catch (error) {
    console.error("Error posting colleges:", error);
  }
}

async function main() {
  const all: any[] = [];
  
  for (const p of DOCS) {
    const fullPath = p.startsWith('/') ? p : `${process.cwd()}/${p}`;
    if (!fs.existsSync(fullPath)) {
      console.log(`Skipping missing file: ${p}`);
      continue;
    }
    
    try {
      const doc = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const colleges = parseColleges(doc.text || "");
      console.log(`Found ${colleges.length} colleges in ${p}`);
      all.push(...colleges);
    } catch (error) {
      console.warn(`Failed to parse ${p}:`, error);
    }
  }
  
  // De-duplicate by name, prefer most "final" status
  const order = ["Admitted", "Accepted", "Waitlisted", "Deferred", "Rejected", "Pending"];
  const byName = new Map<string, any>();
  
  for (const c of all) {
    const prev = byName.get(c.name);
    if (!prev || order.indexOf(c.status || "") < order.indexOf(prev.status || "Z")) {
      byName.set(c.name, c);
    }
  }
  
  const finalList = Array.from(byName.values());
  await post("huda", finalList);
  
  console.log(`\nEmitted ${finalList.length} colleges to observations:`);
  finalList.forEach(c => console.log(`  - ${c.name}: ${c.status || 'Unknown'}`));
}

main().catch(console.error);