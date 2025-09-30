// services/agent/src/canon/registry.ts
export type CanonKey = 
  | "awards.initial" 
  | "awards.final" 
  | "ecs.initial" 
  | "ecs.final" 
  | "sat.timeline" 
  | "college.list"
  | "GAMEPLAN_INITIAL_AWARDS"
  | "APP_FINAL_AWARDS"
  | "APP_FINAL_AWARDS_STRICT"
  | "APP_FINAL_ECS"
  | "SAT_TIMELINE"
  | "SAT_SUBMISSION";

export type CanonEntry = { 
  studentId: string; 
  kind: "GAMEPLAN" | "APP-DOC" | "TRANS-INTEL" | "EXEC-INTEL"; 
  doc_name: string; 
  section_hint?: string 
};

export type CanonConfig = {
  kind: string[];
  nameHints: string[];
  boost: number;
};

const REGISTRY: Record<CanonKey, CanonEntry[]> = {
  "awards.initial": [
    { 
      studentId: "huda", 
      kind: "GAMEPLAN", 
      doc_name: "Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx", 
      section_hint: "Initial Awards" 
    }
  ],
  "awards.final": [
    { 
      studentId: "huda", 
      kind: "APP-DOC", 
      doc_name: "Huda-Common App-Final ECs and Awards List.docx", 
      section_hint: "Final Award List" 
    }
  ],
  "ecs.initial": [
    {
      studentId: "huda",
      kind: "GAMEPLAN",
      doc_name: "Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx",
      section_hint: "Initial Extracurriculars"
    }
  ],
  "ecs.final": [
    {
      studentId: "huda",
      kind: "APP-DOC",
      doc_name: "Huda-Common App-Final ECs and Awards List.docx",
      section_hint: "Activities/ EC list"
    }
  ],
  "sat.timeline": [
    {
      studentId: "huda",
      kind: "TRANS-INTEL",
      doc_name: "*",
      section_hint: "SAT"
    }
  ],
  "college.list": [
    {
      studentId: "huda",
      kind: "GAMEPLAN",
      doc_name: "Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx",
      section_hint: "College List"
    }
  ],
  "GAMEPLAN_INITIAL_AWARDS": [
    {
      studentId: "huda",
      kind: "GAMEPLAN",
      doc_name: "Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx",
      section_hint: "Initial Awards"
    }
  ],
  "APP_FINAL_AWARDS": [
    {
      studentId: "huda",
      kind: "APP-DOC",
      doc_name: "Huda-Common App-Final ECs and Awards List.docx",
      section_hint: "Final Award List"
    }
  ],
  "APP_FINAL_AWARDS_STRICT": [
    {
      studentId: "huda",
      kind: "APP-DOC",
      doc_name: "Huda_Final_ECs_Awards_List",
      section_hint: "Final Award List"
    }
  ],
  "APP_FINAL_ECS": [
    {
      studentId: "huda",
      kind: "APP-DOC",
      doc_name: "Huda-Common App-Final ECs and Awards List.docx",
      section_hint: "Activities/ EC list"
    }
  ],
  "SAT_TIMELINE": [
    {
      studentId: "huda",
      kind: "TRANS-INTEL",
      doc_name: "*",
      section_hint: "SAT"
    }
  ],
  "SAT_SUBMISSION": [
    {
      studentId: "huda",
      kind: "APP-DOC",
      doc_name: "*",
      section_hint: "SAT submission"
    }
  ]
};

export const CANON_REGISTRY: Record<string, CanonConfig> = {
  GAMEPLAN_INITIAL_AWARDS: {
    kind: ["GAMEPLAN"],
    nameHints: [
      "Assessment GamePlan",
      "Initial Awards List",
      "Huda_Assessment_Gameplan_Report"
    ],
    boost: 15
  },
  APP_FINAL_AWARDS: {
    kind: ["APP-DOC"],
    nameHints: [
      "Final ECs and Awards List",
      "Common App Final",
      "Final Award List"
    ],
    boost: 15
  },
  APP_FINAL_AWARDS_STRICT: {
    kind: ["APP-DOC"],
    nameHints: [
      "Final Actual Outcomes",
      "Final Award List",
      "Huda-Common App-Final ECs and Awards List",
      "Huda_Final_ECs_Awards_List"
    ],
    boost: 18
  },
  APP_FINAL_ECS: {
    kind: ["APP-DOC"],
    nameHints: [
      "Final ECs",
      "Activities/ EC list",
      "Common App Final"
    ],
    boost: 15
  },
  SAT_TIMELINE: {
    kind: ["TRANS-INTEL", "EXEC-INTEL"],
    nameHints: [
      "SAT",
      "test score",
      "1360",
      "1480",
      "1530"
    ],
    boost: 10
  },
  SAT_SUBMISSION: {
    kind: ["APP-DOC", "TRANS-INTEL"],
    nameHints: [
      "submitted SAT",
      "final SAT",
      "SAT submission"
    ],
    boost: 12
  }
};

export function getCanon(key: CanonKey, studentId: string): CanonEntry | undefined {
  const entries = REGISTRY[key];
  if (!entries) return undefined;
  return entries.find(e => e.studentId === studentId);
}

export function getAllCanonDocs(studentId: string): CanonEntry[] {
  const docs: CanonEntry[] = [];
  for (const entries of Object.values(REGISTRY)) {
    docs.push(...entries.filter(e => e.studentId === studentId));
  }
  return docs;
}