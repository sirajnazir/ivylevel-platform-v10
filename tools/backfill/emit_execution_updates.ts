import * as fs from "node:fs";
import * as path from "node:path";
import * as fg from "fast-glob";
import fetch from "node-fetch";

const API = process.env.AGENT_API || "http://localhost:4000";

async function emit(observation: any) {
  const r = await fetch(`${API}/observe`, {
    method: "POST", 
    headers: { "content-type": "application/json" },
    body: JSON.stringify(observation),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`POST /observe failed: ${r.status} ${txt}`);
  }
}

interface ECUpdate {
  id: string;
  impact_delta?: {
    students_reached?: number;
    cities?: number;
    classrooms?: number;
    plays?: number;
    teachers_adopted?: number;
    events?: number;
    applicants?: number;
    ads_in_production?: number;
  };
  status?: string;
  evidence?: any[];
}

interface AwardUpdate {
  id: string;
  status: "planned" | "applied" | "won" | "rejected";
  date?: string;
  evidence?: any[];
}

function parseWeekFromDoc(doc: any): number {
  // Try to extract week number from various sources
  if (doc.week) return parseInt(doc.week);
  
  const name = doc.name || "";
  const weekMatch = name.match(/W(\d{1,3})/);
  if (weekMatch) return parseInt(weekMatch[1]);
  
  const path = doc.path || "";
  const pathMatch = path.match(/W(\d{1,3})/);
  if (pathMatch) return parseInt(pathMatch[1]);
  
  return 0;
}

function parseExecutionUpdates(doc: any, week: number) {
  const updates = {
    ecs: [] as ECUpdate[],
    awards: [] as AwardUpdate[],
    sat: null as number | null,
    traits: {} as any
  };

  const text = (doc.text || "").toLowerCase();
  const turns = doc.turns || [];
  
  // Parse EC updates - look for impact numbers
  const ecPatterns = [
    // Empowering AI / Synthoria
    { 
      id: "ec_empowering_ai",
      patterns: [
        /synthoria.*?(\d+)\s*(plays?|students?)/i,
        /empowering\s*ai.*?(\d+)\s*(students?|cities|classrooms)/i,
        /reached?\s*(\d+)\s*students/i
      ]
    },
    {
      id: "ec_synthoria",
      patterns: [
        /synthoria.*?(\d+)\s*(plays?|downloads?)/i,
        /game.*?(\d+)\s*(plays?|users?)/i
      ]
    },
    // Folklift
    {
      id: "ec_folklift", 
      patterns: [
        /folklift.*?(\d+)\s*(applicants?|ads?|applications?)/i,
        /(\d+)\s*ads?\s*in\s*production/i
      ]
    }
  ];

  // Extract EC impact updates
  for (const ec of ecPatterns) {
    for (const pattern of ec.patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        const metric = match[2].toLowerCase();
        
        const update: ECUpdate = {
          id: ec.id,
          impact_delta: {}
        };
        
        // Map metric to field
        if (metric.includes("play")) update.impact_delta!.plays = value;
        else if (metric.includes("student")) update.impact_delta!.students_reached = value;
        else if (metric.includes("cit")) update.impact_delta!.cities = value;
        else if (metric.includes("classroom")) update.impact_delta!.classrooms = value;
        else if (metric.includes("teacher")) update.impact_delta!.teachers_adopted = value;
        else if (metric.includes("applicant")) update.impact_delta!.applicants = value;
        else if (metric.includes("ad")) update.impact_delta!.ads_in_production = value;
        
        // Add evidence reference
        update.evidence = [{
          source: "INTEL",
          week,
          quote: match[0]
        }];
        
        updates.ecs.push(update);
      }
    }
  }

  // Parse award updates
  const awardPatterns = [
    { id: "award_ncwit", name: "ncwit", statuses: ["submitted", "applied", "won", "national"] },
    { id: "award_sts", name: "sts", statuses: ["submitted", "applied", "semifinalist", "finalist"] },
    { id: "award_congressional_app", name: "congressional", statuses: ["submitted", "won"] },
    { id: "award_diamond", name: "diamond", statuses: ["submitted", "applied"] }
  ];

  for (const award of awardPatterns) {
    if (text.includes(award.name)) {
      let status: AwardUpdate["status"] = "planned";
      
      for (const s of award.statuses) {
        if (text.includes(s)) {
          if (s === "won" || s === "national" || s === "finalist") status = "won";
          else if (s === "submitted" || s === "applied") status = "applied";
          else if (s === "semifinalist") status = "applied"; // Still in process
        }
      }
      
      updates.awards.push({
        id: award.id,
        status,
        evidence: [{
          source: "EXEC",
          week,
          quote: `Week ${week} update`
        }]
      });
    }
  }

  // Look for SAT updates
  const satMatch = text.match(/sat[:\s]+(\d{3,4})/i);
  if (satMatch) {
    const score = parseInt(satMatch[1]);
    if (score > 400 && score <= 1600) {
      updates.sat = score;
    }
  }

  // Parse trait updates (capacity, preferences)
  const hoursMatch = text.match(/(\d+)\s*hours?\s*(?:per\s*)?week\s*(?:free|available)/i);
  if (hoursMatch) {
    updates.traits.capacity_hours_week = parseInt(hoursMatch[1]);
  }

  // Check for communication preferences
  if (text.includes("prefer") && (text.includes("dm") || text.includes("direct message"))) {
    updates.traits.tooling_pref = ["DM"];
  } else if (text.includes("prefer") && text.includes("email")) {
    updates.traits.tooling_pref = ["email"];
  }

  return updates;
}

export async function run(inputDir: string, studentId = "huda") {
  // Find all execution doc files
  const files = await fg.sync("**/*.json", {
    cwd: inputDir,
    absolute: true,
    ignore: ["**/node_modules/**"]
  });

  const execFiles = files.filter(f =>
    f.toLowerCase().includes("execution") ||
    f.includes("02-Intelligence") ||
    f.includes("02-Raw") ||
    f.match(/W\d{1,3}/)
  );

  console.log(`[emit_execution_updates] Found ${execFiles.length} execution files`);

  // Track what we've emitted to avoid duplicates
  const emittedECs = new Set<string>();
  const emittedAwards = new Set<string>();
  let satCount = 0;

  for (const file of execFiles) {
    try {
      const doc = JSON.parse(fs.readFileSync(file, "utf8"));
      const week = parseWeekFromDoc(doc);
      const updates = parseExecutionUpdates(doc, week);

      // Emit EC updates
      for (const ec of updates.ecs) {
        const key = `${ec.id}-${JSON.stringify(ec.impact_delta)}`;
        if (!emittedECs.has(key)) {
          const observation = {
            studentId,
            kind: "EC",
            subtype: "UPSERT",
            value: {
              id: ec.id,
              impact_delta: ec.impact_delta,
              evidence: ec.evidence,
              status: "active"
            },
            source: path.basename(file),
            at: doc.date || new Date().toISOString()
          };
          await emit(observation);
          emittedECs.add(key);
        }
      }

      // Emit award updates
      for (const award of updates.awards) {
        const key = `${award.id}-${award.status}`;
        if (!emittedAwards.has(key)) {
          const observation = {
            studentId,
            kind: "AWARD",
            subtype: "UPSERT",
            value: {
              id: award.id,
              status: award.status,
              evidence: award.evidence
            },
            source: path.basename(file),
            at: doc.date || new Date().toISOString()
          };
          await emit(observation);
          emittedAwards.add(key);
        }
      }

      // Emit SAT if found
      if (updates.sat) {
        const observation = {
          studentId,
          kind: "SAT",
          subtype: null,
          value: { 
            score: updates.sat,
            note: `Week ${week} update`
          },
          source: path.basename(file),
          at: doc.date || new Date().toISOString()
        };
        await emit(observation);
        satCount++;
      }

      // Emit trait updates
      if (Object.keys(updates.traits).length > 0) {
        const observation = {
          studentId,
          kind: "TRAIT",
          subtype: "SET",
          value: updates.traits,
          source: path.basename(file),
          at: doc.date || new Date().toISOString()
        };
        await emit(observation);
      }

    } catch (e: any) {
      console.warn(`[emit_execution_updates] Error processing ${path.basename(file)}: ${e.message}`);
    }
  }

  console.log(`[emit_execution_updates] Emitted: ${emittedECs.size} EC updates, ${emittedAwards.size} award updates, ${satCount} SAT scores`);
}

// CLI
if (require.main === module) {
  const dir = process.argv[2];
  const sid = process.argv[3] || "huda";
  if (!dir) {
    console.error("Usage: ts-node emit_execution_updates.ts <canonical-dir> [studentId]");
    console.error("Example: ts-node emit_execution_updates.ts data/canonical/jenny-huda/02-* huda");
    process.exit(1);
  }
  run(dir, sid).catch(e => { console.error(e); process.exit(1); });
}