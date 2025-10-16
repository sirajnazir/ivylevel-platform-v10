import { Pinecone } from '@pinecone-database/pinecone';
import { cfg } from '../config.js';

// Initialize Pinecone client
export const pinecone = new Pinecone({
  apiKey: cfg.pinecone.apiKey
});

// Get index reference
export const getIndex = () => {
  return pinecone.index(cfg.pinecone.indexName);
};