import dotenv from 'dotenv';
dotenv.config();

export const cfg = {
  pg: process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL
  } : {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'ivylevel',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY!,
    indexName: process.env.PINECONE_INDEX || 'jenny-v3-20250930',
  },
  llm: {
    openaiKey: process.env.OPENAI_API_KEY,
  },
};