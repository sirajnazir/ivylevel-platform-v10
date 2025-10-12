/**
 * Test Lab Schema
 * Type definitions for Jenny Test Lab comprehensive testing
 */

export type TestCategory = "facts" | "kb" | "eq";
export type TestSource = "sql" | "kb" | "scaffold" | "hybrid" | "unknown";
export type GateVerdict = "pass" | "warn" | "fail";

export interface TestCase {
  id: string;
  label: string;
  category: TestCategory;
  prompt: string;
  studentId?: string;
  sessionId?: string;
  intentOverride?: string;
  expected?: {
    source?: TestSource;
    warmth?: boolean;
    action?: boolean;
    noMetaLeak?: boolean;
    minProof?: number;
    maxLatency?: number;
  };
}

export interface RunResult {
  id: string;
  label: string;
  category: TestCategory;
  prompt: string;
  answer: string;
  source: TestSource;
  modelBadge: string | null;
  scaffold: string | null;
  debug: {
    tags: string[];
    router: {
      decision?: {
        route: string;
        confidence: number;
      };
    } | null;
    sql: {
      rows_count?: number;
      query?: string;
    } | null;
    provenance: any[];
    metaLeak: boolean;
    tone: {
      warmth: boolean;
      action: boolean;
    };
    trace: {
      normalize?: string;
      preRouter?: {
        decision: string;
      };
      lexiconTags?: string[];
      routerDecision?: string;
      sourceCall?: string;
      guardsApplied?: string[];
    } | null;
  };
  metrics: {
    latency: {
      total_ms: number;
      router_ms: number | null;
      source_ms: number | null;
      guard_ms: number | null;
      p95_ms: number | null;
    };
  };
}

export interface GateResult {
  name: string;
  verdict: GateVerdict;
  message: string;
  actual?: any;
  expected?: any;
}

export interface TestRunResponse {
  test: TestCase;
  run: RunResult;
  gates: GateResult[];
}

export interface SuiteResult {
  id: string;
  label: string;
  category: TestCategory;
  tests: TestRunResponse[];
  aggregate: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    passRate: number;
    latency: {
      p50: number;
      p95: number;
      max: number;
    };
    modelMix: {
      adapter: number;
      base: number;
    };
  };
  scorecard: {
    proofPresence: number;
    toneWarmth: number;
    toneAction: number;
    noMetaLeak: number;
    sourceCorrectness: number;
  };
}
