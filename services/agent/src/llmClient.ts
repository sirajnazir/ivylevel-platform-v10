import OpenAI from 'openai';
import { child } from '@packages/logger';
import { RETRIEVER_URL } from './config';
import { getCanon } from './canon/registry';
import { Pool } from 'pg';

const log = child({ svc: 'llm-client' });

// Database pool for canon queries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
});

// Tool schemas for OpenAI
export const TOOL_SCHEMA = [
  {
    type: 'function',
    function: {
      name: 'getVitals',
      description: 'Get student vitals from database',
      parameters: {
        type: 'object',
        properties: {
          studentId: { type: 'string', description: 'Student ID' }
        },
        required: ['studentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCanon',
      description: 'Get canonical document for a specific key',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Canon key (e.g., APP_FINAL_AWARDS)' },
          studentId: { type: 'string', description: 'Student ID' }
        },
        required: ['key', 'studentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchExec',
      description: 'Search execution intelligence documents',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          filter: { type: 'object', description: 'Filter criteria' },
          k: { type: 'integer', description: 'Number of results to return', default: 4 }
        },
        required: ['q']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchAppDoc',
      description: 'Search application documents',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          filter: { type: 'object', description: 'Filter criteria' },
          k: { type: 'integer', description: 'Number of results to return', default: 4 }
        },
        required: ['q']
      }
    }
  }
];

// Types
type Msg = { 
  role: 'system' | 'user' | 'assistant' | 'tool'; 
  content: any; 
  name?: string; 
  tool_call_id?: string;
  tool_calls?: any[];
};

// Fetch vitals from database
async function fetchVitals(studentId: string): Promise<any> {
  try {
    const result = await pool.query(
      'SELECT vitals FROM student_state WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0]?.vitals || {};
  } catch (error) {
    log.error({ error }, "Failed to fetch vitals");
    return {};
  }
}

// Fetch canon document
async function fetchCanonDoc(key: string, studentId: string): Promise<any> {
  try {
    const result = await pool.query(
      'SELECT * FROM canon WHERE key = $1 AND student_id = $2',
      [key, studentId]
    );
    return result.rows[0];
  } catch (error) {
    log.error({ error, key }, "Failed to fetch canon doc");
    return null;
  }
}

// Search function
async function search(namespace: string, params: any): Promise<any> {
  try {
    const response = await fetch(`${RETRIEVER_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: params.q,
        k: params.k || 4,
        filter: { ...params.filter, kind: namespace === 'exec' ? 'EXEC-INTEL' : 'APP-DOC' },
        student: params.studentId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Retriever error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    log.error({ error, namespace, params }, 'Search failed');
    return { error: `Search failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Run tool by name
async function runToolByName(name: string, input: any, context: { studentId?: string }): Promise<any> {
  log.info({ tool: name, input }, 'Running tool');
  
  switch (name) {
    case 'getVitals':
      const vitals = await fetchVitals(input.studentId || context.studentId);
      return vitals;
      
    case 'getCanon':
      const canonDoc = await fetchCanonDoc(input.key, input.studentId || context.studentId);
      return canonDoc || { error: `Canon document not found for key: ${input.key}` };
      
    case 'searchExec':
      return await search('exec', { ...input, studentId: context.studentId });
      
    case 'searchAppDoc':
      return await search('appdoc', { ...input, studentId: context.studentId });
      
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Tool-safe LLM call with automatic tool handling
export async function llmWithTools(
  messages: Msg[], 
  tools: any[] = TOOL_SCHEMA,
  context: { studentId?: string; model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<{ messages: Msg[], text: string }> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  // Keep calling the model until it stops asking for tools
  while (true) {
    log.info({ messageCount: messages.length, hasTools: tools.length > 0 }, 'Calling LLM');
    
    const response = await openai.chat.completions.create({
      model: context.model || process.env.FINETUNED_JENNY_MODEL || 'gpt-4o-mini',
      messages: messages as any,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: context.temperature,
      max_tokens: context.maxTokens
    });
    
    const message = response.choices[0].message;
    
    // Add assistant message to history
    if (message.content || message.tool_calls) {
      messages.push({
        role: 'assistant',
        content: message.content || null,
        tool_calls: message.tool_calls
      } as Msg);
    }
    
    // Check if there are tool calls
    if (!message.tool_calls || message.tool_calls.length === 0) {
      // No tools requested → we're done
      return { messages, text: message.content || '' };
    }
    
    // Handle each tool call
    for (const toolCall of message.tool_calls) {
      const { id: tool_call_id, function: fn } = toolCall;
      const { name, arguments: args } = fn;
      
      let input;
      try {
        input = JSON.parse(args);
      } catch (e) {
        input = {};
        log.error({ error: e, args }, 'Failed to parse tool arguments');
      }
      
      const result = await runToolByName(name, input, context);
      
      // Push tool result message
      messages.push({
        role: 'tool',
        name,
        tool_call_id,
        content: JSON.stringify(result)
      } as Msg);
      
      log.info({ tool: name, resultSize: JSON.stringify(result).length }, 'Tool result added');
    }
    
    // Loop continues to call LLM again with tool results
  }
}

// Import UserIntent type
export type UserIntent = {
  topic?: "awards" | "ecs" | "summer" | "sat" | "gpa" | "college-list" | "other";
  timeframe?: "initial" | "actual" | "historical" | "unspecified";
  wantNames?: boolean;
};

// Helper to determine if tools should be used
export function shouldUseTools(intent: UserIntent | string, message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Handle string intent for backward compatibility
  const intentStr = typeof intent === 'string' ? intent : intent.topic || 'other';
  
  // Simple factual questions about vitals don't need tools if we already have the data
  if ((intentStr === 'factual' || intentStr === 'sat' || intentStr === 'gpa') && (
    lowerMessage.includes('what is my') ||
    lowerMessage.includes("what's my") ||
    lowerMessage.includes('final sat') ||
    lowerMessage.includes('when did')
  )) {
    // These can often be answered directly from vitals without tool calls
    return false;
  }
  
  // Complex queries or searches need tools
  if (
    lowerMessage.includes('search') ||
    lowerMessage.includes('find') ||
    lowerMessage.includes('remind me') ||
    lowerMessage.includes('anchors') ||
    lowerMessage.includes('plan')
  ) {
    return true;
  }
  
  // Default to using tools for safety
  return true;
}