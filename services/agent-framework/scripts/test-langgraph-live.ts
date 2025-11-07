/**
 * Test LangGraph Live - 100% Rollout
 *
 * Tests actual LangGraph orchestration with a real message
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FactStore } from '../src/facts/FactStore.js';
import { FeatureFlagService } from '../src/config/featureFlags.js';
import { LangGraphOrchestrator } from '../src/langgraph/LangGraphOrchestrator.js';
import { IntelligenceRegistry } from '../src/intelligence/IntelligenceRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testLive() {
  console.log('🧪 Testing LangGraph Live - 100% Rollout\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Check rollout status
    console.log('📋 Step 1: Check Feature Flag Status');
    const featureFlagService = new FeatureFlagService(pool);
    const status = await featureFlagService.getRolloutStatus();
    console.log(`  Global rollout: ${status.rolloutPercentage}%`);

    if (status.rolloutPercentage !== 100) {
      throw new Error(`Expected 100% rollout, got ${status.rolloutPercentage}%`);
    }
    console.log('  ✅ LangGraph enabled at 100%\n');

    // Test routing decision
    console.log('📋 Step 2: Test Routing Decision');
    const testStudentId = 'huda-v26-2025';
    const shouldUse = await featureFlagService.shouldUseLangGraph(testStudentId);
    console.log(`  Student ${testStudentId}: ${shouldUse ? '🟢 LangGraph' : '⚪ v30'}`);

    if (!shouldUse) {
      throw new Error('Expected to use LangGraph at 100% rollout');
    }
    console.log('  ✅ Routing to LangGraph\n');

    // Initialize LangGraph
    console.log('📋 Step 3: Initialize LangGraph Orchestrator');
    console.log('  Loading IntelligenceRegistry...');
    IntelligenceRegistry.initialize();
    console.log(`  ✅ Loaded ${IntelligenceRegistry.count()} intelligence types`);

    console.log('  Creating FactStore...');
    const factStore = new FactStore(pool);

    console.log('  Creating LangGraphOrchestrator (stateless mode)...');
    const orchestrator = new LangGraphOrchestrator(
      pool,
      factStore,
      undefined // Disable Redis checkpointing for now
    );
    console.log('  ✅ LangGraph orchestrator ready (stateless mode)\n');

    // Test with real message
    console.log('📋 Step 4: Send Test Message via LangGraph');
    console.log('  Creating test session...');

    const sessionResult = await pool.query(`
      INSERT INTO multiagent_sessions (
        student_id, session_type, status, current_phase, current_agent
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [testStudentId, 'onboarding', 'in_progress', 'assessment', 'assessment-agent-v18']);

    const sessionId = sessionResult.rows[0].id;
    console.log(`  ✅ Session created: ${sessionId}`);

    console.log('  Sending message: "I am in 11th grade"');
    const startTime = Date.now();

    const result = await orchestrator.handleMessage({
      student_id: testStudentId,
      session_id: sessionId,
      message: 'I am in 11th grade'
    });

    const duration = Date.now() - startTime;

    console.log(`  ✅ Response received in ${duration}ms`);
    console.log(`  Response length: ${result.response.length} characters`);
    console.log(`  Confidence: ${result.confidence || 'N/A'}`);
    console.log(`  Intelligence triggered: ${result.intelligence_triggered?.length || 0}`);
    console.log(`  Orchestration: ${result.metadata?.orchestration}`);
    console.log(`  Agent used: ${result.metadata?.agent}\n`);

    console.log('  First 200 chars of response:');
    console.log(`  "${result.response.substring(0, 200)}..."\n`);

    // Cleanup test session
    await pool.query('DELETE FROM multiagent_sessions WHERE id = $1', [sessionId]);

    console.log('✅ LangGraph Live Test PASSED!');
    console.log('\n📊 Summary:');
    console.log('  - Feature flags: 100% rollout');
    console.log('  - Routing: LangGraph active');
    console.log('  - Orchestrator: Working');
    console.log('  - Agent execution: Success');
    console.log('  - Response generation: Success');
    console.log('\n🎉 LangGraph is now LIVE at 100%!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testLive();
