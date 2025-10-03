#!/usr/bin/env ts-node

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createHash } = require('crypto');

interface FactRow {
  fact_id: string;
  jtbd_id: string;
  student_id: string;
  domain: string;
  name: string;
  value: string;
  unit: string;
  effective_date: string;
  confidence: string;
  source_ref: string;
  provenance_note: string;
  created_ts: string;
}

interface Observation {
  id: string;
  student_id: string;
  kind: string;
  subtype: string;
  value: any;
  source: string;
  at: string;
  created_at?: string;
}

// Map domain to kind
function domainToKind(domain: string): string {
  if (!domain) return 'UNKNOWN';
  
  const mapping: Record<string, string> = {
    'sat': 'SAT',
    'gpa': 'GPA',
    'award': 'AWARD',
    'ec': 'ACTIVITY',
    'summer': 'SUMMER',
    'essay': 'ESSAY',
    'app': 'APP',
    'college': 'APPS',
    'wellness': 'WELLNESS',
    'keyword': 'TRAIT',
    'signal': 'TRAIT',
    'activity': 'ACTIVITY',
    'activities': 'ACTIVITY',
    'awards': 'AWARD',
    'honors': 'AWARD'
  };
  return mapping[domain.toLowerCase()] || domain.toUpperCase();
}

// Generate deterministic ID for idempotency
function generateObservationId(obs: Partial<Observation>): string {
  const parts = [
    obs.kind || '',
    obs.subtype || '',
    obs.student_id || '',
    obs.at || '',
    obs.source || '',
    JSON.stringify(obs.value || {})
  ];
  return createHash('sha1').update(parts.join('|')).digest('hex');
}

async function loadFactsCSV(csvPath: string): Promise<FactRow[]> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true
  });
}

async function loadJSONL(jsonlPath: string): Promise<any[]> {
  const content = fs.readFileSync(jsonlPath, 'utf-8');
  return content.trim().split('\n').map(line => JSON.parse(line));
}

async function processFactsToObservations(facts: FactRow[]): Promise<Observation[]> {
  const observations: Observation[] = [];
  
  for (const fact of facts) {
    const kind = domainToKind(fact.domain);
    const subtype = fact.domain === fact.name ? undefined : `${fact.domain}.${fact.name}`;
    
    const obs: Partial<Observation> = {
      student_id: fact.student_id,
      kind,
      subtype,
      value: {
        value: fact.value,
        unit: fact.unit || undefined,
        confidence: fact.confidence,
        jtbd_id: fact.jtbd_id,
        provenance: fact.provenance_note
      },
      source: fact.source_ref,
      at: fact.effective_date || fact.created_ts
    };
    
    obs.id = generateObservationId(obs);
    observations.push(obs as Observation);
  }
  
  return observations;
}

async function processCollegeDecisions(jsonlPath: string): Promise<Observation[]> {
  const decisions = await loadJSONL(jsonlPath);
  const observations: Observation[] = [];
  
  for (const decision of decisions) {
    if (decision.outcomes) {
      // Add overall stats
      const statsObs: Partial<Observation> = {
        student_id: decision.student_id,
        kind: 'APPS',
        subtype: 'APPS.stats',
        value: {
          accepted_count: decision.facts?.accepted_count || 0,
          waitlisted_count: decision.facts?.waitlisted_count || 0,
          rejected_count: decision.facts?.rejected_count || 0,
          total_schools: decision.facts?.schools?.length || 0
        },
        source: decision.source_path || 'College Admissions Results',
        at: '2025-03-31' // End of decision season
      };
      statsObs.id = generateObservationId(statsObs);
      observations.push(statsObs as Observation);
      
      // Add individual school decisions
      for (const school of (decision.facts?.schools || [])) {
        const schoolObs: Partial<Observation> = {
          student_id: decision.student_id,
          kind: 'APPS',
          subtype: `APPS.decision.${school.name.toLowerCase().replace(/\s+/g, '_')}`,
          value: {
            school: school.name,
            status: school.status,
            program: school.program || school.focus,
            location: school.location,
            acceptance_rate: school.acceptance_rate
          },
          source: decision.source_path || 'College Admissions Results',
          at: '2025-03-31'
        };
        schoolObs.id = generateObservationId(schoolObs);
        observations.push(schoolObs as Observation);
      }
    }
  }
  
  return observations;
}

async function processFinalECs(jsonlPath: string): Promise<Observation[]> {
  const ecs = await loadJSONL(jsonlPath);
  const observations: Observation[] = [];
  
  for (const entry of ecs) {
    if (entry.content?.facts) {
      const ecsObs: Partial<Observation> = {
        student_id: entry.student_id,
        kind: 'ACTIVITY',
        subtype: 'ACTIVITY.final',
        value: entry.content.facts,
        source: entry.source_path || 'Final ECs',
        at: '2024-12-15' // App submission time
      };
      ecsObs.id = generateObservationId(ecsObs);
      observations.push(ecsObs as Observation);
    }
  }
  
  return observations;
}

async function processFinalHonors(jsonlPath: string): Promise<Observation[]> {
  const honors = await loadJSONL(jsonlPath);
  const observations: Observation[] = [];
  
  for (const entry of honors) {
    if (entry.content?.facts) {
      const honorsObs: Partial<Observation> = {
        student_id: entry.student_id,
        kind: 'AWARD',
        subtype: 'AWARD.final',
        value: entry.content.facts,
        source: entry.source_path || 'Final Honors',
        at: '2024-12-15'
      };
      honorsObs.id = generateObservationId(honorsObs);
      observations.push(honorsObs as Observation);
    }
  }
  
  return observations;
}

async function insertObservations(observations: Observation[]) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    for (const obs of observations) {
      try {
        await pool.query(`
          INSERT INTO observations (id, student_id, kind, subtype, value, source, at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [obs.id, obs.student_id, obs.kind, obs.subtype, JSON.stringify(obs.value), obs.source, obs.at]);
      } catch (e) {
        console.error('Failed to insert observation:', obs.id, e);
      }
    }
  } finally {
    await pool.end();
  }
}

async function populateCanonRegistry() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  const canonEntries = [
    {
      key: 'APP_FINAL_AWARDS',
      student_id: 'huda-2025',
      source_type: 'APP-DOC',
      source_title: 'Final Honors & Awards',
      date_range: '2024-12-15',
      jtbd_id: 'JTBD_Final_Honors_huda-2025'
    },
    {
      key: 'APP_FINAL_ECS',
      student_id: 'huda-2025',
      source_type: 'APP-DOC',
      source_title: 'Final ECs',
      date_range: '2024-12-15',
      jtbd_id: 'JTBD_Final_ECs_huda-2025'
    },
    {
      key: 'COLLEGE_DECISIONS',
      student_id: 'huda-2025',
      source_type: 'APP-DOC',
      source_title: 'College Admissions Results',
      date_range: '2025-03-31',
      jtbd_id: 'JTBD_Admissions_CollegeList'
    },
    {
      key: 'GAMEPLAN',
      student_id: 'huda-2025',
      source_type: 'GAMEPLAN',
      source_title: 'Master GamePlan',
      date_range: '2024-2025',
      jtbd_id: 'JTBD_Huda_GamePlan_v2'
    }
  ];
  
  try {
    for (const entry of canonEntries) {
      await pool.query(`
        INSERT INTO canon (key, student_id, source_type, source_title, date_range, jtbd_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (key) DO UPDATE SET
          source_title = EXCLUDED.source_title,
          date_range = EXCLUDED.date_range,
          updated_at = NOW()
      `, [entry.key, entry.student_id, entry.source_type, entry.source_title, entry.date_range, entry.jtbd_id]);
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  const kbasePath = '/Users/snazir/ivylevel-platform-v10/data/kbase';
  
  console.log('Starting ETL from kbase...');
  
  // Process Facts.csv
  console.log('Processing Facts.csv...');
  const facts = await loadFactsCSV(path.join(kbasePath, '00-MasterProgramLogs/Program_Master_Log_Jenny_Huda - Facts.csv'));
  const factObservations = await processFactsToObservations(facts);
  console.log(`Generated ${factObservations.length} observations from facts`);
  
  // Process college decisions
  console.log('Processing college decisions...');
  const collegeObservations = await processCollegeDecisions(
    path.join(kbasePath, '03-Final College Apps/JTBD_Admissions_CollegeList.jsonl')
  );
  console.log(`Generated ${collegeObservations.length} observations from college decisions`);
  
  // Process final ECs
  console.log('Processing final ECs...');
  const ecObservations = await processFinalECs(
    path.join(kbasePath, '03-Final College Apps/JTBD_Final_ECs_huda-2025.jsonl')
  );
  console.log(`Generated ${ecObservations.length} observations from ECs`);
  
  // Process final honors
  console.log('Processing final honors...');
  const honorObservations = await processFinalHonors(
    path.join(kbasePath, '03-Final College Apps/JTBD_Final_Honors_huda-2025.jsonl')
  );
  console.log(`Generated ${honorObservations.length} observations from honors`);
  
  // Combine all observations
  const allObservations = [
    ...factObservations,
    ...collegeObservations,
    ...ecObservations,
    ...honorObservations
  ];
  
  console.log(`Total observations to insert: ${allObservations.length}`);
  
  // Insert into database
  console.log('Inserting observations into database...');
  await insertObservations(allObservations);
  
  // Populate canon registry
  console.log('Populating canon registry...');
  await populateCanonRegistry();
  
  console.log('ETL complete!');
}

if (require.main === module) {
  main().catch(console.error);
}