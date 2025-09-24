import * as fs from "node:fs";
import * as path from "node:path";
import * as fg from "fast-glob";
import fetch from "node-fetch";

const API = process.env.AGENT_API || "http://localhost:4000";

interface ECTarget {
  id: string;
  name: string;
  narrative_tag?: string[];
}

interface AwardTarget {
  id: string;
  name: string;
}

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

// Convert name to snake_case ID
function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
}

function parseGamePlanTargets(doc: any) {
  const targets = {
    ecs: [] as ECTarget[],
    awards: [] as AwardTarget[],
    style: null as string | null,
    capacity_hours_week: null as number | null,
  };

  // Look for EC targets in various formats
  if (doc.text) {
    const text = doc.text.toLowerCase();
    
    // Extract EC targets (looking for numbered lists or specific mentions)
    const ecPatterns = [
      /ec\s*targets?[:\s]*([\s\S]*?)(?:award|$)/i,
      /extracurricular[s\s]*:[:\s]*([\s\S]*?)(?:award|$)/i,
      /top\s*\d+\s*ec[s\s]*:[:\s]*([\s\S]*?)(?:award|$)/i
    ];
    
    // Common EC names from Huda's profile
    const knownECs = [
      { name: "Empowering AI", id: "ec_empowering_ai", tags: ["AI-ethics", "girls-in-tech"] },
      { name: "Synthoria", id: "ec_synthoria", tags: ["game", "AI-ethics"] },
      { name: "Synthoria Game", id: "ec_synthoria", tags: ["game", "AI-ethics"] },
      { name: "Folklift", id: "ec_folklift", tags: ["leadership", "service"] },
      { name: "Yuvamanthan", id: "ec_yuvamanthan", tags: ["leadership"] },
      { name: "Coding Club", id: "ec_coding_club", tags: ["tech"] },
      { name: "Chess", id: "ec_chess", tags: ["competition"] },
      { name: "Math Circle", id: "ec_math_circle", tags: ["academic"] },
      { name: "Research", id: "ec_research", tags: ["academic"] },
      { name: "TEDx", id: "ec_tedx", tags: ["leadership", "speaking"] },
      { name: "Yearbook", id: "ec_yearbook", tags: ["creative"] }
    ];

    // Find mentioned ECs
    for (const ec of knownECs) {
      if (text.includes(ec.name.toLowerCase())) {
        targets.ecs.push({
          id: ec.id,
          name: ec.name,
          narrative_tag: ec.tags
        });
      }
    }

    // Award targets
    const knownAwards = [
      { name: "NCWIT Aspirations National", id: "award_ncwit" },
      { name: "STS", id: "award_sts" },
      { name: "Congressional App Challenge", id: "award_congressional_app" },
      { name: "Diamond Challenge", id: "award_diamond" },
      { name: "MIT THINK", id: "award_mit_think" }
    ];

    for (const award of knownAwards) {
      if (text.includes(award.name.toLowerCase()) || text.includes(award.id.replace('award_', ''))) {
        targets.awards.push({
          id: award.id,
          name: award.name
        });
      }
    }

    // Extract style and capacity
    if (text.includes("shy") || text.includes("async")) {
      targets.style = "shy_async";
    } else if (text.includes("outgoing") || text.includes("live")) {
      targets.style = "outgoing_live";
    }

    // Look for capacity hours
    const hoursMatch = text.match(/(\d+)\s*hours?\s*(?:per\s*)?week/);
    if (hoursMatch) {
      targets.capacity_hours_week = parseInt(hoursMatch[1]);
    }
  }

  // Ensure we have at least some targets
  if (targets.ecs.length === 0) {
    // Default top ECs if none found
    targets.ecs = [
      { id: "ec_empowering_ai", name: "Empowering AI", narrative_tag: ["AI-ethics", "girls-in-tech"] },
      { id: "ec_synthoria", name: "Synthoria Game", narrative_tag: ["game", "AI-ethics"] },
      { id: "ec_folklift", name: "Folklift", narrative_tag: ["leadership", "service"] }
    ];
  }

  if (targets.awards.length === 0) {
    // Default award targets
    targets.awards = [
      { id: "award_ncwit", name: "NCWIT Aspirations National" },
      { id: "award_sts", name: "STS" }
    ];
  }

  return targets;
}

export async function run(inputDir: string, studentId = "huda") {
  // Find all gameplan files
  const files = await fg.sync("**/*.json", { 
    cwd: inputDir, 
    absolute: true,
    ignore: ["**/node_modules/**"]
  });

  const gamePlanFiles = files.filter(f => 
    f.toLowerCase().includes("gameplan") || 
    f.includes("01-Intelligence") ||
    f.includes("01-Raw")
  );

  console.log(`[emit_gameplan_targets] Found ${gamePlanFiles.length} GamePlan files`);

  let emittedTargets = false;
  let emittedTraits = false;

  for (const file of gamePlanFiles) {
    try {
      const doc = JSON.parse(fs.readFileSync(file, "utf8"));
      const targets = parseGamePlanTargets(doc);

      // Emit GAMEPLAN/TARGETS_SET once
      if (!emittedTargets && (targets.ecs.length > 0 || targets.awards.length > 0)) {
        const observation = {
          studentId,
          kind: "GAMEPLAN",
          subtype: "TARGETS_SET",
          value: {
            ecs: targets.ecs.slice(0, 10), // Top 10
            awards: targets.awards.slice(0, 5) // Top 5
          },
          source: path.basename(file),
          at: doc.date || "2023-06-01" // Early in the process
        };
        await emit(observation);
        console.log(`[emit_gameplan_targets] Emitted targets: ${targets.ecs.length} ECs, ${targets.awards.length} awards`);
        emittedTargets = true;
      }

      // Emit TRAIT/SET if found
      if (!emittedTraits && (targets.style || targets.capacity_hours_week)) {
        const traits: any = {};
        if (targets.style) traits.style = targets.style;
        if (targets.capacity_hours_week) traits.capacity_hours_week = targets.capacity_hours_week;

        const observation = {
          studentId,
          kind: "TRAIT",
          subtype: "SET",
          value: traits,
          source: path.basename(file),
          at: doc.date || "2023-06-01"
        };
        await emit(observation);
        console.log(`[emit_gameplan_targets] Emitted traits:`, traits);
        emittedTraits = true;
      }

      // Look for early SAT/GPA if present
      if (doc.text && doc.text.match(/sat[:\s]+(\d{3,4})/i)) {
        const satMatch = doc.text.match(/sat[:\s]+(\d{3,4})/i);
        if (satMatch) {
          const score = parseInt(satMatch[1]);
          if (score > 400 && score <= 1600) {
            const observation = {
              studentId,
              kind: "SAT",
              subtype: null,
              value: { score, label: "baseline" },
              source: path.basename(file),
              at: doc.date || "2023-06-01"
            };
            await emit(observation);
            console.log(`[emit_gameplan_targets] Emitted baseline SAT: ${score}`);
          }
        }
      }

    } catch (e: any) {
      console.warn(`[emit_gameplan_targets] Error processing ${path.basename(file)}: ${e.message}`);
    }
  }

  console.log(`[emit_gameplan_targets] Complete`);
}

// CLI
if (require.main === module) {
  const dir = process.argv[2];
  const sid = process.argv[3] || "huda";
  if (!dir) {
    console.error("Usage: ts-node emit_gameplan_targets.ts <canonical-dir> [studentId]");
    console.error("Example: ts-node emit_gameplan_targets.ts data/canonical/jenny-huda/01-* huda");
    process.exit(1);
  }
  run(dir, sid).catch(e => { console.error(e); process.exit(1); });
}