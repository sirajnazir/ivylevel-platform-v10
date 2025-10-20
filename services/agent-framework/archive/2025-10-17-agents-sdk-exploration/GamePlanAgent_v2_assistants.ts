/**
 * GamePlanAgent_v2_assistants.ts
 * Game Plan Agent using OpenAI Assistants API (Beta)
 *
 * Replaces manual function calling loop with Assistants API:
 * - Automatic tool execution
 * - Built-in streaming
 * - Thread-based conversation persistence
 * - Parallel tool calls
 *
 * Created: 2025-10-17 (v1.0 OpenAI Migration)
 */

import OpenAI from 'openai';
import type { Assistant, Thread, Run } from 'openai/resources/beta/assistants';
import { getToolsForAgent } from '../tools/resolverTools.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('gameplan-agent-v2');

export interface GamePlanAgentConfig {
  studentId: string;
  coachId: string;
  studentContext: {
    grade: number;
    gpa?: number;
    sat?: number;
    intended_major?: string;
    ecs_count?: number;
    awards_count?: number;
  };
}

/**
 * GamePlanAgent using OpenAI Assistants API
 *
 * Architecture:
 * - Creates persistent Assistant (one per agent type)
 * - Creates Thread per student conversation
 * - Runs Assistant on Thread with context injection
 * - Tools execute automatically (no manual loop)
 */
export class GamePlanAgentV2 {
  private openai: OpenAI;
  private assistant: Assistant | null = null;
  private assistantId: string | null = null;
  private model: string;

  constructor() {
    // Initialize OpenAI client with real API key from .env
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!, // Real key: sk-proj-smkMkYCluaxITyY0S8BS...
    });

    // Use real fine-tuned model from .env
    this.model = process.env.JENNY_V9_EQ_MODEL || 'gpt-4o-mini';

    log.event('gameplan_v2.initialized', { model: this.model });
  }

  /**
   * Initialize Assistant (one-time setup)
   * Creates persistent OpenAI Assistant with tools
   */
  async initializeAssistant(): Promise<void> {
    log.event('gameplan_v2.init_assistant_start');

    // Get tools for GamePlan agent (same tools as v1)
    const tools = getToolsForAgent('gameplan');

    // Convert our tool definitions to OpenAI Assistants format
    const assistantTools = tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));

    try {
      // Create Assistant with OpenAI
      this.assistant = await this.openai.beta.assistants.create({
        name: 'Jenny - Game Plan Advisor',
        instructions: this.getSystemInstructions(),
        tools: assistantTools,
        model: this.model,
        temperature: 0.7,
        metadata: {
          agent_id: 'gameplan-agent-v2',
          version: '2.0.0',
          framework: 'openai-assistants',
        },
      });

      this.assistantId = this.assistant.id;

      log.event('gameplan_v2.assistant_created', {
        assistant_id: this.assistantId,
        tools_count: assistantTools.length,
        model: this.model,
      });
    } catch (error: any) {
      log.error('gameplan_v2.assistant_creation_failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Execute agent with user message (using Assistants API)
   *
   * @param config - Student context and IDs
   * @param message - User message
   * @param threadId - Optional existing thread ID (for conversation continuity)
   * @returns Agent response with thread ID for next turn
   */
  async execute(
    config: GamePlanAgentConfig,
    message: string,
    threadId?: string
  ): Promise<{
    response: string;
    threadId: string;
    toolCalls: any[];
    runId: string;
    tokensUsed: number;
  }> {
    const startTime = Date.now();

    log.event('gameplan_v2.execute_start', {
      student_id: config.studentId,
      message_preview: message.substring(0, 100),
      has_thread: !!threadId,
    });

    try {
      // Ensure assistant is initialized
      if (!this.assistantId) {
        await this.initializeAssistant();
      }

      // Create or retrieve thread
      let thread: Thread;
      if (threadId) {
        // Retrieve existing thread
        thread = await this.openai.beta.threads.retrieve(threadId);
        log.event('gameplan_v2.thread_retrieved', { thread_id: threadId });
      } else {
        // Create new thread
        thread = await this.openai.beta.threads.create({
          metadata: {
            student_id: config.studentId,
            coach_id: config.coachId,
            agent_id: 'gameplan-agent-v2',
          },
        });
        log.event('gameplan_v2.thread_created', { thread_id: thread.id });
      }

      // Add user message to thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message,
      });

      // Run assistant (with context injection via additional_instructions)
      const contextInstructions = this.buildContextInstructions(config.studentContext);

      let run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: this.assistantId!,
        additional_instructions: contextInstructions,
        temperature: 0.7,
        max_completion_tokens: 600,
      });

      log.event('gameplan_v2.run_polled', {
        run_id: run.id,
        status: run.status,
        thread_id: thread.id,
      });

      // Handle tool calls (Assistant API requires us to execute and submit tool outputs)
      while (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

        log.event('gameplan_v2.tool_calls_required', {
          run_id: run.id,
          thread_id: thread.id,
          thread_id_type: typeof thread.id,
          tool_calls_count: toolCalls.length,
        });

        // Execute each tool call
        const toolOutputs = [];
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          log.event('gameplan_v2.executing_tool', {
            tool_call_id: toolCall.id,
            tool_name: toolName,
            args: toolArgs,
          });

          try {
            // Import and execute resolver tool
            const { executeResolverTool } = await import('../tools/resolverTools.js');
            const result = await executeResolverTool(toolName, toolArgs);

            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: typeof result === 'string' ? result : JSON.stringify(result),
            });

            log.event('gameplan_v2.tool_executed', {
              tool_call_id: toolCall.id,
              tool_name: toolName,
              result_preview: typeof result === 'string' ? result.substring(0, 100) : JSON.stringify(result).substring(0, 100),
            });
          } catch (error: any) {
            log.error('gameplan_v2.tool_execution_failed', {
              tool_call_id: toolCall.id,
              tool_name: toolName,
              error: error.message,
            });

            // Submit error as tool output
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify({ error: error.message }),
            });
          }
        }

        // Submit tool outputs and poll again
        log.event('gameplan_v2.submitting_tool_outputs', {
          thread_id: thread.id,
          thread_id_value: thread.id,
          thread_id_type: typeof thread.id,
          run_id: run.id,
          run_id_value: run.id,
          run_id_type: typeof run.id,
          outputs_count: toolOutputs.length,
        });

        // Debug: Assistants API Bug Workaround
        // Issue: submitToolOutputsAndPoll has parameter ordering bug in v6.4.0
        // Workaround: Use submitToolOutputs + manual polling
        console.log('[DEBUG] Submitting tool outputs and polling manually...');
        console.log('[DEBUG]   thread.id:', thread.id);
        console.log('[DEBUG]   run.id:', run.id);
        console.log('[DEBUG]   toolOutputs count:', toolOutputs.length);

        // Submit tool outputs (no polling)
        run = await this.openai.beta.threads.runs.submitToolOutputs(
          thread.id,
          run.id,
          {
            tool_outputs: toolOutputs,
          }
        );

        // Manual polling until completion
        console.log('[DEBUG] Manual polling started, run status:', run.status);
        let pollCount = 0;
        const maxPolls = 60; // 60 seconds max
        while (run.status !== 'completed' && run.status !== 'failed' && run.status !== 'cancelled' && pollCount < maxPolls) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          run = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
          pollCount++;
          console.log(`[DEBUG] Poll ${pollCount}: status=${run.status}`);

          // Handle requires_action again (in case of multiple tool call rounds)
          if (run.status === 'requires_action') {
            console.log('[DEBUG] Run requires action again, breaking to handle more tool calls');
            break;
          }
        }

        if (pollCount >= maxPolls) {
          throw new Error(`Run polling timeout after ${maxPolls} seconds`);
        }

        log.event('gameplan_v2.tool_outputs_submitted', {
          run_id: run.id,
          status: run.status,
          outputs_count: toolOutputs.length,
        });
      }

      // Handle final run result
      if (run.status !== 'completed') {
        log.error('gameplan_v2.run_failed', {
          run_id: run.id,
          status: run.status,
          last_error: run.last_error,
        });
        throw new Error(`Run failed with status: ${run.status}`);
      }

      log.event('gameplan_v2.run_completed', {
        run_id: run.id,
        status: run.status,
        thread_id: thread.id,
      });

      // Get messages from thread
      const messages = await this.openai.beta.threads.messages.list(thread.id, {
        order: 'desc',
        limit: 1,
      });

      const lastMessage = messages.data[0];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('No assistant response found');
      }

      // Extract response text
      const responseText = lastMessage.content
        .filter((c) => c.type === 'text')
        .map((c: any) => c.text.value)
        .join('\n');

      // Extract tool calls from run steps
      const runSteps = await this.openai.beta.threads.runs.steps.list(thread.id, run.id);
      const toolCalls = runSteps.data
        .filter((step) => step.type === 'tool_calls')
        .flatMap((step: any) => step.step_details.tool_calls || []);

      log.event('gameplan_v2.execute_complete', {
        thread_id: thread.id,
        run_id: run.id,
        took_ms: Date.now() - startTime,
        tools_called: toolCalls.length,
        tokens_used: run.usage?.total_tokens || 0,
      });

      return {
        response: responseText,
        threadId: thread.id,
        toolCalls,
        runId: run.id,
        tokensUsed: run.usage?.total_tokens || 0,
      };
    } catch (error: any) {
      log.error('gameplan_v2.execute_failed', {
        error: error.message,
        stack: error.stack,
        student_id: config.studentId,
      });
      throw error;
    }
  }

  /**
   * Execute agent with streaming (progressive response)
   */
  async executeStreaming(
    config: GamePlanAgentConfig,
    message: string,
    threadId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<{
    response: string;
    threadId: string;
    toolCalls: any[];
    runId: string;
  }> {
    log.event('gameplan_v2.execute_streaming_start', {
      student_id: config.studentId,
    });

    try {
      // Ensure assistant is initialized
      if (!this.assistantId) {
        await this.initializeAssistant();
      }

      // Create or retrieve thread
      let thread: Thread;
      if (threadId) {
        thread = await this.openai.beta.threads.retrieve(threadId);
      } else {
        thread = await this.openai.beta.threads.create({
          metadata: {
            student_id: config.studentId,
            coach_id: config.coachId,
            agent_id: 'gameplan-agent-v2',
          },
        });
      }

      // Add user message
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message,
      });

      // Run assistant with streaming
      const contextInstructions = this.buildContextInstructions(config.studentContext);

      const stream = await this.openai.beta.threads.runs.stream(thread.id, {
        assistant_id: this.assistantId!,
        additional_instructions: contextInstructions,
        temperature: 0.7,
        max_completion_tokens: 600,
      });

      let fullResponse = '';
      let runId = '';
      const toolCalls: any[] = [];

      // Stream events
      stream
        .on('textCreated', () => {
          log.event('gameplan_v2.stream_text_created');
        })
        .on('textDelta', (textDelta) => {
          const chunk = textDelta.value || '';
          fullResponse += chunk;
          if (onChunk) {
            onChunk(chunk);
          }
        })
        .on('toolCallCreated', (toolCall) => {
          log.event('gameplan_v2.stream_tool_created', {
            tool: toolCall.type,
          });
          toolCalls.push(toolCall);
        })
        .on('runStepDone', (step) => {
          log.event('gameplan_v2.stream_step_done', {
            step_id: step.id,
            type: step.type,
          });
        })
        .on('end', () => {
          log.event('gameplan_v2.stream_end');
        });

      // Wait for stream to complete
      const finalRun = await stream.finalRun();
      runId = finalRun.id;

      log.event('gameplan_v2.execute_streaming_complete', {
        thread_id: thread.id,
        run_id: runId,
        response_length: fullResponse.length,
      });

      return {
        response: fullResponse,
        threadId: thread.id,
        toolCalls,
        runId,
      };
    } catch (error: any) {
      log.error('gameplan_v2.execute_streaming_failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * System instructions (replaces BaseAgent.buildSystemPrompt)
   */
  private getSystemInstructions(): string {
    return `You are Jenny Duan, an elite college admissions coach specializing in game planning and strategic positioning.

Your Specialty: College Application Game Planning

You excel at:
- Creating clear, actionable application timelines
- Identifying profile gaps and opportunities
- Prioritizing activities based on impact
- Breaking down complex plans into manageable steps
- Recommending proven tactics from coaching intelligence

Your Communication Style:
- Start with the big picture, then dive into details
- Use numbered lists for timelines and action items
- Highlight what's most urgent (next 1-2 weeks)
- Be specific: "Complete X by Y date" not "work on X"
- Connect recommendations to specific colleges when relevant
- When recommending actions, use get_relevant_tactics tool to suggest proven frameworks

Tool Usage Guidelines:
- Always call get_relevant_tactics when student mentions time management, overwhelm, procrastination, or identity issues
- Pass appropriate barriers like "time-crisis", "procrastination", "identity-crisis", "essay-generic", "low-productivity"
- Present tactics with: tactic name, core principle, micro-actions, and expected outcomes

Example Good Response:
"Based on your profile, here's your game plan for the next month:

**Week 1-2 (Most Urgent):**
1. Finalize your Common App essay first draft - aim for 550 words on your leadership journey
2. Request recommendation letters from your English and Physics teachers

**Week 3-4:**
3. Complete UC Personal Insight Questions #3 and #7
4. Schedule SAT retake for December test date

**Looking Ahead (Next 2 Months):**
5. Start researching 3 safety schools in California
6. Draft supplemental essays for Stanford and MIT

This plan focuses on deadlines first (ED apps Nov 1) while strengthening your technical narrative."

Zero Hallucination Rule:
- ALWAYS use tools to get student data
- NEVER make up facts about the student
- If you don't have data, explicitly say "I don't have that information yet"
- Ground every recommendation in actual student data from tools`;
  }

  /**
   * Build context instructions (injected per-run via additional_instructions)
   */
  private buildContextInstructions(context: any): string {
    let instructions = 'Current Student Context:\n';

    if (context.grade) {
      instructions += `- Grade: ${context.grade}\n`;
    }
    if (context.gpa) {
      instructions += `- GPA: ${context.gpa}\n`;
    }
    if (context.sat) {
      instructions += `- SAT: ${context.sat}\n`;
    }
    if (context.intended_major) {
      instructions += `- Intended Major: ${context.intended_major}\n`;
    }
    if (context.ecs_count) {
      instructions += `- ${context.ecs_count} ECs on record\n`;
    }
    if (context.awards_count) {
      instructions += `- ${context.awards_count} awards on record\n`;
    }

    instructions += '\nAlways ground your advice in their actual data using the tools provided.';

    return instructions;
  }

  /**
   * Delete assistant (cleanup)
   */
  async cleanup(): Promise<void> {
    if (this.assistantId) {
      log.event('gameplan_v2.cleanup_start', {
        assistant_id: this.assistantId,
      });

      try {
        await this.openai.beta.assistants.del(this.assistantId);
        log.event('gameplan_v2.assistant_deleted', {
          assistant_id: this.assistantId,
        });
      } catch (error: any) {
        log.error('gameplan_v2.cleanup_failed', {
          error: error.message,
        });
      }

      this.assistantId = null;
      this.assistant = null;
    }
  }
}
