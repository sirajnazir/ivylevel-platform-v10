/**
 * test-agents.ts
 * Simple test script for agent validation
 * Created: 2025-10-16 (Phase 1, Week 4)
 */

import { agentRegistry } from '../core/AgentRegistry.js';
import { sessionManager } from '../core/SessionManager.js';
import type { AgentExecutionContext } from '../core/types.js';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

async function testAgent(studentId: string, query: string, expectedAgentId?: string) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Query:${colors.reset} "${query}"`);
  console.log(`${colors.bright}Student:${colors.reset} ${studentId}`);

  try {
    // Route query to agent
    const agent = agentRegistry.routeQuery(query);
    const manifest = agent.getManifest();

    console.log(
      `${colors.bright}Routed to:${colors.reset} ${manifest.display_name} (${manifest.agent_id})`
    );

    if (expectedAgentId && manifest.agent_id !== expectedAgentId) {
      console.log(
        `${colors.yellow}⚠ Warning: Expected ${expectedAgentId}, got ${manifest.agent_id}${colors.reset}`
      );
    }

    // Get or create session
    const session = await sessionManager.getOrCreateSession(studentId);

    // Execute agent
    const context: AgentExecutionContext = {
      session,
      user_message: query,
      agent_manifest: manifest,
    };

    const startTime = Date.now();
    const result = await agent.execute(context);
    const duration = Date.now() - startTime;

    // Display results
    console.log(`\n${colors.bright}Response:${colors.reset}`);
    console.log(result.response.answer);

    console.log(`\n${colors.bright}Evidence Chips:${colors.reset}`);
    result.response.chips.forEach((chip, i) => {
      console.log(`  ${i + 1}. [${chip.kind}] ${chip.text}`);
    });

    console.log(`\n${colors.bright}Debug Info:${colors.reset}`);
    console.log(`  Tools called: ${result.response.debug?.tools_called.join(', ') || 'none'}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Data hits: ${result.response.hits.length}`);

    if (result.response.handoff) {
      console.log(
        `\n${colors.yellow}Handoff Suggestion:${colors.reset} → ${result.response.handoff.to_agent}`
      );
      console.log(`  Reason: ${result.response.handoff.reason}`);
    }

    console.log(`\n${colors.green}✓ Test passed${colors.reset}`);
    return true;
  } catch (error: any) {
    console.log(`\n${colors.red}✗ Test failed: ${error.message}${colors.reset}`);
    console.error(error.stack);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  IvyLevel Agent Framework Test Suite${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);

  const testCases = [
    {
      studentId: 'huda-2025',
      query: 'What is my game plan?',
      expectedAgent: 'gameplan-agent',
    },
    {
      studentId: 'huda-2025',
      query: 'Show me my extracurricular activities',
      expectedAgent: 'ecs-agent',
    },
    {
      studentId: 'huda-2025',
      query: 'What awards do I have?',
      expectedAgent: 'awards-agent',
    },
    {
      studentId: 'huda-2025',
      query: 'Which summer programs should I apply to?',
      expectedAgent: 'programs-agent',
    },
    {
      studentId: 'huda-2025',
      query: 'What are my chances at Stanford?',
      expectedAgent: 'college-agent',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const success = await testAgent(
      testCase.studentId,
      testCase.query,
      testCase.expectedAgent
    );

    if (success) {
      passed++;
    } else {
      failed++;
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  }
  console.log(`Total: ${passed + failed}`);
  console.log('');

  // Agent stats
  const stats = agentRegistry.getStats();
  console.log(`${colors.bright}Agent Usage Stats:${colors.reset}`);
  stats.agents.forEach((agent: any) => {
    console.log(
      `  ${agent.agent_id}: ${agent.request_count} requests (${agent.status})`
    );
  });
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
