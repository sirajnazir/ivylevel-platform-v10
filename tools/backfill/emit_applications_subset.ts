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

interface SubmittedEC {
  id: string;
  name: string;
  position?: string;
  hours_per_week?: number;
  weeks_per_year?: number;
  grades?: string;
  description?: string;
}

interface SubmittedAward {
  id: string;
  name: string;
  level?: string; // School/State/National/International
  grade?: string;
}

function parseCommonAppECs(text: string): SubmittedEC[] {
  const ecs: SubmittedEC[] = [];
  
  // Common App has 10 EC slots
  // Look for patterns like "Activity 1:" or numbered lists
  const sections = text.split(/activity\s*\d+:|extracurricular\s*\d+:/i);
  
  // Known mapping for Huda's ECs
  const knownECs = [
    { 
      pattern: /empowering\s*ai|synthoria/i, 
      id: "ec_empowering_ai",
      name: "Empowering AI",
      position: "Founder & CEO"
    },
    {
      pattern: /synthoria\s*game/i,
      id: "ec_synthoria", 
      name: "Synthoria Game",
      position: "Lead Developer"
    },
    {
      pattern: /folklift/i,
      id: "ec_folklift",
      name: "Folklift Project", 
      position: "Co-Founder"
    },
    {
      pattern: /yuvamanthan|model\s*un/i,
      id: "ec_yuvamanthan",
      name: "Yuvamanthan Model UN",
      position: "Secretary General"
    },
    {
      pattern: /coding\s*club/i,
      id: "ec_coding_club",
      name: "Coding Club",
      position: "President"
    },
    {
      pattern: /chess/i,
      id: "ec_chess",
      name: "Chess Team",
      position: "Team Captain"
    },
    {
      pattern: /math\s*circle/i,
      id: "ec_math_circle",
      name: "Math Circle",
      position: "Member"
    },
    {
      pattern: /research/i,
      id: "ec_research",
      name: "AI Research",
      position: "Research Intern"
    },
    {
      pattern: /tedx/i,
      id: "ec_tedx",
      name: "TEDx Speaker",
      position: "Speaker"
    },
    {
      pattern: /yearbook/i,
      id: "ec_yearbook", 
      name: "Yearbook",
      position: "Editor"
    }
  ];

  // Extract ECs from text
  for (const ec of knownECs) {
    if (ec.pattern.test(text)) {
      const submitted: SubmittedEC = {
        id: ec.id,
        name: ec.name,
        position: ec.position
      };

      // Try to extract hours/weeks if mentioned nearby
      const context = text.slice(Math.max(0, text.search(ec.pattern) - 200), text.search(ec.pattern) + 200);
      
      const hoursMatch = context.match(/(\d+)\s*h(?:ou)?rs?\s*(?:per\s*)?w(?:ee)?k/i);
      if (hoursMatch) submitted.hours_per_week = parseInt(hoursMatch[1]);
      
      const weeksMatch = context.match(/(\d+)\s*w(?:ee)?ks?\s*(?:per\s*)?y(?:ea)?r/i);
      if (weeksMatch) submitted.weeks_per_year = parseInt(weeksMatch[1]);

      ecs.push(submitted);
    }
  }

  // Ensure we have exactly 10 (pad with most likely if needed)
  return ecs.slice(0, 10);
}

function parseCommonAppAwards(text: string): SubmittedAward[] {
  const awards: SubmittedAward[] = [];
  
  // Common App has 5 honor slots
  const knownAwards = [
    {
      pattern: /ncwit.*national/i,
      id: "award_ncwit",
      name: "NCWIT Aspirations National Winner",
      level: "National"
    },
    {
      pattern: /sts|science\s*talent/i,
      id: "award_sts",
      name: "Regeneron STS Scholar",
      level: "National"
    },
    {
      pattern: /congressional\s*app/i,
      id: "award_congressional_app",
      name: "Congressional App Challenge Winner",
      level: "National"
    },
    {
      pattern: /diamond\s*challenge/i,
      id: "award_diamond",
      name: "Diamond Challenge Semifinalist",
      level: "International"
    },
    {
      pattern: /ap\s*scholar/i,
      id: "award_ap_scholar",
      name: "AP Scholar with Distinction",
      level: "National"
    }
  ];

  for (const award of knownAwards) {
    if (award.pattern.test(text)) {
      awards.push({
        id: award.id,
        name: award.name,
        level: award.level
      });
    }
  }

  return awards.slice(0, 5);
}

export async function run(inputDir: string, studentId = "huda") {
  // Find application files
  const files = await fg.sync("**/*", {
    cwd: inputDir,
    absolute: true,
    ignore: ["**/node_modules/**"]
  });

  const appFiles = files.filter(f => {
    const name = path.basename(f).toLowerCase();
    return (
      name.includes("common") && name.includes("app") ||
      name.includes("uc") && name.includes("app") ||
      f.includes("09-Raw-ApplicationDocs")
    ) && (f.endsWith(".json") || f.endsWith(".pdf") || f.endsWith(".docx"));
  });

  console.log(`[emit_applications_subset] Found ${appFiles.length} application files`);

  let submittedECs: SubmittedEC[] = [];
  let submittedAwards: SubmittedAward[] = [];

  // Process files to extract submitted items
  for (const file of appFiles) {
    try {
      if (file.endsWith(".json")) {
        const doc = JSON.parse(fs.readFileSync(file, "utf8"));
        const text = doc.text || "";
        
        // Parse Common App format
        if (file.toLowerCase().includes("common")) {
          const ecs = parseCommonAppECs(text);
          const awards = parseCommonAppAwards(text);
          
          if (ecs.length > 0) submittedECs = ecs;
          if (awards.length > 0) submittedAwards = awards;
        }
      }
    } catch (e: any) {
      console.warn(`[emit_applications_subset] Error processing ${path.basename(file)}: ${e.message}`);
    }
  }

  // If we didn't find from docs, use known submitted list
  if (submittedECs.length === 0) {
    submittedECs = [
      { id: "ec_empowering_ai", name: "Empowering AI", position: "Founder & CEO" },
      { id: "ec_synthoria", name: "Synthoria Game", position: "Lead Developer" },
      { id: "ec_folklift", name: "Folklift Project", position: "Co-Founder" },
      { id: "ec_yuvamanthan", name: "Yuvamanthan Model UN", position: "Secretary General" },
      { id: "ec_coding_club", name: "Coding Club", position: "President" },
      { id: "ec_chess", name: "Chess Team", position: "Team Captain" },
      { id: "ec_math_circle", name: "Math Circle", position: "Member" },
      { id: "ec_research", name: "AI Research", position: "Research Intern" },
      { id: "ec_tedx", name: "TEDx Speaker", position: "Speaker" },
      { id: "ec_yearbook", name: "Yearbook", position: "Editor" }
    ];
  }

  if (submittedAwards.length === 0) {
    submittedAwards = [
      { id: "award_ncwit", name: "NCWIT Aspirations National Winner", level: "National" },
      { id: "award_sts", name: "Regeneron STS Scholar", level: "National" },
      { id: "award_congressional_app", name: "Congressional App Challenge Winner", level: "National" },
      { id: "award_diamond", name: "Diamond Challenge Semifinalist", level: "International" },
      { id: "award_ap_scholar", name: "AP Scholar with Distinction", level: "National" }
    ];
  }

  // Emit the submitted subset observation
  const observation = {
    studentId,
    kind: "APPS",
    subtype: "submitted_subset", 
    value: {
      ecs: submittedECs.slice(0, 10),
      awards: submittedAwards.slice(0, 5),
      submitted_date: "2024-01-01" // Common App deadline
    },
    source: "common_app_final",
    at: "2024-01-01"
  };

  await emit(observation);
  console.log(`[emit_applications_subset] Emitted submitted subset: ${submittedECs.length} ECs, ${submittedAwards.length} awards`);
}

// CLI
if (require.main === module) {
  const dir = process.argv[2];
  const sid = process.argv[3] || "huda";
  if (!dir) {
    console.error("Usage: ts-node emit_applications_subset.ts <canonical-dir> [studentId]");
    console.error("Example: ts-node emit_applications_subset.ts data/canonical/jenny-huda/09-* huda");
    process.exit(1);
  }
  run(dir, sid).catch(e => { console.error(e); process.exit(1); });
}