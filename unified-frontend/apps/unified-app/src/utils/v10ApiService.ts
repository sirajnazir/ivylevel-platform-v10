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

// v2.0 Standardized Program Schema
export interface ProgramDetail {
  // Identity
  name: string;
  program_type: 'summer' | 'year_round' | 'weekend' | 'online' | 'competition';
  category: 'academic' | 'research' | 'leadership' | 'arts' | 'stem' | 'pre_college' | 'internship';

  // Selection
  selection_rate?: number; // 0.01 = 1% acceptance
  total_applicants?: number;
  total_accepted?: number;

  // Timeline
  attended_week?: number;
  start_date?: string;
  end_date?: string;
  grade_level: '9' | '10' | '11' | '12' | 'PG';

  // Details
  institution?: string;
  location?: string;
  is_paid?: boolean;
  cost?: number;
  scholarship_amount?: number;
  hours_total?: number;

  // Outcomes
  outcomes?: {
    projects_completed?: number;
    papers_published?: number;
    presentations?: number;
    skills_learned?: string[];
    recommendation_received?: boolean;
  };

  // Link to activity (if this program is also an EC activity)
  related_activity_name?: string;

  // v1.0 Backwards Compatibility
  type?: string; // Maps to program_type
}

// v3.0 Complete Academic Vitals Schema (Common App Aligned)
export interface AcademicVitals {
  // === GPA (supports any scale) ===
  gpa_weighted?: number;
  gpa_unweighted?: number;
  gpa_scale?: number; // Default 4.0, but supports 5.0, 100, etc.
  gpa_trend?: 'improving' | 'stable' | 'declining';

  // === Class Rank ===
  class_rank?: number | 'na'; // null = unknown, 'na' = unranked
  class_size?: number;
  percentile?: number; // Calculated: (class_size - rank) / class_size * 100

  // === SAT ===
  sat?: {
    total?: number; // Superscored
    ebrw?: number; // Evidence-Based Reading and Writing (200-800)
    math?: number; // Math (200-800)
    essay_reading?: number; // Optional essay (2-8)
    essay_analysis?: number;
    essay_writing?: number;
    attempts?: {
      date: string; // 'MM/DD/YYYY'
      total: number;
      ebrw: number;
      math: number;
    }[];
  };

  // === ACT ===
  act?: {
    composite?: number; // Superscored (1-36)
    english?: number;
    math?: number;
    reading?: number;
    science?: number;
    writing?: number;
    attempts?: {
      date: string;
      composite: number;
      english: number;
      math: number;
      reading: number;
      science: number;
    }[];
  };

  // === AP Exams ===
  ap_exams?: {
    subject: string; // 'Human Geography', 'Calculus AB', etc.
    score: number; // 1-5
    test_date: string; // 'MM/YYYY'
    grade_level: '9' | '10' | '11' | '12';
  }[];

  // === IB Exams (for IB students) ===
  ib_exams?: {
    subject: string;
    level: 'SL' | 'HL'; // Standard or Higher Level
    predicted_score?: number; // 1-7
    final_score?: number; // 1-7
    test_date?: string;
    grade_level: '11' | '12';
  }[];

  // === Subject Tests ===
  subject_tests?: {
    subject: string;
    score: number;
    test_date: string;
  }[];

  // === Current Course Load ===
  current_courses?: {
    year: '9' | '10' | '11' | '12' | 'PG';
    semester: 'fall' | 'spring' | 'full_year';
    courses: {
      subject: string; // 'ENG', 'MATH', 'SCI', 'HIST', 'LANG', 'COMPSCI', 'OTH/ELE', 'ARTS'
      title: string;
      level: 'REG' | 'HONORS' | 'AP' | 'IB' | 'DE'; // Dual Enrollment
      credits?: number; // For college courses
    }[];
  }[];

  // === Cumulative Stats (auto-calculated) ===
  total_ap_courses?: number;
  total_ib_courses?: number;
  total_honors_courses?: number;
  total_de_courses?: number;
  academic_rigor_score?: number;

  // === v1.0 Backwards Compatibility ===
  sat_score?: number; // Maps to sat.total
  ap_count?: number; // Maps to ap_exams.length
}

// v10.9: Weekly Action Plan & Tasks Types
export interface Outcome {
  outcome_id: string;
  outcome_domain: string;
  outcome_type: string;
  outcome_scope: string;
  title: string;
  description: string;
  purpose?: string;
  target_metric?: any;
  current_metric?: any;
  priority_level: 'P0' | 'P1' | 'P2' | 'P3';
  urgency_score: number;
  impact_score: number;
  completion_state: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'deferred' | 'cancelled';
  completion_percentage: number;
  child_execution_items: string[];
  created_at: string;
  completed_date?: string;
}

export interface ExecutionItem {
  execution_item_id: string;
  parent_outcome_id: string;
  title: string;
  description: string;
  call_to_action: string;
  why: string;
  what: string;
  how: string;
  when: string;
  who: string;
  execution_domain: string;
  execution_type: string;
  priority_level: 'P0' | 'P1' | 'P2' | 'P3';
  urgency_score: number;
  impact_score: number;
  estimated_duration_minutes: number;
  is_recurring: boolean;
  completion_state: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'deferred' | 'cancelled';
  progress_percentage: number;
  child_tasks: string[];
  created_at: string;
}

export interface TaskItem {
  task_id: string;
  parent_execution_item_id: string;
  task_title: string;
  task_description: string;
  call_to_action: string;
  completion_state: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'deferred' | 'cancelled';
  priority_level: 'P0' | 'P1' | 'P2' | 'P3';
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;
  deadline?: string;
  completed_date?: string;
  completion_proof?: any;
  verification_evidence?: any[];
  created_at: string;
}

export interface TimeAllocation {
  total_hours_in_period: number;
  fixed_commitments: Array<{
    block_type: string;
    hours_per_week: number;
  }>;
  total_fixed_hours: number;
  available_hours: number;
  outcome_allocations: Array<{
    outcome_id: string;
    allocated_hours: number;
    buffer_hours: number;
  }>;
}

export interface ProgressTracking {
  week_number: number;
  tracking_period_start: string;
  tracking_period_end: string;
  completion_metrics: {
    total_outcomes: number;
    completed_outcomes: number;
    outcome_completion_rate: number;
    total_execution_items: number;
    completed_execution_items: number;
    execution_item_completion_rate: number;
    total_tasks: number;
    completed_tasks: number;
    task_completion_rate: number;
    overall_completion_percentage: number;
  };
}

export interface WeeklyActionPlan {
  plan_id: string;
  student_id: string;
  week_number: number;
  academic_year: string;
  plan_version: number;
  week_start_date: string;
  week_end_date: string;
  created_at: string;
  last_updated_at: string;

  outcomes: Outcome[];
  execution_items: ExecutionItem[];
  tasks: TaskItem[];

  resource_allocation: {
    week_number: number;
    time_allocation: TimeAllocation;
    tools_required: any[];
    people_dependencies: any[];
    other_resources: any[];
  };

  critical_dates: any[];
  progress_tracking: ProgressTracking;
  context: any;
  custom_fields?: any;
  framework_applications?: any[];
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

  // v3.0: Direct academic_vitals (replaces vitals.academic nested object)
  academic_vitals?: AcademicVitals;

  // v1.0 Backwards compatibility: nested vitals object
  vitals?: {
    academic?: {
      gpa_unweighted?: number;
      gpa_weighted?: number;
      sat_score?: number;
      ap_count?: number;
    };
    extracurricular?: {
      projects_active?: number;
      leadership_roles?: number;
      awards_won?: number;
      programs_attended?: number;
    };
    growth?: {
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

  // v10.9: Action plan link
  action_plan?: WeeklyActionPlan;
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

  // --------------------------------------------------------------------------
  // WEEKLY ACTION PLAN API (v10.9)
  // --------------------------------------------------------------------------

  async getActionPlan(
    studentId: string,
    weekNumber: number
  ): Promise<{ action_plan: WeeklyActionPlan | null; linked_vitals: any }> {
    const url = `${this.baseUrl}/students/${studentId}/weeks/${weekNumber}/action-plan`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch action plan: ${response.statusText}`);
    const data = await response.json();
    return data.data;
  }

  async updateActionPlan(
    studentId: string,
    weekNumber: number,
    actionPlan: WeeklyActionPlan
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/weeks/${weekNumber}/action-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionPlan),
    });
    if (!response.ok) throw new Error(`Failed to update action plan: ${response.statusText}`);
    return response.json();
  }

  async addOutcome(
    studentId: string,
    weekNumber: number,
    outcome: Partial<Outcome>
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/weeks/${weekNumber}/outcomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outcome),
    });
    if (!response.ok) throw new Error(`Failed to add outcome: ${response.statusText}`);
    return response.json();
  }

  async updateOutcome(
    studentId: string,
    weekNumber: number,
    outcomeId: string,
    updates: Partial<Outcome>
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/weeks/${weekNumber}/outcomes/${outcomeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`Failed to update outcome: ${response.statusText}`);
    return response.json();
  }

  async addExecutionItem(
    studentId: string,
    weekNumber: number,
    executionItem: Partial<ExecutionItem>
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/weeks/${weekNumber}/execution-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(executionItem),
    });
    if (!response.ok) throw new Error(`Failed to add execution item: ${response.statusText}`);
    return response.json();
  }

  async addTask(
    studentId: string,
    weekNumber: number,
    task: Partial<TaskItem>
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/weeks/${weekNumber}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error(`Failed to add task: ${response.statusText}`);
    return response.json();
  }

  async completeTask(
    studentId: string,
    weekNumber: number,
    taskId: string,
    completionData: {
      completion_proof?: any;
      proof_artifacts?: any[];
      completion_notes?: string;
      actual_duration_minutes?: number;
    }
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/weeks/${weekNumber}/tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completionData),
    });
    if (!response.ok) throw new Error(`Failed to complete task: ${response.statusText}`);
    return response.json();
  }

  async getActionPlansSummary(
    studentId: string,
    params?: {
      start_week?: number;
      end_week?: number;
    }
  ): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.start_week) queryParams.append('start_week', params.start_week.toString());
    if (params?.end_week) queryParams.append('end_week', params.end_week.toString());

    const url = `${this.baseUrl}/students/${studentId}/action-plans/summary?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch action plans summary: ${response.statusText}`);
    return response.json();
  }
}

// Export singleton instance
export const v10Api = new V10ApiService();
export default v10Api;
