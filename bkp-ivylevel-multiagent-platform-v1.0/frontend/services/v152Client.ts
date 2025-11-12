/**
 * v15.2 Framework Integration Client
 * Backend: services/agent-framework/src/routes/v15.2.ts
 */

import { agentFrameworkAuth } from './agentFrameworkAuth';

const API_BASE_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:4101';

export interface V152ChatRequest {
  student_id: string;
  session_id: string;
  query: string;
  student_context?: {
    student_id: string;
    archetype: string;
    grade: number;
    burnout_level: number;
    recent_topics?: string[];
  };
}

export interface V152ChatResponse {
  success: boolean;
  data: {
    response: string;
    intent: string;
    confidence: number;
    reflection_quality: number;
    processing_time_ms: number;
    trace_id: string;
  };
}

export interface V152Analytics {
  total_chains: number;
  success_rate: number;
  avg_duration_ms: number;
  avg_intent_confidence: number;
  avg_reflection_quality: number;
}

export interface V152Health {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: boolean;
    intentRouter: boolean;
    contextPipeline: boolean;
    reflector: boolean;
  };
}

class V152ClientService {
  /**
   * Send chat message via v15.2 LCEL orchestration
   */
  async chat(request: V152ChatRequest): Promise<V152ChatResponse> {
    const response = await agentFrameworkAuth.authenticatedFetch(
      `${API_BASE_URL}/api/v15.2/chat`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'v15.2 chat request failed');
    }

    return response.json();
  }

  /**
   * Get analytics for a student
   */
  async getAnalytics(studentId: string): Promise<V152Analytics> {
    const response = await agentFrameworkAuth.authenticatedFetch(
      `${API_BASE_URL}/api/v15.2/analytics/${studentId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch v15.2 analytics');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<V152Health> {
    const response = await agentFrameworkAuth.authenticatedFetch(
      `${API_BASE_URL}/api/v15.2/health`
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get version info
   */
  async getVersion() {
    const response = await agentFrameworkAuth.authenticatedFetch(
      `${API_BASE_URL}/api/v15.2/version`
    );

    const data = await response.json();
    return data.data;
  }
}

export const v152Client = new V152ClientService();
