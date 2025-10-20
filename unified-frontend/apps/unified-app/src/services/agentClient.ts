/**
 * Agent Client - Integrates with all 9 AI Agents
 * Backend: services/agent-framework/src/routes/agents.ts
 */

import { agentFrameworkAuth } from './agentFrameworkAuth';

const API_BASE_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:4101/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  student_id: string;
  message: string;
  session_id?: string;
  agent_id?: string;
}

export interface ChatResponse {
  answer: string;
  session_id: string;
  agent_used: string;
  tools_called?: string[];
  chips?: Array<{ kind: string; text: string }>;
  debug?: {
    intent: string;
    confidence: number;
    route: string;
    tools_called: string[];
    latency_ms: number;
  };
}

export interface AgentManifest {
  agent_id: string;
  display_name: string;
  category: string;
  tools: string[];
  intents: Array<{
    intent_id: string;
    category: string;
    patterns: string[];
    priority: number;
  }>;
}

class AgentClientService {
  /**
   * Send chat message to agents
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await agentFrameworkAuth.authenticatedFetch(
      `${API_BASE_URL}/agents/chat`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Chat request failed');
    }

    return response.json();
  }

  /**
   * List all available agents
   */
  async listAgents(): Promise<AgentManifest[]> {
    const response = await agentFrameworkAuth.authenticatedFetch(
      `${API_BASE_URL}/agents/list`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch agents list');
    }

    const data = await response.json();
    return data.agents;
  }

  /**
   * Get sessions for a student
   */
  async getSessions(studentId: string) {
    const response = await agentFrameworkAuth.authenticatedFetch(
      `${API_BASE_URL}/agents/sessions/${studentId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }

    const data = await response.json();
    return data.sessions;
  }
}

export const agentClient = new AgentClientService();
