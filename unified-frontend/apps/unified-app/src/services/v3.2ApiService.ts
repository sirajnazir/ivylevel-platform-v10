/**
 * v3.2 API Service Layer
 * Purpose: Frontend integration for v3.2 infrastructure
 * Features: Evidence chips, HGTI, 412 UX, EQ Layer
 * Date: 2025-10-23
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4101/api';
const ENABLE_RLS_CHECKS = import.meta.env.VITE_ENABLE_RLS_CHECKS === 'true';

// ============================================================================
// TYPES
// ============================================================================

export interface Chip {
  id: string;
  student_id: string;
  kind: 'SQL' | 'RAG' | 'LLM' | 'EQ' | 'NARRATIVE';
  source: Record<string, any>;
  hash: string;
  trace_id: string;
  created_at: string;
}

export interface GrowthEvent {
  id: string;
  student_id: string;
  barrier_type: string;
  trigger: string;
  coach_reflection: string;
  student_reflection: string;
  breakthrough: boolean;
  transformation_delta: number;
  occurred_at: string;
  created_at: string;
}

export interface HGTIScore {
  student_id: string;
  score: number;
  version: number;
  calculated_at: string;
  breakdown: {
    barrier_type: string;
    contribution: number;
  }[];
}

export interface MissingEvidence {
  fact_type: string;
  status: 412;
  message: string;
  missing: string[];
  suggested_actions: {
    action: string;
    description: string;
    endpoint?: string;
  }[];
}

export interface EQPreview {
  original_text: string;
  eq_styled_text: string;
  similarity_score: number;
  fallback_used: boolean;
  audience: 'student' | 'parent';
}

// ============================================================================
// V3.2 API SERVICE
// ============================================================================

class V32ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for RLS validation
    this.client.interceptors.response.use(
      (response) => {
        // RLS validation: check student_id in response matches current student context
        if (ENABLE_RLS_CHECKS && response.data?.student_id) {
          const currentStudentId = sessionStorage.getItem('current_student_id');
          if (currentStudentId && response.data.student_id !== currentStudentId) {
            console.error('[RLS VIOLATION] Cross-student data leak detected', {
              expected: currentStudentId,
              received: response.data.student_id,
              endpoint: response.config.url,
            });
            throw new Error('RLS_VIOLATION: Cross-student data access blocked');
          }
        }
        return response;
      },
      this.handleError
    );
  }

  private handleError = (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 412) {
      // Missing evidence - don't treat as error, return structured response
      return Promise.resolve({
        data: error.response.data,
        status: 412,
      });
    }

    return Promise.reject(error);
  };

  // ============================================================================
  // EVIDENCE CHIPS API
  // ============================================================================

  async getChips(studentId: string, options?: {
    kind?: string;
    limit?: number;
    trace_id?: string;
  }): Promise<Chip[]> {
    const params = new URLSearchParams();
    if (options?.kind) params.append('kind', options.kind);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.trace_id) params.append('trace_id', options.trace_id);

    const response = await this.client.get<Chip[]>(
      `/students/${studentId}/chips?${params.toString()}`
    );
    return response.data;
  }

  async getChipByTraceId(studentId: string, traceId: string): Promise<Chip[]> {
    return this.getChips(studentId, { trace_id: traceId });
  }

  // ============================================================================
  // HGTI (Growth Tracking) API
  // ============================================================================

  async getHGTIScore(studentId: string, mode: 'cached' | 'realtime' = 'cached'): Promise<HGTIScore> {
    const response = await this.client.get<HGTIScore>(
      `/students/${studentId}/hgti?mode=${mode}`
    );
    return response.data;
  }

  async getGrowthEvents(studentId: string, options?: {
    limit?: number;
    barrier_type?: string;
  }): Promise<GrowthEvent[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.barrier_type) params.append('barrier_type', options.barrier_type);

    const response = await this.client.get<GrowthEvent[]>(
      `/students/${studentId}/growth-events?${params.toString()}`
    );
    return response.data;
  }

  // ============================================================================
  // 412 UX (Missing Evidence) API
  // ============================================================================

  async getFact<T>(studentId: string, factType: string): Promise<T | MissingEvidence> {
    try {
      const response = await this.client.get<T>(
        `/students/${studentId}/facts/${factType}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 412) {
        return error.response.data as MissingEvidence;
      }
      throw error;
    }
  }

  async getDeadlineLatest(studentId: string) {
    return this.getFact(studentId, 'deadline_latest');
  }

  async getSATLatest(studentId: string) {
    return this.getFact(studentId, 'sat_latest');
  }

  async getGPAAsOf(studentId: string, date?: string) {
    const endpoint = date 
      ? `gpa_as_of?date=${date}`
      : 'gpa_latest';
    return this.getFact(studentId, endpoint);
  }

  async getAwardNth(studentId: string, n: number) {
    return this.getFact(studentId, `award_nth?n=${n}`);
  }

  // ============================================================================
  // EQ LAYER API (Shadow Mode)
  // ============================================================================

  async previewEQ(options: {
    text: string;
    coach_id: string;
    audience: 'student' | 'parent';
  }): Promise<EQPreview> {
    const response = await this.client.post<EQPreview>(
      `/eq/preview`,
      options
    );
    return response.data;
  }

  async sendMessageWithEQ(options: {
    text: string;
    student_id: string;
    coach_id: string;
    audience: 'student' | 'parent';
    use_eq: boolean;
  }): Promise<{ message: string; eq_applied: boolean }> {
    const response = await this.client.post(
      `/messages/send`,
      options
    );
    return response.data;
  }

  // ============================================================================
  // IVYSCORE API (with HGTI Integration)
  // ============================================================================

  async getIvyScore(studentId: string, version?: number): Promise<{
    total_score: number;
    version: number;
    hgti_contribution: number;
    breakdown: Record<string, number>;
    calculated_at: string;
  }> {
    const versionParam = version || import.meta.env.VITE_IVYSCORE_VERSION || 1;
    const response = await this.client.get(
      `/students/${studentId}/ivyscore?version=${versionParam}`
    );
    return response.data;
  }

  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  async checkHealth(): Promise<{ status: 'ok' | 'degraded'; details: Record<string, any> }> {
    const response = await this.client.get('/health/readiness');
    return response.data;
  }

  async checkLiveness(): Promise<{ status: 'alive' }> {
    const response = await this.client.get('/health/liveness');
    return response.data;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const v32ApiService = new V32ApiService();
export default v32ApiService;
