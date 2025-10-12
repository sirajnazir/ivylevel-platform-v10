import crypto from "crypto";
import registry from "../config/model_registry.json";
import routing from "../config/routing.json";

type ComposeArgs = {
  prompt: string;
  intent: string;
  system?: string;
  temperature?: number;
  userId?: string;
  sessionId?: string;
  studentId?: string;
};

// SHA256-based hash function for deterministic cohort assignment
function simpleHash(str: string): number {
  const hash = crypto.createHash("sha256").update(str).digest("hex");
  return parseInt(hash.slice(0, 6), 16) % 100;
}

async function health(model: string, timeoutMs = 1500): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_TEST_SERVER_URL || "http://localhost:8787";
    const res = await fetch(`${baseUrl}/api/llm/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
      signal: ctl.signal
    });
    clearTimeout(t);
    const data = await res.json();
    return !!data?.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

function chooseModel(intent: string, cohortKey: string, studentId?: string) {
  const split = routing.composer.traffic_split;
  const tone = new Set(routing.composer.tone_sensitive_intents);

  // Adapter allowlist for internal QA (always use adapter for tone intents)
  const ADAPTER_ALLOWLIST = new Set(["huda-2025", "test-001"]);
  if (tone.has(intent) && ADAPTER_ALLOWLIST.has(studentId ?? "")) {
    console.info("[ADAPTER]", {
      key: cohortKey,
      bucket: "allowlisted",
      intent,
      isTone: true,
      useAdapter: true
    });
    return registry.models.jenny_v8_adapter;
  }

  // Micro-canary: scope to huda-2025 only (remove this filter for full rollout)
  const canaryEligible = studentId === "huda-2025" || cohortKey.startsWith("test-");

  const hash = simpleHash(cohortKey) % 100; // 0..99
  const inCanary = hash < Math.round((split.jenny_v8_adapter ?? 0) * 100);

  const isTone = tone.has(intent);
  const useAdapter = isTone && canaryEligible && inCanary;

  console.info("[ADAPTER]", {
    key: cohortKey,
    bucket: hash,
    intent,
    isTone,
    canaryEligible,
    inCanary,
    useAdapter
  });

  if (useAdapter) {
    return registry.models.jenny_v8_adapter;
  }
  return registry.models.composer_base;
}

export async function composeAnswer({ prompt, intent, system, temperature, userId, sessionId, studentId }: ComposeArgs) {
  const cohortKey = studentId ?? userId ?? sessionId ?? "anon";
  const candidate = chooseModel(intent, cohortKey, studentId);
  const ok = await health(candidate);
  const model = ok ? candidate : registry.models.composer_base;

  const body = {
    model,
    messages: [
      { role: "system", content: system ?? "You are Jenny, an empathetic coach. Be warm and specific. Cite sources when asserting facts." },
      { role: "user", content: prompt }
    ],
    temperature: temperature ?? 0.6
  };

  const t0 = Date.now();
  // Use absolute URL for server-side fetch
  const baseUrl = process.env.NEXT_PUBLIC_TEST_SERVER_URL || "http://localhost:8787";
  const res = await fetch(`${baseUrl}/api/llm/compose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`LLM compose failed: ${res.status}`);
  }

  const result = await res.json();

  // Attach trace metadata
  return {
    ...result,
    __trace: {
      model,
      latency_ms: Date.now() - t0,
      intent,
      cohortKey,
      isAdapter: model.includes("ft:")
    }
  };
}
