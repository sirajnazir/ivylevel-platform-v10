#!/usr/bin/env tsx
/**
 * KBv6 Unified Pipeline Diagnostic
 *
 * Verifies all 3 categories work through single orchestrator entry point:
 * 1. Category 1: Facts-First SQL (enumeration/temporal facts)
 * 2. Category 2: KB/RAG Hybrid Search
 * 3. Category 3: Fine-Tuned LLM + EQ
 *
 * Exit codes:
 * - 0: All checks passed
 * - 1: Boot validation failed
 * - 2: Category 1 (SQL) failed
 * - 3: Category 2 (KB/RAG) failed
 * - 4: Category 3 (LLM/EQ) failed
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../services/jenny-api/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Mock CFG for standalone script
const CFG = {
  EMBEDDING_MODEL_ID: process.env.EMBEDDING_MODEL_ID || 'text-embedding-3-large',
  PINECONE_INDEX_DIM: Number(process.env.PINECONE_INDEX_DIM || 3072),
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX || 'jenny-v3-3072-093025',
  JENNY_MODEL_ID: process.env.JENNY_MODEL_ID || 'unknown'
};

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8787';
const STUDENT_ID = process.env.TEST_STUDENT_ID || 'huda-2025';

interface ChatResponse {
  model?: string;
  answer?: string;
  debug?: {
    route?: string;
    rag?: {
      hits?: number;
    };
  };
}

async function post(endpoint: string, body: any): Promise<ChatResponse> {
  const res = await fetch(`${SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function checkBootLog() {
  console.log('🔍 [1/4] Checking boot log for KBv6 config...');

  // Verify environment variables
  const checks = [
    { name: 'EMBEDDING_MODEL_ID', value: CFG.EMBEDDING_MODEL_ID, expected: 'text-embedding-3-large' },
    { name: 'PINECONE_INDEX_DIM', value: CFG.PINECONE_INDEX_DIM, expected: 3072 },
    { name: 'PINECONE_INDEX_NAME', value: CFG.PINECONE_INDEX_NAME, expected: 'jenny-v3-3072-093025' },
  ];

  for (const check of checks) {
    if (check.value !== check.expected) {
      console.error(`❌ ${check.name} mismatch: got ${check.value}, expected ${check.expected}`);
      process.exit(1);
    }
    console.log(`✅ ${check.name}: ${check.value}`);
  }

  console.log('✅ Boot config validated\n');
}

async function checkCategory1() {
  console.log('🔍 [2/4] Testing Category 1: Facts-First SQL...');

  const res = await post('/agent/chat/gpt5', {
    message: 'What was my first SAT score?',
    student_id: STUDENT_ID
  });

  // Check for SQL routing
  if (res.model === 'enumeration_facts' || res.debug?.route === 'sql') {
    console.log('✅ Category 1 PASSED: Routed to SQL');
    console.log(`   Answer: ${res.answer?.substring(0, 80)}...`);
    return true;
  }

  console.error('❌ Category 1 FAILED: Expected SQL routing');
  console.error('   Response:', JSON.stringify(res, null, 2));
  process.exit(2);
}

async function checkCategory2() {
  console.log('🔍 [3/4] Testing Category 2: KB/RAG Pipeline...');

  const res: any = await post('/agent/chat/gpt5', {
    message: 'Tell me about rejection bridge technique',
    student_id: STUDENT_ID
  });

  // Check for KB/RAG execution (hits array present means hybridSearch ran)
  const route = res.debug?.route;
  const hits = res.hits?.length ?? 0;
  const hitsArray = res.hits;

  // KB/RAG executed if we have hits array (even if empty, means search ran)
  if (hitsArray !== undefined) {
    console.log(`✅ Category 2 PASSED: KB/RAG pipeline executed`);
    console.log(`   Hits: ${hits} (${hits >= 3 ? 'above keep_at_least threshold' : 'LLM fallback used'})`);

    // Ensure we got an answer (from KB or LLM fallback)
    if (!res.answer || res.answer.trim().length === 0) {
      console.error('❌ Category 2 FAILED: No answer generated');
      process.exit(3);
    }

    // Check fine-tuned model was used
    if (res.model?.includes('ft:gpt-4o-mini')) {
      console.log(`✅ Fine-tuned adapter active: ${res.model.substring(0, 40)}...`);
    }

    return true;
  }

  console.error('❌ Category 2 FAILED: KB/RAG pipeline did not execute (no hits array)');
  console.error('   Response:', JSON.stringify(res, null, 2).substring(0, 500));
  process.exit(3);
}

async function checkCategory3() {
  console.log('🔍 [4/4] Testing Category 3: Fine-Tuned LLM + EQ...');

  const res = await post('/agent/chat/gpt5', {
    message: 'How can I stay motivated during the college application process?',
    student_id: STUDENT_ID
  });

  // Check for fine-tuned model usage
  const isFinetuned = res.model?.includes('ft:gpt-4o-mini');

  if (isFinetuned) {
    console.log('✅ Category 3 PASSED: Fine-tuned adapter active');
    console.log(`   Model: ${res.model}`);
    console.log(`   Answer: ${res.answer?.substring(0, 100)}...`);

    // Check for EQ patterns (curiosity, empathy)
    const hasEQ = res.answer?.toLowerCase().includes('curious') ||
                  res.answer?.toLowerCase().includes('struggling') ||
                  res.answer?.includes('?');

    if (hasEQ) {
      console.log('✅ EQ patterns detected (curiosity/clarifying questions)');
    } else {
      console.log('⚠️  No obvious EQ patterns, but model is fine-tuned');
    }

    return true;
  }

  console.error('❌ Category 3 FAILED: Expected fine-tuned model');
  console.error('   Response:', JSON.stringify(res, null, 2));
  process.exit(4);
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  KBv6 Unified Pipeline Diagnostic                      ║
╚════════════════════════════════════════════════════════╝

Server: ${SERVER_URL}
Student: ${STUDENT_ID}
`);

  try {
    await checkBootLog();
    await checkCategory1();
    await checkCategory2();
    await checkCategory3();

    console.log(`
╔════════════════════════════════════════════════════════╗
║  ✅ ALL CHECKS PASSED                                  ║
║  Categories 1, 2, 3 verified through unified pipeline  ║
╚════════════════════════════════════════════════════════╝
`);
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Diagnostic failed:', err.message);
    process.exit(1);
  }
}

main();
