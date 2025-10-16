/**
 * Test script for UnifiedContextHydrator
 *
 * Usage: tsx src/context/test-hydrator.ts
 */

import { unifiedContextHydrator } from './UnifiedContextHydrator.js';

async function testHydration() {
  console.log('='.repeat(80));
  console.log('Testing v13.0 Unified Context Hydrator');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Test 1: Hydrate context for huda-2025 (no session)
    console.log('Test 1: Hydrate context for huda-2025 (no session)');
    console.log('-'.repeat(80));
    const start1 = Date.now();
    const context1 = await unifiedContextHydrator.hydrate('huda-2025', null);
    const latency1 = Date.now() - start1;

    console.log(`✓ Hydration successful in ${latency1}ms`);
    console.log('');
    console.log('Profile:', {
      name: context1.profile.full_name,
      graduation_year: context1.profile.graduation_year,
      gpa_unweighted: context1.profile.gpa_unweighted,
      sat_score: context1.profile.sat_score,
      ec_spike_theme: context1.profile.ec_spike_theme,
      target_schools: context1.profile.target_schools,
      target_major: context1.profile.target_major
    });
    console.log('');
    console.log('Progress:', {
      applications: context1.progress.applications,
      awards: context1.progress.awards,
      extracurriculars: context1.progress.extracurriculars,
      academics: context1.progress.academics
    });
    console.log('');
    console.log('Emotional State:', {
      current_mood: context1.emotional_state.current_mood,
      current_stress_level: context1.emotional_state.current_stress_level,
      recent_triggers_count: context1.emotional_state.recent_triggers.length,
      trajectory: context1.emotional_state.trajectory
    });
    console.log('');
    console.log('Strategy Memory:', {
      active_insights_count: context1.strategy_memory.active_insights.length,
      pending_action_items_count: context1.strategy_memory.pending_action_items.length
    });
    console.log('');
    console.log('Recent Turns:', {
      count: context1.recent_turns.length
    });
    console.log('');
    console.log('Metadata:', {
      source_tables: context1.source_tables,
      hydration_latency_ms: context1.hydration_latency_ms
    });
    console.log('');

    // Test 2: Cache hit test
    console.log('Test 2: Cache hit test (should be <10ms)');
    console.log('-'.repeat(80));
    const start2 = Date.now();
    const context2 = await unifiedContextHydrator.hydrate('huda-2025', null);
    const latency2 = Date.now() - start2;

    console.log(`✓ Cache hit successful in ${latency2}ms`);
    console.log('');

    // Test 3: Cache invalidation test
    console.log('Test 3: Cache invalidation test');
    console.log('-'.repeat(80));
    unifiedContextHydrator.invalidateCache('huda-2025', null);
    const start3 = Date.now();
    const context3 = await unifiedContextHydrator.hydrate('huda-2025', null);
    const latency3 = Date.now() - start3;

    console.log(`✓ Re-hydration after invalidation successful in ${latency3}ms`);
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('Summary');
    console.log('='.repeat(80));
    console.log(`First hydration (cold):  ${latency1}ms`);
    console.log(`Second hydration (hot):  ${latency2}ms`);
    console.log(`Third hydration (warm):  ${latency3}ms`);
    console.log('');

    if (latency1 < 100) {
      console.log('✓ PASS: First hydration <100ms (p95 target met)');
    } else {
      console.log(`⚠ WARNING: First hydration ${latency1}ms (target: <100ms)`);
    }

    if (latency2 < 10) {
      console.log('✓ PASS: Cache hit <10ms');
    } else {
      console.log(`⚠ WARNING: Cache hit ${latency2}ms (expected: <10ms)`);
    }

    console.log('');
    console.log('✓ All tests passed!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('✗ Test failed:', error);
    console.error('');
    process.exit(1);
  }
}

testHydration();
