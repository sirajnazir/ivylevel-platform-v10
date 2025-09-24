import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const CANON_DIR = process.env.CANON_DIR || "data/processed/jenny-huda";
const API = process.env.API || "http://localhost:4000";

type Canon = { 
  name: string; 
  path: string; 
  kind: string; 
  text?: string; 
  turns?: any[]; 
  meta?: any 
};

function* satFromText(doc: Canon) {
  const sat = /(^|\s)(1[0-5][0-9]0)\b/g;
  const date = doc.meta?.date || doc.meta?.at || null;
  const seen = new Set<string>();
  let m;
  while ((m = sat.exec(doc.text || ""))) {
    const score = Number(m[2]);
    if (score >= 1200 && score <= 1600) {
      const key = `${date}-${score}`;
      if (!seen.has(key)) {
        seen.add(key);
        yield { score, note: "observed", at: date };
      }
    }
  }
}

async function postObserve(o: any) {
  try {
    const response = await fetch(`${API}/observe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId: "huda", ...o })
    });
    const result = await response.json();
    if (result.ok) {
      console.log(`✓ Created ${o.kind}${o.subtype ? '.' + o.subtype : ''} observation`);
    } else {
      console.error(`✗ Failed to create ${o.kind} observation:`, result);
    }
  } catch (error) {
    console.error(`✗ Error posting observation:`, error);
  }
}

async function main() {
  console.log("Starting Huda observations backfill...");
  console.log(`Reading from: ${CANON_DIR}`);
  console.log(`API endpoint: ${API}`);
  console.log();

  if (!fs.existsSync(CANON_DIR)) {
    console.error(`Directory not found: ${CANON_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(CANON_DIR, { withFileTypes: true });
  const stack = files.map(d => path.join(CANON_DIR, d.name));
  
  let observationCount = 0;

  while (stack.length) {
    const p = stack.pop()!;
    const st = fs.statSync(p);
    
    if (st.isDirectory()) {
      fs.readdirSync(p, { withFileTypes: true })
        .forEach(d => stack.push(path.join(p, d.name)));
      continue;
    }
    
    if (!p.endsWith(".json")) continue;
    
    let doc: Canon;
    try {
      doc = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (error) {
      console.warn(`Skipping invalid JSON: ${p}`);
      continue;
    }

    // SAT observations from text
    if (/TRANS-RAW|IMSG-RAW/.test(doc.kind || "")) {
      for (const s of satFromText(doc)) {
        await postObserve({
          kind: "SAT",
          subtype: "SAT.timeline",
          value: { score: s.score, note: s.note },
          source: doc.path || doc.name,
          at: s.at || undefined
        });
        observationCount++;
      }
    }

    const text = (doc.text || "").toLowerCase();

    // NCWIT win signal
    if (text.includes("ncwit") && text.includes("national")) {
      await postObserve({
        kind: "AWARD",
        subtype: "ncwit",
        value: { status: "WIN" },
        source: doc.path || doc.name,
        at: doc.meta?.date || undefined
      });
      observationCount++;
    }

    // Synthoria plays / students reached
    if (text.includes("synthoria")) {
      const playsMatch = text.match(/\b(\d{2,5})\s+plays\b/);
      const studentsMatch = text.match(/\b(\d{2,5})\s+students?\s+reached\b/);
      
      if (playsMatch) {
        await postObserve({
          kind: "ACTIVITY",
          subtype: "Synthoria.stats",
          value: { plays: Number(playsMatch[1]) },
          source: doc.path || doc.name,
          at: doc.meta?.date || undefined
        });
        observationCount++;
      }
      
      if (studentsMatch) {
        await postObserve({
          kind: "ACTIVITY",
          subtype: "Synthoria.stats",
          value: { studentsReached: Number(studentsMatch[1]) },
          source: doc.path || doc.name,
          at: doc.meta?.date || undefined
        });
        observationCount++;
      }
    }

    // Summer acceptances
    const summerPrograms = [];
    if (text.includes("jcamp")) summerPrograms.push("JCamp");
    if (text.includes("kode with klossy")) summerPrograms.push("Kode with Klossy");
    if (text.includes("girls who code")) summerPrograms.push("Girls Who Code SIP");
    if (text.includes("nyu precollege")) summerPrograms.push("NYU Precollege");
    
    if (summerPrograms.length) {
      await postObserve({
        kind: "SUMMER",
        subtype: "acceptances",
        value: { accepted: summerPrograms },
        source: doc.path || doc.name,
        at: doc.meta?.date || undefined
      });
      observationCount++;
    }
  }

  console.log();
  console.log(`Backfill complete. Created ${observationCount} observations.`);
  console.log("Run 'curl http://localhost:4000/students/huda/state | jq' to see updated vitals.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});