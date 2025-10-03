// Test environment setup
process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'test-key';
process.env.PINECONE_INDEX = process.env.PINECONE_INDEX || 'jenny-v2';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';