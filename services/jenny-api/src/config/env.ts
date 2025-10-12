import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment with priority: .env.local > root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const CFG = {
  // LLM Configuration
  JENNY_MODEL_ID: process.env.JENNY_MODEL_ID!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,

  // Embedding Configuration (KBv6 locked)
  EMBEDDING_MODEL_ID: process.env.EMBEDDING_MODEL_ID || 'text-embedding-3-large',
  PINECONE_INDEX_DIM: Number(process.env.PINECONE_INDEX_DIM || 3072),

  // Pinecone Configuration (KBv6)
  PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jenny-v3-3072-093025',

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Cohere (Reranker)
  COHERE_API_KEY: process.env.COHERE_API_KEY,

  // Server
  PORT: Number(process.env.PORT || 8787),
  SERVICE_NAME: process.env.SERVICE_NAME || 'jenny-api-utfa',
};

// Validate critical environment variables
const REQUIRED_VARS = [
  'JENNY_MODEL_ID',
  'OPENAI_API_KEY',
  'PINECONE_API_KEY',
  'PINECONE_INDEX_NAME',
  'DATABASE_URL'
];

REQUIRED_VARS.forEach(key => {
  const value = process.env[key] || (CFG as any)[key];
  assert(value, `❌ Missing required environment variable: ${key}`);
});

// Validate KBv6 configuration
assert(
  CFG.EMBEDDING_MODEL_ID === 'text-embedding-3-large',
  `❌ KBv6 requires text-embedding-3-large, got: ${CFG.EMBEDDING_MODEL_ID}`
);

assert(
  CFG.PINECONE_INDEX_DIM === 3072,
  `❌ KBv6 requires 3072 dimensions, got: ${CFG.PINECONE_INDEX_DIM}`
);

// v10.4: Humanizer feature flag (default ON for /agent/chat/gpt5 only)
// Set HUMANIZER_ENABLED=0 to disable instantly if needed
export const HUMANIZER_ENABLED = process.env.HUMANIZER_ENABLED !== '0';

console.log('[ENV] Configuration loaded:', {
  service: CFG.SERVICE_NAME,
  jenny_model: CFG.JENNY_MODEL_ID.slice(0, 40) + '...',
  embed_model: CFG.EMBEDDING_MODEL_ID,
  pinecone_index: CFG.PINECONE_INDEX_NAME,
  pinecone_dim: CFG.PINECONE_INDEX_DIM,
  port: CFG.PORT,
  humanizer: HUMANIZER_ENABLED ? 'enabled' : 'disabled'
});
