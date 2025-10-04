/**
 * v3.7.2 Universal Action Parameter Extraction (UAPX)
 * Hybrid deterministic → pattern library → LLM pipeline
 */

import { z } from "zod";
import OpenAI from "openai";
import type { Domain, UAPX, UAPXTarget, UAPXDelta } from "../schema.js";
import { DOMAIN_BOUNDS } from "../schema.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ========================================
// 1. DETERMINISTIC RULES (Fast Path)
// ========================================

interface Rule {
  re: RegExp;
  build: (match: RegExpMatchArray) => Partial<UAPX>;
}

const RULES: Rule[] = [
  // TESTING: SAT exact target "SAT to 1590", "score 1550"
  {
    re: /\b(?:sat|score)\s*(?:to|=|of)\s*(\d{3,4})\b/i,
    build: (m) => ({
      domain: "testing",
      action: "set",
      target: { name: "sat_total", value: Number(m[1]), unit: "points" },
    }),
  },
  // TESTING: SAT delta "by +60", "improve by 50"
  {
    re: /\b(?:sat|score)[^0-9+-]*?(?:by)\s*([+-]?\d{2,3})\b/i,
    build: (m) => ({
      domain: "testing",
      action: "increase",
      delta: { name: "sat_total", value: Number(m[1]), unit: "points" },
    }),
  },
  // AWARDS: tier "win national award", "get international"
  {
    re: /\b(?:win|get|got|land|earn|receive)\s+(?:an?\s+)?(school|regional|national|international)\s*(?:award|recognition|honor|competition|comp)?\b/i,
    build: (m) => ({
      domain: "awards",
      action: "win",
      target: { name: "award_tier", value: m[2].toLowerCase(), unit: "tier" },
    }),
  },
  // ECS: scale/grow with activity "scale(d) Empowering AI to 100 users", "grow Synthoria to 10k users"
  {
    re: /\b(?:scale(?:d)?|grow|expand)\s+(?:the\s+)?([\w'&.\- ]{2,60}?)\s+(?:to|reach)\s+([\d,.]+)k?\s*(users?|members?)\b/i,
    build: (m) => {
      const val = m[2].includes("k")
        ? Number(m[2].replace(/[,.k]/g, "")) * 1000
        : Number(m[2].replace(/[,.]/g, ""));
      return {
        domain: "ecs",
        action: "set",
        target: { name: "users", value: val, unit: "users" },
        qualifiers: { activity_name: m[1].trim().replace(/\s+/g, ' ') },
      };
    },
  },
  // ECS: users growth generic "reach 10k users", "get to 5000 users"
  {
    re: /\b(?:reach|get\s+to|grow\s+to|take\s+to)\s+([\d,.]+)k?\s*(users?|members?)\b/i,
    build: (m) => {
      const val = m[1].includes("k")
        ? Number(m[1].replace(/[,.k]/g, "")) * 1000
        : Number(m[1].replace(/[,.]/g, ""));
      return {
        domain: "ecs",
        action: "set",
        target: { name: "users", value: val, unit: "users" },
      };
    },
  },
  // ECS: reach N users on activity "reach 10k users on Synthoria"
  {
    re: /\breach\s+([\d,.]+)k?\s*(users?|members?)\s+(?:on|for|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i,
    build: (m) => {
      const val = m[1].includes("k")
        ? Number(m[1].replace(/[,.k]/g, "")) * 1000
        : Number(m[1].replace(/[,.]/g, ""));
      return {
        domain: "ecs",
        action: "set",
        target: { name: "users", value: val, unit: "users" },
        qualifiers: { activity_name: m[3].trim().replace(/\s+/g, ' ') },
      };
    },
  },
  // ECS: double users with activity "double users on Empowering AI", "2x users for Synthoria"
  {
    re: /\b(?:double|2x)\s+(?:the\s+)?users?\s+(?:on|for|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i,
    build: (m) => ({
      domain: "ecs",
      action: "increase",
      delta: { name: "users", value: 100, unit: "%" },
      qualifiers: { activity_name: m[1].trim().replace(/\s+/g, ' ') },
    }),
  },
  // ECS: double users generic "double users", "2x reach"
  {
    re: /\b(?:double|2x)\s*(?:users?|reach|membership)\b/i,
    build: () => ({
      domain: "ecs",
      action: "increase",
      delta: { name: "users", value: 100, unit: "%" },
    }),
  },
  // ECS: hours/week with activity "increase hours per week to 12 on Filmmaker's Club"
  {
    re: /\b(?:increase|raise|bump)\s*(?:hours|hrs)\s*(?:per|\/)\s*week\s*(?:to|by)\s*([\d.]+)\s+(?:on|for|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i,
    build: (m) => {
      const isTarget = /to/i.test(m.input);
      return {
        domain: "ecs",
        action: isTarget ? "set" : "increase",
        target: isTarget
          ? { name: "hours_per_week", value: Number(m[1]), unit: "hours_per_week" }
          : undefined,
        delta: !isTarget
          ? { name: "hours_per_week", value: Number(m[1]), unit: "hours_per_week" }
          : undefined,
        qualifiers: { activity_name: m[2].trim().replace(/\s+/g, ' ') },
      };
    },
  },
  // ECS: hours/week generic "increase hours to 12", "raise hours by 5"
  {
    re: /\b(?:increase|raise|bump)\s*(?:hours|hrs)\s*(?:per|\/)\s*week\s*(?:to|by)\s*([\d.]+)\b/i,
    build: (m) => {
      const isTarget = /to/i.test(m.input);
      return {
        domain: "ecs",
        action: isTarget ? "set" : "increase",
        target: isTarget
          ? { name: "hours_per_week", value: Number(m[1]), unit: "hours_per_week" }
          : undefined,
        delta: !isTarget
          ? { name: "hours_per_week", value: Number(m[1]), unit: "hours_per_week" }
          : undefined,
      };
    },
  },
  // ECS: funds raised with activity "raise $25k for Folklift", "fundraise 10000 for Empowering AI"
  {
    re: /\b(?:raise|fundraise|get)\s*\$?\s*([\d,.]+)(k)?\s+(?:for|on|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i,
    build: (m) => {
      const raw = Number(m[1].replace(/[,.]/g, ""));
      const val = m[2] ? raw * 1000 : raw;
      return {
        domain: "ecs",
        action: "increase",
        delta: { name: "funds_usd", value: val, unit: "usd" },
        qualifiers: { activity_name: m[3].trim().replace(/\s+/g, ' ') },
      };
    },
  },
  // ECS: funds raised generic "raise $25k", "fundraise 10000"
  {
    re: /\b(?:raise|fundraise|get)\s*\$?\s*([\d,.]+)(k)?\b/i,
    build: (m) => {
      const raw = Number(m[1].replace(/[,.]/g, ""));
      const val = m[2] ? raw * 1000 : raw;
      return {
        domain: "ecs",
        action: "increase",
        delta: { name: "funds_usd", value: val, unit: "usd" },
      };
    },
  },
  // ACADEMICS: GPA target "GPA to 3.95", "raise GPA to 3.9"
  {
    re: /\b(?:gpa)\s*(?:to|=)\s*([0-4]\.\d{1,2})\b/i,
    build: (m) => ({
      domain: "academics",
      action: "set",
      target: { name: "gpa_unweighted", value: Number(m[1]), unit: "gpa" },
    }),
  },
  // PROGRAMS: admits "get into RSI", "admitted to LaunchX"
  {
    re: /\b(?:admit|admitted|get\s+into|got\s+into)\s+(rsi|ssp|tasp|launchx|ai4all|ycgs|yygs)\b/i,
    build: (m) => ({
      domain: "programs",
      action: "admit",
      target: { name: "program_admit", value: m[1].toLowerCase() },
      qualifiers: { program_name: m[1] },
    }),
  },
];

// ========================================
// 2. PATTERN LIBRARY (Slot Templates)
// ========================================

interface Slot {
  key: string;
  re: RegExp;
  map: (groups: Record<string, string>) => Partial<UAPX>;
}

const SLOTS: Slot[] = [
  {
    key: "testing.sat.set",
    re: /\b(?:sat)\s*(?:to|=)\s*(?<sat>\d{3,4})\b/i,
    map: (g) => ({
      domain: "testing",
      action: "set",
      target: { name: "sat_total", value: Number(g.sat), unit: "points" },
    }),
  },
  {
    key: "awards.tier",
    re: /\b(?<tier>school|regional|national|international)\s+(?:award|win)\b/i,
    map: (g) => ({
      domain: "awards",
      action: "win",
      target: { name: "award_tier", value: g.tier, unit: "tier" },
    }),
  },
  {
    key: "ecs.scale.set.users.with_activity",
    re: /\b(?:scale|grow|expand)\s+(?:the\s+)?(?<activity>[\w'&.\- ]{2,60}?)\s+(?:to|reach)\s*(?<users>[\d,.]+)k?\s*(?:users?|members?)\b/i,
    map: (g) => {
      const val = g.users.includes("k")
        ? Number(g.users.replace(/[,.k]/g, "")) * 1000
        : Number(g.users.replace(/[,.]/g, ""));
      return {
        domain: "ecs",
        action: "set",
        target: { name: "users", value: val, unit: "users" },
        qualifiers: { activity_name: g.activity.trim().replace(/\s+/g, ' ') },
      };
    },
  },
  {
    key: "ecs.scale.set.users.no_activity",
    re: /\b(?:reach|get\s+to|grow\s+to|scale\s+to|take\s+to)\s*(?<users>[\d,.]+)k?\s*(?:users?|members?)\b/i,
    map: (g) => {
      const val = g.users.includes("k")
        ? Number(g.users.replace(/[,.k]/g, "")) * 1000
        : Number(g.users.replace(/[,.]/g, ""));
      return {
        domain: "ecs",
        action: "set",
        target: { name: "users", value: val, unit: "users" },
      };
    },
  },
  {
    key: "ecs.users.set",
    re: /\b(?:users)\s*(?:to|=)\s*(?<users>[\d,.]+)\b/i,
    map: (g) => ({
      domain: "ecs",
      action: "set",
      target: { name: "users", value: Number(g.users.replace(/[,.]/g, "")), unit: "users" },
    }),
  },
];

// ========================================
// 3. LLM FALLBACK (Strict JSON Schema)
// ========================================

const UAPXZ = z.object({
  domain: z.enum(["testing", "awards", "ecs", "academics", "programs", "narrative"]),
  action: z.enum(["set", "increase", "decrease", "win", "admit", "convert", "complete"]),
  target: z
    .object({
      name: z.string(),
      value: z.union([z.number(), z.string()]),
      unit: z.string().optional(),
    })
    .optional(),
  delta: z
    .object({
      name: z.string(),
      value: z.number(),
      unit: z.string().optional(),
    })
    .optional(),
  bounds: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  qualifiers: z
    .object({
      activity_name: z.string().optional(),
      award_name: z.string().optional(),
      tier: z.enum(["school", "regional", "national", "international"]).optional(),
      program_name: z.string().optional(),
      subject: z.string().optional(),
      years: z.string().optional(),
    })
    .optional(),
  confidence: z.number(),
  source: z.enum(["rule", "pattern", "llm"]),
});

const LLM_PROMPT = `You extract parameters for "what-if/change/goal" queries about student readiness.
Return ONLY valid JSON for this schema:

{ "domain": "...", "action": "...", "target": { "name": "...", "value": ..., "unit": "..." }, "delta": {...},
  "bounds": {...}, "qualifiers": {...}, "confidence": 0.0, "source": "llm" }

Rules:
- Domain from the user intent: testing, awards, ecs, academics, programs, narrative.
- Prefer numeric targets or deltas. Normalize units: points, users, usd, hours_per_week, tier.
- If both "to" and "by" are present, "to" wins (target exact).
- SAT bounds: [400,1600]. GPA bounds: [0,4.5]. Users/funds must be >=0.
- Tiers: school, regional, national, international (lowercase).
- Confidence 0..1. Do not add commentary.

Few-shot examples:

Q: what if I get a 1590 in SAT?
A: {"domain":"testing","action":"set","target":{"name":"sat_total","value":1590,"unit":"points"},"confidence":0.90,"source":"llm"}

Q: can I bump SAT by +40?
A: {"domain":"testing","action":"increase","delta":{"name":"sat_total","value":40,"unit":"points"},"confidence":0.88,"source":"llm"}

Q: what if I win a national award?
A: {"domain":"awards","action":"win","target":{"name":"award_tier","value":"national","unit":"tier"},"confidence":0.92,"source":"llm"}

Q: if I grow Empowering AI to 10,000 users?
A: {"domain":"ecs","action":"set","target":{"name":"users","value":10000,"unit":"users"},"qualifiers":{"activity_name":"Empowering AI"},"confidence":0.91,"source":"llm"}

Q: what if I double users on Synthoria?
A: {"domain":"ecs","action":"increase","delta":{"name":"users","value":100,"unit":"%"},"qualifiers":{"activity_name":"Synthoria"},"confidence":0.9,"source":"llm"}

Q: raise $25k for Empowering AI?
A: {"domain":"ecs","action":"increase","delta":{"name":"funds_usd","value":25000,"unit":"usd"},"qualifiers":{"activity_name":"Empowering AI"},"confidence":0.9,"source":"llm"}

Q: what if I only scaled the empowering AI to 100 users?
A: {"domain":"ecs","action":"set","target":{"name":"users","value":100,"unit":"users"},"qualifiers":{"activity_name":"Empowering AI"},"confidence":0.90,"source":"llm"}

Q: can I double users on Synthoria?
A: {"domain":"ecs","action":"increase","delta":{"name":"users","value":100,"unit":"%"},"qualifiers":{"activity_name":"Synthoria"},"confidence":0.90,"source":"llm"}

Q: increase hours per week to 12 on Filmmaker's Club?
A: {"domain":"ecs","action":"set","target":{"name":"hours_per_week","value":12,"unit":"hours_per_week"},"qualifiers":{"activity_name":"Filmmaker's Club"},"confidence":0.89,"source":"llm"}

Q: if I raise my GPA to 3.95?
A: {"domain":"academics","action":"set","target":{"name":"gpa_unweighted","value":3.95,"unit":"gpa"},"confidence":0.89,"source":"llm"}

Q: what if I get into RSI?
A: {"domain":"programs","action":"admit","target":{"name":"program_admit","value":"rsi"},"confidence":0.9,"source":"llm"}`;

async function extractViaLLM(text: string, domainHint?: Domain): Promise<UAPX | null> {
  try {
    const seed = domainHint ? `Domain hint: ${domainHint}.` : "";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: LLM_PROMPT },
        { role: "user", content: `${seed}\nUser: ${text}` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const json = JSON.parse(raw);
    const parsed = UAPXZ.safeParse(json);

    if (parsed.success) {
      return validateBounds(parsed.data);
    }
    return null;
  } catch (error) {
    console.error("[UAPX] LLM fallback failed:", error);
    return null;
  }
}

// ========================================
// 4. VALIDATION & BOUNDS CHECKING
// ========================================

function validateBounds(uapx: UAPX): UAPX | null {
  if (uapx.target?.name && typeof uapx.target.value === "number") {
    const bounds = DOMAIN_BOUNDS[uapx.target.name];
    if (bounds) {
      if (
        (bounds.min !== undefined && uapx.target.value < bounds.min) ||
        (bounds.max !== undefined && uapx.target.value > bounds.max)
      ) {
        return null; // Out of bounds
      }
    }
  }
  return uapx;
}

// ========================================
// 5. MAIN EXTRACTION PIPELINE
// ========================================

export async function extractUAPX(text: string, domainHint?: Domain): Promise<UAPX | null> {
  console.log("[UAPX] Extracting from:", text, "domain hint:", domainHint);

  // 1) Deterministic rules (fastest)
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) {
      const obj = r.build(m);
      const result = { ...obj, confidence: 0.95, source: "rule" } as UAPX;
      console.log("[UAPX] Rule match:", result);
      return validateBounds(result);
    }
  }

  // 2) Pattern slots
  for (const s of SLOTS) {
    const m = s.re.exec(text);
    if (m?.groups) {
      const obj = s.map(m.groups as Record<string, string>);
      const result = { ...obj, confidence: 0.85, source: "pattern" } as UAPX;
      console.log("[UAPX] Pattern match:", result);
      return validateBounds(result);
    }
  }

  // 3) LLM fallback
  console.log("[UAPX] Falling back to LLM");
  const llmResult = await extractViaLLM(text, domainHint);
  if (llmResult) {
    console.log("[UAPX] LLM match:", llmResult);
  }
  return llmResult;
}
