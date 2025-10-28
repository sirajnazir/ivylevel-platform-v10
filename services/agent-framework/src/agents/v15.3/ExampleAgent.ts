/**
 * v15.3 Example Agent - Demonstrates Universal Agent Pattern
 *
 * Date: 2025-10-28
 * Purpose: Show how to configure Universal Agent for a specific domain
 * Architecture: Uses AgentBuilder fluent API
 *
 * @module agents/v15.3/ExampleAgent
 */

import {
  AgentBuilder,
  IntentPerceptor,
  CoachingContextLoader,
  DefaultToolExecutor,
  ResponseSynthesizer,
  ResponseVerifier,
  InMemoryStateStore,
  EchoTool,
} from '../../primitives';

/**
 * Create an Example Agent using Universal Agent architecture
 *
 * This demonstrates the power of the Universal Agent pattern:
 * - Same base class for all agents
 * - Different configurations for different domains
 * - Composable primitives
 */
export function createExampleAgent() {
  // Step 1: Create and configure primitive components
  const perceptor = new IntentPerceptor();
  const contextLoader = new CoachingContextLoader(null); // TODO: Pass actual DB
  const toolExecutor = new DefaultToolExecutor();
  const synthesizer = new ResponseSynthesizer();
  const verifier = new ResponseVerifier();
  const stateStore = new InMemoryStateStore();

  // Step 2: Register tools
  toolExecutor.registerTool(new EchoTool());

  // Step 3: Build agent using fluent API
  const agent = new AgentBuilder('example_agent')
    .withPerceptor(perceptor)
    .withContextLoader(contextLoader)
    .withToolExecutor(toolExecutor)
    .withSynthesizer(synthesizer)
    .withVerifier(verifier)
    .withStateStore(stateStore)
    .build();

  return agent;
}

/**
 * Example usage:
 *
 * ```typescript
 * const agent = createExampleAgent();
 * const result = await agent.execute("Hello, I need help with my college application");
 * console.log(result.output);
 * ```
 */
