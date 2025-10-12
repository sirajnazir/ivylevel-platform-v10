#!/usr/bin/env node

const fs = require('fs');

const prompts = JSON.parse(fs.readFileSync('./tools/qa/golden_prompts.json','utf8'));
const ENDPOINT = 'http://localhost:8787/api/kb-chat';

const WARMTH = /(i'?m with you|i hear you|it'?s ok|that makes sense|we can move forward|let'?s solve this together)/i;
const ACTION = /\b(\d{1,2})\s?(min|minutes|hrs?|hours?)\b|Mon|Tue|Wed|Thu|Fri|Sat|Sun|\d{1,2}(am|pm)|next\s+step/i;
const PROOFN = /\b(\d{2,4})(\/|-|\.)\d{1,2}(\/|-|\.)\d{1,2}\b|\b20\d{2}\b/; // crude date
const SOURCE = /(SRC-|source:|as of|table:|view:|chip_table|internal data)/i;

function score(text, isFact){
  const s = {
    warmth: +WARMTH.test(text),
    action: +ACTION.test(text),
    clarity: +(text.split(/\s+/).length <= 180 && (!isFact || /\n-\s/.test(text) || text.includes("•") || text.includes("As of")))
  };
  if(isFact) s.proof = +(PROOFN.test(text) && SOURCE.test(text));
  return s;
}

async function call(msg, sessionSuffix){
  const res = await fetch(ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      userMessage: msg,
      studentId: "huda-2025",
      sessionId: `eval-${sessionSuffix}`,
      topK: 3
    })
  });
  const j = await res.json();
  return {
    text: j.answer || j.text || JSON.stringify(j),
    meta: j.debug || {},
    modelBadge: j.debug?.modelBadge || 'unknown'
  };
}

(async ()=>{
  let rows = [];
  console.log("\n🔬 Running Adapter vs Base Quality Comparison...\n");

  for(const p of prompts){
    process.stdout.write(`Testing: ${p.id}... `);

    // Call with different session IDs to trigger different cohort hashes
    const resp1 = await call(p.msg, `${p.id}-s1`);
    const resp2 = await call(p.msg, `${p.id}-s2`);

    // Determine which is adapter/base based on badge
    let adp, base;
    if (resp1.modelBadge?.includes('Adapter')) {
      adp = resp1;
      base = resp2;
    } else if (resp2.modelBadge?.includes('Adapter')) {
      adp = resp2;
      base = resp1;
    } else {
      // Both base, run one more time
      const resp3 = await call(p.msg, `${p.id}-s3`);
      if (resp3.modelBadge?.includes('Adapter')) {
        adp = resp3;
        base = resp1;
      } else {
        // No adapter hit, use first as base
        base = resp1;
        adp = { text: '(no adapter response)', modelBadge: 'none', meta: {} };
      }
    }

    const isFact = /awards|GPA|SAT/i.test(p.msg);
    const sBase = score(base.text, isFact);
    const sAdp  = score(adp.text,  isFact);

    rows.push({
      id: p.id,
      base: sBase,
      adp: sAdp,
      baseText: base.text.slice(0, 300),
      adpText: adp.text.slice(0, 300),
      baseBadge: base.modelBadge,
      adpBadge: adp.modelBadge
    });

    console.log(`✓ (base: ${base.modelBadge?.slice(0, 10)}, adp: ${adp.modelBadge?.slice(0, 10)})`);
  }

  const sum = k => rows.reduce((a,r)=>a+(r.adp[k]||0),0);
  const sumB= k => rows.reduce((a,r)=>a+(r.base[k]||0),0);

  console.log("\n=== Adapter vs Base (quick quality) ===");
  console.log(`Warmth  Adapter: ${sum('warmth')}/${rows.length}  Base: ${sumB('warmth')}/${rows.length}`);
  console.log(`Action  Adapter: ${sum('action')}/${rows.length}  Base: ${sumB('action')}/${rows.length}`);
  console.log(`Clarity Adapter: ${sum('clarity')}/${rows.length}  Base: ${sumB('clarity')}/${rows.length}`);
  console.log(`Proof   Adapter: ${sum('proof')}/${rows.filter(r => r.id.includes('fact')).length}  Base: ${sumB('proof')}/${rows.filter(r => r.id.includes('fact')).length}`);

  console.log("\n📊 Detailed Results:");
  rows.forEach(r => {
    console.log(`\n${r.id}:`);
    console.log(`  Base (${r.baseBadge}):    warmth=${r.base.warmth} action=${r.base.action} clarity=${r.base.clarity}${r.base.proof !== undefined ? ' proof='+r.base.proof : ''}`);
    console.log(`  Adapter (${r.adpBadge}): warmth=${r.adp.warmth} action=${r.adp.action} clarity=${r.adp.clarity}${r.adp.proof !== undefined ? ' proof='+r.adp.proof : ''}`);
  });

  fs.writeFileSync('V8.0_FAST_QUALITY_REPORT.json', JSON.stringify(rows, null, 2));
  console.log("\n✅ Full report saved to: V8.0_FAST_QUALITY_REPORT.json\n");
})();
