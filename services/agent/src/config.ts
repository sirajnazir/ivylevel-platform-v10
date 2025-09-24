export const MODEL_ID = process.env.JENNY_MODEL_ID || "gpt-4o-mini-2024-07-18"; // FT takes priority
export const RETRIEVER_URL = process.env.RETRIEVER_URL || "http://localhost:4102";
export const PORT = process.env.AGENT_PORT || 4101;

// A/B testing configuration
export const USE_FT = process.env.USE_FT === "1";
export const MODEL_CURRENT = USE_FT ? MODEL_ID : (process.env.EVAL_BASE_MODEL || "gpt-4o-mini-2024-07-18");

// Default agent configuration
export const DEFAULT_TEMPERATURE = 0.7;
export const MAX_TOKENS = 2048;