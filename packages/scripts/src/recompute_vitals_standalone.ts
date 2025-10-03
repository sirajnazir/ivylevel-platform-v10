#!/usr/bin/env ts-node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Inline the reducer logic
function applyObservationToVitals(v: any, o: any): any {
  const out = JSON.parse(JSON.stringify(v || {}));

  switch (o.kind) {
    case "SAT": {
      let score: number | null = null;
      
      // Handle different value formats
      if (typeof o.value === 'number') {
        score = o.value;
      } else if (typeof o.value === 'string' && /^\d+$/.test(o.value)) {
        score = parseInt(o.value);
      } else if (o.value?.value) {
        score = parseInt(o.value.value);
      } else if (o.value?.score) {
        score = o.value.score;
      }
      
      if (score && score >= 400 && score <= 1600) { // Valid SAT score range
        const note = o.value?.note || "";
        const date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
        out.academics ??= {};
        out.academics.sat ??= { current: null, superscore: null, timeline: [] };
        
        // Check if this date/score already exists
        const exists = out.academics.sat.timeline.some((t: any) => 
          t.date === date && t.score === score
        );
        
        if (!exists) {
          out.academics.sat.timeline.push({ date, score, note });
          out.academics.sat.timeline.sort((a: any, b: any) => a.date.localeCompare(b.date));
          const latest = out.academics.sat.timeline[out.academics.sat.timeline.length - 1];
          out.academics.sat.current = latest?.score ?? out.academics.sat.current;
          out.academics.sat.superscore = Math.max(...out.academics.sat.timeline.map((t: any) => t.score || 0));
        }
      }
      break;
    }
    
    case "AWARD": {
      out.awards ??= {};
      
      // Handle final awards list
      if (o.subtype === "AWARD.final" || o.subtype === "final") {
        out.awards.final = o.value;
      } else if (o.subtype === "targets") {
        out.awards.targets = o.value;
      } else {
        const key = (o.subtype || "award").split(".")[0];
        out.awards[key] ??= {};
        
        // Award status precedence: WIN > FINALIST > NOMINATED > APPLIED > PLANNED
        const AWARD_RANK: Record<string, number> = {
          WIN: 5,
          FINALIST: 4,
          NOMINATED: 3,
          APPLIED: 2,
          PLANNED: 1,
          UNKNOWN: 0
        };
        
        const currentStatus = out.awards[key].status || "UNKNOWN";
        const newStatus = o.value?.status || "UNKNOWN";
        
        if (AWARD_RANK[newStatus] >= AWARD_RANK[currentStatus]) {
          out.awards[key].status = newStatus;
          out.awards[key].date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
          if (o.value?.details) out.awards[key].details = o.value.details;
        }
      }
      break;
    }
    
    case "ACTIVITY": {
      out.activities ??= {};
      
      // Handle final ECs list
      if (o.subtype === "ACTIVITY.final" || o.subtype === "final") {
        out.activities.final = o.value;
      } else {
        const key = (o.subtype || "activity").split(".")[0];
        out.activities[key] ??= {};
        out.activities[key].timeline ??= [];
        const date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
        out.activities[key].timeline.push({ date, ...o.value });
      }
      break;
    }
    
    case "APPS": {
      out.apps ??= {};
      
      if (o.subtype === "APPS.stats") {
        // Overall admission statistics
        out.apps.stats = o.value;
      } else if (o.subtype?.startsWith("APPS.decision.")) {
        // Individual college decisions
        out.apps.decisions ??= {};
        const schoolKey = o.subtype.replace("APPS.decision.", "");
        out.apps.decisions[schoolKey] = o.value;
        
        // Also update the collegeList for backward compatibility
        out.apps.collegeList ??= [];
        const existingIndex = out.apps.collegeList.findIndex((c: any) => 
          c.name?.toLowerCase() === o.value.school?.toLowerCase()
        );
        
        const collegeEntry = {
          name: o.value.school,
          status: o.value.status,
          program: o.value.program,
          location: o.value.location,
          acceptance_rate: o.value.acceptance_rate
        };
        
        if (existingIndex >= 0) {
          out.apps.collegeList[existingIndex] = collegeEntry;
        } else {
          out.apps.collegeList.push(collegeEntry);
        }
      }
      break;
    }
    
    case "GPA": {
      out.academics ??= {};
      out.academics.gpa ??= { weighted: null, unweighted: null, trend: null };
      if (o.value?.weighted != null) out.academics.gpa.weighted = o.value.weighted;
      if (o.value?.unweighted != null) out.academics.gpa.unweighted = o.value.unweighted;
      if (o.value?.trend != null) out.academics.gpa.trend = o.value.trend;
      break;
    }
    
    default:
      // Store other kinds as-is
      if (!out.other) out.other = {};
      if (!out.other[o.kind]) out.other[o.kind] = [];
      out.other[o.kind].push({
        subtype: o.subtype,
        value: o.value,
        date: typeof o.at === 'string' ? o.at : o.at?.toISOString?.()
      });
      break;
  }
  
  return out;
}

async function recomputeVitals(studentId: string) {
  const result = await pool.query(
    'SELECT * FROM observations WHERE student_id = $1 ORDER BY at ASC',
    [studentId]
  );
  
  const observations = result.rows.map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    kind: row.kind,
    subtype: row.subtype,
    value: row.value,
    source: row.source,
    at: row.at,
    createdAt: row.created_at
  }));
  
  console.log(`Processing ${observations.length} observations for ${studentId}`);
  
  let v: any = {};
  for (const o of observations) {
    v = applyObservationToVitals(v, o);
  }
  
  await pool.query(
    `INSERT INTO student_state (student_id, vitals, updated_at) 
     VALUES ($1, $2, NOW()) 
     ON CONFLICT (student_id) 
     DO UPDATE SET vitals = $2, updated_at = NOW()`,
    [studentId, JSON.stringify(v)]
  );
  
  return v;
}

async function main() {
  console.log('Starting vitals recomputation...');
  
  try {
    const vitals = await recomputeVitals('huda-2025');
    
    console.log('\n=== Computed Vitals ===');
    console.log(JSON.stringify(vitals, null, 2));
    
    // Verify key facts
    console.log('\n=== Key Facts ===');
    console.log(`SAT Score: ${vitals.academics?.sat?.current || 'Not found'}`);
    console.log(`SAT Superscore: ${vitals.academics?.sat?.superscore || 'Not found'}`);
    console.log(`College Stats: ${JSON.stringify(vitals.apps?.stats || {})}`);
    console.log(`Total Awards: ${Object.keys(vitals.awards || {}).length}`);
    console.log(`Total Activities: ${Object.keys(vitals.activities || {}).length}`);
    
    // Check for specific SAT observations
    const satObs = await pool.query(
      "SELECT * FROM observations WHERE student_id = $1 AND kind = 'SAT' ORDER BY at DESC LIMIT 5",
      ['huda-2025']
    );
    
    console.log('\n=== SAT Observations ===');
    for (const row of satObs.rows) {
      console.log(`${row.at}: ${JSON.stringify(row.value)}`);
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}