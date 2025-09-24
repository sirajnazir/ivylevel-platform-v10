export type OppCategory =
  | "summer_program"
  | "competition_award"
  | "research_program"
  | "scholarship"
  | "network_org"
  | "other";

export const OPPORTUNITY_ALIASES: Record<string, { canonical: string; category: OppCategory; tags?: string[] }> = {
  // Awards
  "ncwit": { canonical: "NCWIT Aspirations in Computing", category: "competition_award", tags: ["women-in-tech","computing"] },
  "ncwit national": { canonical: "NCWIT Aspirations in Computing", category: "competition_award", tags: ["national","women-in-tech"] },

  // Summer programs
  "jcamp": { canonical: "AAJA JCamp", category: "summer_program", tags: ["journalism","selective"] },
  "yygs": { canonical: "Yale Young Global Scholars (YYGS)", category: "summer_program", tags: ["enrichment","selective"] },
  "kode with klossy": { canonical: "Kode With Klossy", category: "summer_program", tags: ["coding","girls"] },
  "girls who code": { canonical: "Girls Who Code SIP", category: "summer_program", tags: ["coding","girls"] },
  "cosmos": { canonical: "UC COSMOS", category: "summer_program", tags: ["stem"] },
  "mites": { canonical: "MITES", category: "summer_program", tags: ["stem","selective_free"] },
  "notre dame": { canonical: "Notre Dame Pre-College", category: "summer_program", tags: ["precollege"] },

  // Research
  "rsi": { canonical: "RSI (Research Science Institute)", category: "research_program", tags: ["elite","research"] },
  "simons": { canonical: "Stony Brook Simons Summer", category: "research_program", tags: ["research"] },

  // Scholarships
  "bank of america": { canonical: "Bank of America Student Leaders", category: "scholarship", tags: ["leadership","summer-internship"] },
  "bofa": { canonical: "Bank of America Student Leaders", category: "scholarship", tags: ["leadership","summer-internship"] },
  "coca-cola": { canonical: "Coca-Cola Scholars", category: "scholarship", tags: ["national"] },
  "jack kent cooke": { canonical: "Jack Kent Cooke", category: "scholarship", tags: ["need-based"] },

  // NASA / data science
  "nasa": { canonical: "NASA (Data Science / Internships)", category: "summer_program", tags: ["data-science","stem"] },

  // Generic catch-alls will be classified as "other"
};

export function canonicalize(nameRaw: string): { canonical: string; category: OppCategory; tags: string[] } {
  const key = nameRaw.toLowerCase().trim();
  if (OPPORTUNITY_ALIASES[key]) {
    const m = OPPORTUNITY_ALIASES[key];
    return { canonical: m.canonical, category: m.category, tags: m.tags ?? [] };
  }
  // try contains matching
  for (const k of Object.keys(OPPORTUNITY_ALIASES)) {
    if (key.includes(k)) {
      const m = OPPORTUNITY_ALIASES[k]; // Fixed: use k not key
      return { canonical: m.canonical, category: m.category, tags: m.tags ?? [] };
    }
  }
  return { canonical: nameRaw.trim(), category: "other", tags: [] };
}