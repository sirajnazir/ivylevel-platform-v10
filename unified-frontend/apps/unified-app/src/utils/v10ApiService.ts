/**
 * v10.0 API Service
 * Provides typed interfaces for all v10.0 backend endpoints
 * Backend server: http://localhost:8787
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  due_date?: string;
  completed_at?: string;
  week_number?: number;
  completion_proof?: Record<string, any>;
  coach_feedback?: string;
  is_overdue?: boolean;
}

export interface TaskStats {
  total_tasks: number;
  completed: number;
  in_progress: number;
  not_started: number;
  overdue: number;
  completion_rate: number;
  avg_completion_days?: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  week_number?: number;
  event_type: string;
  icon?: string;
  color?: string;
  importance?: string;
  evidence_chips?: any[];
  proof_url?: string;
}

export interface TimelineSummary {
  total_events: number;
  by_type: {
    growth_events: number;
    academic: number;
    awards: number;
    programs: number;
    decisions: number;
  };
  journey_start?: string;
  journey_end?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'abandoned';
  start_date?: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  milestones?: any[];
  metrics?: Record<string, any>;
  files?: any[];
  external_links?: any[];
  used_in_applications?: boolean;
  progress: number;
}

export interface Application {
  college_name: string;
  decision_plan: string;
  decision_result?: string;
  application_status?: string;
  submission_date?: string;
  documents_checklist?: Record<string, any>;
  essays_required?: Record<string, any>;
  financial_aid?: {
    amount?: number;
    details?: Record<string, any>;
  };
}

export interface ApplicationStats {
  total_colleges: number;
  submitted: number;
  pending: number;
  by_plan: {
    rea: number;
    ea: number;
    ed: number;
    rd: number;
  };
  decisions: {
    accepted: number;
    waitlisted: number;
    rejected: number;
    pending: number;
  };
  total_aid_offered: number;
}

export interface Essay {
  id: string;
  essay_type: string;
  prompt?: string;
  draft_version: number;
  content?: string;
  word_count: number;
  status: string;
  feedback?: any[];
  college_name?: string;
}

// ============================================================================
// API SERVICE CLASS
// ============================================================================

class V10ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // --------------------------------------------------------------------------
  // TASKS API
  // --------------------------------------------------------------------------

  async getTasks(
    studentId: string,
    params?: {
      status?: string;
      category?: string;
      overdue_only?: boolean;
      limit?: number;
    }
  ): Promise<{ tasks: Task[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.overdue_only) queryParams.append('overdue_only', 'true');
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.baseUrl}/students/${studentId}/tasks?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    return response.json();
  }

  async createTask(
    studentId: string,
    task: {
      title: string;
      description?: string;
      priority?: string;
      category?: string;
      due_date?: string;
      week_number?: number;
    }
  ): Promise<{ task: Task; message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error(`Failed to create task: ${response.statusText}`);
    return response.json();
  }

  async updateTask(
    studentId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<{ task: Task; message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`Failed to update task: ${response.statusText}`);
    return response.json();
  }

  async getTaskStats(studentId: string): Promise<TaskStats> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/tasks/stats`);
    if (!response.ok) throw new Error(`Failed to fetch task stats: ${response.statusText}`);
    return response.json();
  }

  // --------------------------------------------------------------------------
  // TIMELINE API
  // --------------------------------------------------------------------------

  async getTimeline(
    studentId: string,
    params?: {
      event_type?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
    }
  ): Promise<{ events: TimelineEvent[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.event_type) queryParams.append('event_type', params.event_type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.baseUrl}/students/${studentId}/timeline?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch timeline: ${response.statusText}`);
    return response.json();
  }

  async createTimelineEvent(
    studentId: string,
    event: {
      title: string;
      event_date: string;
      event_type: string;
      description?: string;
      icon?: string;
      color?: string;
      importance?: string;
      evidence_chips?: any[];
      proof_url?: string;
    }
  ): Promise<{ event: TimelineEvent; message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error(`Failed to create timeline event: ${response.statusText}`);
    return response.json();
  }

  async getTimelineSummary(studentId: string): Promise<TimelineSummary> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/timeline/summary`);
    if (!response.ok) throw new Error(`Failed to fetch timeline summary: ${response.statusText}`);
    return response.json();
  }

  // --------------------------------------------------------------------------
  // PROJECTS API
  // --------------------------------------------------------------------------

  async getProjects(
    studentId: string,
    params?: {
      status?: string;
      category?: string;
    }
  ): Promise<{ projects: Project[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);

    const url = `${this.baseUrl}/students/${studentId}/projects?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch projects: ${response.statusText}`);
    return response.json();
  }

  async getProject(studentId: string, projectId: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/projects/${projectId}`);
    if (!response.ok) throw new Error(`Failed to fetch project: ${response.statusText}`);
    return response.json();
  }

  async updateProject(
    studentId: string,
    projectId: string,
    updates: Partial<Project>
  ): Promise<{ project: Project; message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`Failed to update project: ${response.statusText}`);
    return response.json();
  }

  // --------------------------------------------------------------------------
  // APPLICATIONS API
  // --------------------------------------------------------------------------

  async getApplications(studentId: string): Promise<{ applications: Application[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/applications`);
    if (!response.ok) throw new Error(`Failed to fetch applications: ${response.statusText}`);
    return response.json();
  }

  async updateApplication(
    studentId: string,
    collegeName: string,
    updates: Partial<Application>
  ): Promise<{ application: Application; message: string }> {
    const encodedName = encodeURIComponent(collegeName);
    const response = await fetch(`${this.baseUrl}/students/${studentId}/applications/${encodedName}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`Failed to update application: ${response.statusText}`);
    return response.json();
  }

  async getApplicationStats(studentId: string): Promise<ApplicationStats> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/applications/stats`);
    if (!response.ok) throw new Error(`Failed to fetch application stats: ${response.statusText}`);
    return response.json();
  }

  async getEssays(
    studentId: string,
    params?: {
      essay_type?: string;
      status?: string;
    }
  ): Promise<{ essays: Essay[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.essay_type) queryParams.append('essay_type', params.essay_type);
    if (params?.status) queryParams.append('status', params.status);

    const url = `${this.baseUrl}/students/${studentId}/essays?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch essays: ${response.statusText}`);
    return response.json();
  }
}

// Export singleton instance
export const v10Api = new V10ApiService();
export default v10Api;
