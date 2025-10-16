/**
 * BaseAgent.ts
 * Base class for all IvyLevel agents
 * Uses OpenAI function calling for zero-hallucination tool execution
 * Created: 2025-10-16 (Phase 1, Week 2)
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import type {
  AgentManifest,
  AgentExecutionContext,
  AgentExecutionResult,
  AgentResponse,
  IvyLevelSession,
  ToolCall,
} from './types.js';
import { executeResolverTool } from '../tools/resolverTools.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('base-agent');

/**
 * BaseAgent - Foundation for all IvyLevel agents
 * Provides:
 * - OpenAI function calling integration
 * - Session management
 * - Tool execution
 * - Zero-hallucination data access
 * - Evidence tracking
 */
export abstract class BaseAgent {
  protected openai: OpenAI;
  protected manifest: AgentManifest;
  protected model: string;

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;

    // Initialize OpenAI client with API key from env
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use fine-tuned model from env or manifest override
    this.model = manifest.model || process.env.JENNY_V9_EQ_MODEL || 'gpt-4o-mini';

    log.event('agent.initialized', {
      agent_id: manifest.agent_id,
      model: this.model,
      tools_count: manifest.tools.length,
    });
  }

  /**
   * Execute agent with user message
   * Main entry point for agent execution
   */
  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    log.event('agent.execute_start', {
      agent_id: this.manifest.agent_id,
      student_id: context.session.student_id,
      message_preview: context.user_message.substring(0, 100),
    });

    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(context);

      // Build messages array (system + conversation history + current message)
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...context.session.messages,
        { role: 'user', content: context.user_message },
      ];

      // Call OpenAI with function calling
      const toolCalls: ToolCall[] = [];
      let finalResponse = await this.callOpenAI(messages, toolCalls);

      // Build agent response
      const response: AgentResponse = {
        answer: finalResponse,
        chips: this.extractChips(toolCalls),
        hits: this.extractHits(toolCalls),
        debug: {
          agent_id: this.manifest.agent_id,
          tools_called: toolCalls.map((t) => t.tool_name),
          took_ms: Date.now() - startTime,
          model: this.model,
        },
      };

      // Update session
      const updatedSession = this.updateSession(context.session, context.user_message, response);

      log.event('agent.execute_complete', {
        agent_id: this.manifest.agent_id,
        tools_called: toolCalls.length,
        took_ms: Date.now() - startTime,
      });

      return {
        response,
        session: updatedSession,
        execution_time_ms: Date.now() - startTime,
        tokens_used: 0,  // TODO: Track from OpenAI response
      };
    } catch (error: any) {
      log.error('agent.execute_error', error, {
        agent_id: this.manifest.agent_id,
        student_id: context.session.student_id,
      });

      // Return error response
      return {
        response: {
          answer: `I encountered an error: ${error.message}. Please try rephrasing your question.`,
          chips: [{ kind: 'evidence', text: 'error' }],
          hits: [],
        },
        session: context.session,
        execution_time_ms: Date.now() - startTime,
        tokens_used: 0,
      };
    }
  }

  /**
   * Call OpenAI with function calling
   * Handles tool execution loop
   */
  protected async callOpenAI(
    messages: ChatCompletionMessageParam[],
    toolCalls: ToolCall[]
  ): Promise<string> {
    let currentMessages = [...messages];
    let iterations = 0;
    const maxIterations = 5;  // Prevent infinite loops

    while (iterations < maxIterations) {
      iterations++;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: currentMessages,
        tools: this.manifest.tools,
        tool_choice: 'auto',
        temperature: this.manifest.temperature || 0.7,
        max_tokens: this.manifest.max_tokens || 500,
      });

      const message = completion.choices[0].message;

      // If no tool calls, return the response
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || 'No response generated.';
      }

      // Execute tool calls
      currentMessages.push(message);

      for (const toolCall of message.tool_calls) {
        const toolStartTime = Date.now();
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        log.event('agent.tool_call', {
          agent_id: this.manifest.agent_id,
          tool_name: toolName,
          arguments: args,
        });

        try {
          // Execute the tool
          const result = await executeResolverTool(toolName, args);

          // Record tool call
          toolCalls.push({
            tool_name: toolName,
            arguments: args,
            result,
            took_ms: Date.now() - toolStartTime,
          });

          // Add tool response to messages
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });

          log.event('agent.tool_success', {
            agent_id: this.manifest.agent_id,
            tool_name: toolName,
            took_ms: Date.now() - toolStartTime,
          });
        } catch (error: any) {
          log.error('agent.tool_error', error, {
            agent_id: this.manifest.agent_id,
            tool_name: toolName,
          });

          // Record error
          toolCalls.push({
            tool_name: toolName,
            arguments: args,
            error: error.message,
            took_ms: Date.now() - toolStartTime,
          });

          // Add error response to messages
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error executing tool: ${error.message}`,
          });
        }
      }

      // Continue loop to get final response from model
    }

    // If we hit max iterations, return what we have
    return 'I processed your request but reached the iteration limit. Please try a simpler query.';
  }

  /**
   * Build system prompt for the agent
   * Override in subclasses to customize
   */
  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const studentContext = context.session.context;

    return `You are ${this.manifest.display_name}, ${this.manifest.tagline}.

Student Context:
- Name: ${studentContext.student_name || 'Student'}
- Student ID: ${studentContext.student_id}
- Grade: ${studentContext.grade || 'Unknown'}
${studentContext.high_school ? `- High School: ${studentContext.high_school}` : ''}

Your role: ${this.manifest.jtbd.student}

Guidelines:
- Use the provided tools to access student data
- ALWAYS cite your sources using evidence chips
- Be warm, encouraging, and actionable
- Focus on specific next steps
- Never make up data - only use what the tools return

Available tools: ${this.manifest.tools.map((t) => t.function.name).join(', ')}`;
  }

  /**
   * Extract evidence chips from tool calls
   */
  protected extractChips(toolCalls: ToolCall[]) {
    const chips: Array<{ kind: 'evidence' | 'tool' | 'source'; text: string }> = [];

    for (const toolCall of toolCalls) {
      if (toolCall.result && toolCall.result.chips) {
        chips.push(...toolCall.result.chips);
      } else {
        chips.push({ kind: 'tool', text: toolCall.tool_name });
      }
    }

    return chips;
  }

  /**
   * Extract data hits from tool calls
   */
  protected extractHits(toolCalls: ToolCall[]): any[] {
    const hits: any[] = [];

    for (const toolCall of toolCalls) {
      if (toolCall.result && toolCall.result.hits) {
        hits.push(...toolCall.result.hits);
      }
    }

    return hits;
  }

  /**
   * Update session with new message and response
   */
  protected updateSession(
    session: IvyLevelSession,
    userMessage: string,
    response: AgentResponse
  ): IvyLevelSession {
    return {
      ...session,
      messages: [
        ...session.messages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response.answer },
      ],
      last_active: new Date(),
      turn_count: session.turn_count + 1,
    };
  }

  /**
   * Get agent manifest
   */
  getManifest(): AgentManifest {
    return this.manifest;
  }
}
