/**
 * v10.0 API Service
 * Provides typed interfaces for all v10.0 backend endpoints
 * Backend server: http://localhost:8787
 */

// Use Vite environment variable (not Next.js process.env)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

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

// v2.0 Standardized Schema (with v1.0 backwards compatibility)
export interface ECDetail {
  // Identity
  name: string;
  activity_type?: 'academic' | 'arts_music' | 'athletics' | 'career' | 'community_service' | 'computer_science' | 'cultural' | 'journalism_publication' | 'other_club' | 'research' | 'student_government' | 'work';
  position?: string;
  description?: string;

  // Timeline
  founded_week?: number;
  launched_week?: number;
  grade_levels?: ('9' | '10' | '11' | '12' | 'PG')[];
  timing?: 'school_year' | 'break' | 'all_year';

  // Commitment
  hours_per_week?: number;
  weeks_per_year?: number;
  intend_college?: boolean;

  // Status
  status: 'planning' | 'development' | 'launched' | 'scaling' | 'in_app';

  // v2.0 Organized Metrics
  scale?: {
    participants_reached?: number;
    locations_reached?: number;
    audience_size?: number;
    organizational_size?: number;
  };

  impact?: {
    funding_raised?: number;
    publications?: number;
    events_organized?: number;
    resources_created?: number;
    partnerships?: number;
  };

  recognition?: {
    press_mentions?: number;
    awards?: string[];
    speaking_engagements?: number;
    growth_rate?: number;
  };

  // v1.0 Backwards Compatibility (flat metrics)
  metrics?: {
    hours_per_week?: number;
    funding_raised?: number;
    participants?: number;
    cities_reached?: number;
    users?: number;
    classes?: number;
    members?: number;
    growth_percentage?: number;
    writers?: number;
    articles?: number;
    [key: string]: any;
  };
}

// v2.0 Standardized Award Schema
export interface AwardDetail {
  // Identity
  name: string;
  level: 'school' | 'regional' | 'state' | 'national' | 'international';
  category?: 'academic' | 'community_service' | 'leadership' | 'arts' | 'athletics' | 'stem' | 'writing' | 'other';

  // Timeline
  applied_week?: number;
  submitted_week?: number;
  won_week?: number;
  grade_level?: '9' | '10' | '11' | '12' | 'PG';

  // Status
  status: 'researching' | 'applying' | 'submitted' | 'finalist' | 'winner';

  // Details (v2.0)
  description?: string;
  selection_rate?: number;
  prize_amount?: number;
  recognition_details?: string;
}

export interface ProgramDetail {
  name: string;
  type: string;
  attended_week?: number;
}

export interface WeeklyVitals {
  week_number: number;
  week_start: string;
  week_end: string;
  focus_areas: Array<{
    area: string;
    source: string;
    priority: number;
    target_date?: string;
  }>;
  progress_status: 'behind' | 'on_track' | 'ahead';
  completion_percentage: number;
  vitals: {
    academic: {
      gpa_unweighted?: number;
      gpa_weighted?: number;
      sat_score?: number;
      ap_count?: number;
    };
    extracurricular: {
      projects_active?: number;
      leadership_roles?: number;
      awards_won?: number;
      programs_attended?: number;
    };
    growth: {
      hgti_score?: number;
      events_total?: number;
      breakthroughs?: number;
    };
  };
  ec_details?: ECDetail[];
  award_details?: AwardDetail[];
  program_details?: ProgramDetail[];
  session_summary?: string;
  session_topics?: string[];
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

  // --------------------------------------------------------------------------
  // WEEKLY VITALS API
  // --------------------------------------------------------------------------

  async getWeeklyVitals(
    studentId: string,
    params?: {
      start_week?: number;
      end_week?: number;
      limit?: number;
    }
  ): Promise<{ weeks: WeeklyVitals[]; total_weeks: number }> {
    const queryParams = new URLSearchParams();
    if (params?.start_week) queryParams.append('start_week', params.start_week.toString());
    if (params?.end_week) queryParams.append('end_week', params.end_week.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.baseUrl}/students/${studentId}/vitals/weeks?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch weekly vitals: ${response.statusText}`);
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
