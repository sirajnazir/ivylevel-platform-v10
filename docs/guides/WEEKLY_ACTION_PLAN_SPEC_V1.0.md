# Weekly Action Plan & Tasks - Technical Specification v1.0

**Version:** 1.0
**Date:** 2025-10-27
**Status:** Draft for Review
**Author:** AI Analysis of 2-Year Coaching Intelligence
**Purpose:** Universal tactical task management system for weekly student progress

---

## Table of Contents

1. [First Principles Design Philosophy](#1-first-principles-design-philosophy)
2. [Core Data Model](#2-core-data-model)
3. [Hierarchical Architecture](#3-hierarchical-architecture)
4. [Universal Schema Definitions](#4-universal-schema-definitions)
5. [Framework Library](#5-framework-library)
6. [Integration with v10.8.2](#6-integration-with-v1082)
7. [Example Implementations](#7-example-implementations)
8. [Database Schema](#8-database-schema)
9. [Backend API Specification](#9-backend-api-specification)
10. [Frontend Component Design](#10-frontend-component-design)
11. [Migration & Data Strategy](#11-migration--data-strategy)

---

## 1. First Principles Design Philosophy

### 1.1 Universal Applicability

**Core Principle**: The schema must work for ANY student profile, regardless of:
- Academic level (9th grade → PhD)
- Goal type (college admission, career development, skill building)
- Timeline (weekly, monthly, quarterly, multi-year)
- Cultural context (US, international, diverse backgrounds)
- Resource constraints (access to opportunities, time availability)

**Design Decision**: Use **abstract entity types** instead of hardcoded categories.

### 1.2 Semantic Clarity

**Core Principle**: Every field name must be self-documenting and unambiguous.

**Naming Conventions**:
- **Verbs for actions**: `execute_task`, `complete_goal`, `track_progress`
- **Nouns for entities**: `outcome`, `metric`, `resource`, `dependency`
- **Adjectives for states**: `is_completed`, `is_blocked`, `is_recurring`
- **No abbreviations**: `priority` not `pri`, `estimated_duration_minutes` not `est_min`

### 1.3 Extensibility

**Core Principle**: New goal types, frameworks, and metrics can be added without schema changes.

**Design Patterns**:
- **Open enums**: `goal_domain` is extensible (not limited to 'academic', 'ec', 'application')
- **JSONB flexibility**: `custom_fields` for domain-specific attributes
- **Framework registry**: New coaching frameworks can be registered dynamically
- **Metric polymorphism**: Any quantifiable outcome can be tracked

### 1.4 Separation of Concerns

**Core Principle**: Strategic planning ≠ Tactical execution ≠ Completion tracking

**Three-Layer Architecture**:
1. **Outcomes Layer**: What we want to achieve (goals, objectives, milestones)
2. **Execution Layer**: How we'll achieve it (action items, tasks, resources)
3. **Tracking Layer**: Progress measurement (metrics, status, reflections)

---

## 2. Core Data Model

### 2.1 Fundamental Entities

```
Student
  └── Weekly Action Plan (weekly_action_plans table)
       ├── Outcomes (goals, milestones) - WHAT
       ├── Execution Items (actions, tasks) - HOW
       ├── Resources (time, tools, people) - WITH
       ├── Metrics (progress, completion) - MEASUREMENT
       └── Context (reflections, blockers) - WHY/LEARNINGS
```

### 2.2 Entity Relationships

```
Outcome (Goal)
  ├── has many → Execution Items (Action Items)
  │    └── has many → Tasks (granular actions)
  ├── measured by → Metrics (quantitative)
  ├── requires → Resources (time, tools, people)
  ├── blocked by → Dependencies (prerequisites)
  └── documented in → Context (notes, reflections)
```

### 2.3 Naming Conventions

| Old Term | New Universal Term | Rationale |
|----------|-------------------|-----------|
| `weekly_goal` | `outcome` | Goals are outcomes; works for any timeframe |
| `action_item` | `execution_item` | Clearer that this is about HOW to execute |
| `task` | `task` (unchanged) | Universal, atomic unit of work |
| `priority` | `priority_level` | Explicit that it's a level, not boolean |
| `status` | `completion_state` | State machine clarity |
| `deadline` | `target_completion_date` | Semantic clarity (deadline implies failure) |

---

## 3. Hierarchical Architecture

### 3.1 Three-Level Hierarchy

```
Level 1: OUTCOMES (Strategic - What we want to achieve)
  └── "Reach 1550 SAT"
  └── "Complete college applications"
  └── "Scale nonprofit to 5 schools"

Level 2: EXECUTION ITEMS (Tactical - How we'll achieve outcomes)
  └── Outcome: "Reach 1550 SAT"
       ├── Execution Item: "Daily math practice"
       ├── Execution Item: "Weekly full practice tests"
       └── Execution Item: "Focus on reading comprehension"

Level 3: TASKS (Operational - Specific actions with CTAs)
  └── Execution Item: "Daily math practice"
       ├── Task: "Complete Khan Academy algebra module Mon 7pm"
       ├── Task: "Complete Khan Academy geometry module Tue 7pm"
       └── Task: "Review mistakes Wed 7pm"
```

### 3.2 Linking to v10.8.2 Weekly Vitals

```
weekly_vitals (existing v10.8.2)
  ├── academic_vitals → links to → outcomes (domain: 'academic')
  ├── ec_details → links to → outcomes (domain: 'extracurricular')
  ├── award_details → links to → outcomes (domain: 'recognition')
  └── **NEW** action_plans → weekly_action_plans (this spec)
```

**Link Field**: `linked_vitals_component`
- Type: `{ component: 'academic_vitals' | 'ec_details' | 'award_details', item_id: string }`
- Purpose: Connect outcomes to what was achieved that week in vitals

---

## 4. Universal Schema Definitions

### 4.1 Core Type: `weekly_action_plan`

**Purpose**: Container for all weekly planning, execution, and tracking.

**Database**: New JSONB column `action_plan` in existing `weekly_vitals` table.

```typescript
interface WeeklyActionPlan {
  // Identity & Versioning
  plan_id: string;                    // UUID
  student_id: string;
  week_number: number;
  academic_year: string;              // "2024-2025" (extensible to any year)
  plan_version: number;               // Incremental, allows revisions

  // Temporal Context
  week_start_date: string;            // ISO 8601: "2024-09-01"
  week_end_date: string;              // ISO 8601: "2024-09-07"
  created_at: string;                 // When plan was created
  last_updated_at: string;            // Most recent modification

  // Core Components
  outcomes: Outcome[];                // Strategic goals/objectives
  execution_items: ExecutionItem[];   // Tactical actions
  tasks: Task[];                      // Granular work items

  // Supporting Systems
  resource_allocation: ResourceAllocation;
  critical_dates: CriticalDate[];
  progress_tracking: ProgressTracking;
  context: WeeklyContext;

  // Extensibility
  custom_fields: Record<string, any>; // Domain-specific extensions
  framework_applications: FrameworkApplication[];
}
```

---

### 4.2 Core Type: `Outcome` (formerly "Goal")

**Purpose**: Define WHAT we want to achieve. Universal across domains.

**Design Principle**: Domain-agnostic. Works for academic, career, personal, creative goals.

```typescript
interface Outcome {
  // Identity
  outcome_id: string;                 // UUID
  parent_plan_id: string;             // Links to WeeklyActionPlan

  // Classification (Open Enums - Extensible)
  outcome_domain: OutcomeDomain;      // What area of life
  outcome_type: OutcomeType;          // What kind of achievement
  outcome_scope: OutcomeScope;        // Time horizon

  // Definition
  title: string;                      // Clear, specific title
  description: string;                // Full context
  success_criteria: string[];         // How we know it's achieved (multiple criteria)

  // Why (Depth)
  purpose: string;                    // Why this outcome matters
  deeper_purpose?: string;            // Why-ladder level 2
  critical_importance?: string;       // Why-ladder level 3 (life-and-death stakes)

  // Measurement
  target_metric: Metric;              // Quantifiable target
  current_metric: Metric;             // Current state
  measurement_method: string;         // How to measure

  // Timeline
  target_completion_date: string;     // When we aim to achieve
  actual_completion_date?: string;    // When actually achieved
  is_time_bound: boolean;             // Hard deadline vs aspirational

  // Priority & Urgency
  priority_level: PriorityLevel;      // P0/P1/P2/P3 (extensible)
  urgency_score: number;              // 1-10 (how soon needed)
  impact_score: number;               // 1-10 (how much it matters)
  risk_if_missed: string;             // Consequences of failure

  // State Management
  completion_state: CompletionState;  // not_started | in_progress | completed | blocked | deferred | cancelled
  completion_percentage: number;      // 0-100
  blocked_by?: Blocker;               // What's preventing progress

  // Relationships
  parent_outcome_id?: string;         // For hierarchical outcomes (8-week goal → weekly goal)
  child_execution_items: string[];    // ExecutionItem IDs
  depends_on: string[];               // Other outcome IDs that must complete first
  linked_vitals_component?: LinkedVitalsComponent;

  // Evidence
  proof_required: boolean;            // Does completion require evidence?
  proof_artifacts: ProofArtifact[];   // Links, files, testimonials
  milestones: Milestone[];            // Checkpoints along the way

  // Collaboration
  outcome_owner: ActorRole;           // student | coach | joint | parent | teacher
  stakeholders: Stakeholder[];        // Others involved or impacted

  // Learning & Reflection
  lessons_learned?: string[];         // Post-completion reflections
  would_repeat?: boolean;             // Would approach same way again?

  // Metadata
  created_at: string;
  created_by: string;
  last_updated_at: string;
  last_updated_by: string;
  tags: string[];                     // Flexible categorization
  custom_fields: Record<string, any>; // Extensibility
}

// Supporting Types

type OutcomeDomain =
  | 'academic'              // Grades, courses, learning
  | 'test_preparation'      // SAT, ACT, AP, subject tests
  | 'extracurricular'       // Clubs, sports, volunteering
  | 'application'           // College, scholarship, program apps
  | 'personal_brand'        // Online presence, portfolio
  | 'skill_development'     // Learning new capabilities
  | 'relationship'          // Networking, mentorship, recommendations
  | 'creative_project'      // Art, writing, games, films
  | 'entrepreneurship'      // Business, startup, nonprofit
  | 'research'              // Academic research, experiments
  | 'career'                // Job search, internship, promotion
  | 'health_wellness'       // Physical, mental health
  | 'financial'             // Scholarships, earnings, savings
  | 'personal_growth'       // Character, mindset, habits
  | 'custom';               // Extensible for future domains

type OutcomeType =
  | 'achievement'           // Reach a score, complete a project
  | 'milestone'             // Checkpoint in longer journey
  | 'habit_formation'       // Build recurring behavior
  | 'skill_acquisition'     // Learn new capability
  | 'relationship_building' // Establish connection
  | 'problem_solving'       // Address specific challenge
  | 'exploration'           // Research, discovery
  | 'maintenance'           // Sustain existing state
  | 'recovery'              // Bounce back from setback
  | 'transformation';       // Fundamental change

type OutcomeScope =
  | 'daily'                 // Achievable in one day
  | 'weekly'                // This week's outcome
  | 'multi_week'            // 2-8 weeks (8-week architecture)
  | 'quarterly'             // ~12 weeks
  | 'semester'              // Academic semester
  | 'annual'                // Yearly goal
  | 'multi_year';           // Long-term aspiration

type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'; // Extensible

type CompletionState =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'blocked'
  | 'deferred'
  | 'cancelled'
  | 'archived';

interface Metric {
  metric_type: 'quantitative' | 'qualitative' | 'binary';
  value: string | number;          // "1450", "3 essays", "true"
  unit?: string;                   // "SAT score", "essays completed", null
  comparison_operator?: string;    // ">=", "==", "completed"
}

interface Blocker {
  blocker_type: 'dependency' | 'resource' | 'external' | 'internal' | 'information';
  description: string;
  resolution_plan?: string;
  estimated_unblock_date?: string;
}

interface Milestone {
  milestone_id: string;
  title: string;
  target_date: string;
  is_completed: boolean;
  completed_date?: string;
  celebration_note?: string;       // "Yay! Another essay done!"
}

interface ProofArtifact {
  artifact_type: 'url' | 'file' | 'screenshot' | 'testimonial' | 'submission_confirmation';
  artifact_location: string;       // URL or file path
  description: string;
  uploaded_at?: string;
}

interface LinkedVitalsComponent {
  component_type: 'academic_vitals' | 'ec_details' | 'award_details' | 'program_details' | 'growth_vitals';
  component_id: string;            // UUID from vitals JSONB
  relationship: 'produces' | 'supports' | 'documents';
}

interface Stakeholder {
  stakeholder_role: 'coach' | 'parent' | 'teacher' | 'mentor' | 'peer' | 'organization';
  stakeholder_name?: string;
  involvement_type: 'decision_maker' | 'supporter' | 'approver' | 'executor' | 'beneficiary';
  contact_info?: string;
}

type ActorRole = 'student' | 'coach' | 'joint' | 'parent' | 'teacher' | 'mentor';
```

---

### 4.3 Core Type: `ExecutionItem` (formerly "Action Item")

**Purpose**: Define HOW we'll achieve outcomes. Tactical breakdown.

**Design Principle**: Bridge between strategy (outcomes) and operations (tasks).

```typescript
interface ExecutionItem {
  // Identity
  execution_item_id: string;         // UUID
  parent_outcome_id: string;         // Links to Outcome

  // Definition
  title: string;                     // What needs to happen
  description: string;               // Detailed context
  call_to_action: string;            // Specific executable instruction

  // Five W's Framework (User Requirement)
  why: string;                       // Why this action matters
  what: string;                      // What specifically needs to happen
  how: string;                       // How to execute
  when: string;                      // When to do it (specific time/day)
  who: ActorRole;                    // Who executes (student, coach, etc)

  // Classification
  execution_domain: OutcomeDomain;   // Inherits from parent outcome
  execution_type: ExecutionType;

  // Priority & Impact
  priority_level: PriorityLevel;
  urgency_score: number;             // 1-10
  impact_score: number;              // 1-10
  effort_score: number;              // 1-10 (how hard)

  // Timeline
  target_completion_date: string;
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;
  is_time_blocked: boolean;          // Has specific calendar slot?
  time_block?: string;               // "Mon 7-8pm", "Sat 2-4pm"

  // Recurrence (for habits)
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;

  // State Management
  completion_state: CompletionState;
  progress_percentage: number;
  started_date?: string;
  completed_date?: string;
  blocked_by?: Blocker;

  // Dependencies
  depends_on_execution_items: string[];
  depends_on_tasks: string[];
  depends_on_external: string[];     // External dependencies (teacher reply, etc)

  // Relationships
  child_tasks: string[];             // Task IDs
  related_execution_items: string[]; // Related but not dependent

  // Framework Application
  framework_used?: string;           // "Recommendation Relationship Sequence"
  framework_step?: number;           // Which step (1, 2, 3...)
  framework_metadata?: Record<string, any>;

  // Resources Required
  resources_needed: Resource[];
  tools_needed: string[];
  information_needed: string[];

  // Collaboration
  assigned_to: ActorRole;
  collaborators: string[];
  needs_approval_from?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';

  // Completion & Accountability
  completion_method: string;         // How completion is verified
  completion_proof_required: boolean;
  completion_proof_artifacts: ProofArtifact[];

  // Content Reuse (Essay Recycling, etc)
  is_recycled_content: boolean;
  source_content?: string[];         // References to original content
  adaptation_notes?: string;

  // Notes & Reflections
  student_notes?: string;
  coach_notes?: string;
  challenges_encountered?: string[];
  lessons_learned?: string[];

  // Metadata
  created_at: string;
  created_by: string;
  last_updated_at: string;
  last_updated_by: string;
  tags: string[];
  custom_fields: Record<string, any>;
}

// Supporting Types

type ExecutionType =
  | 'communication'         // Emails, calls, meetings
  | 'research'              // Gather information
  | 'writing'               // Essays, applications, content
  | 'creation'              // Build something new
  | 'practice'              // Skill development, test prep
  | 'submission'            // Submit application, essay, form
  | 'review'                // Review work, get feedback
  | 'planning'              // Strategic planning session
  | 'relationship_building' // Outreach, networking
  | 'problem_solving'       // Address specific issue
  | 'maintenance'           // Ongoing upkeep
  | 'learning';             // Study, learn new skill

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  specific_days?: string[];          // ["Monday", "Wednesday", "Friday"]
  time_of_day?: string;              // "7pm", "morning", "afternoon"
  end_date?: string;                 // When recurrence ends
  skip_weeks?: number[];             // Skip week numbers (e.g., holidays)
}

interface Resource {
  resource_type: 'time' | 'tool' | 'person' | 'information' | 'money' | 'access' | 'skill';
  resource_name: string;
  is_available: boolean;
  availability_date?: string;        // When it becomes available
  cost?: number;                     // If monetary resource
  notes?: string;
}
```

---

### 4.4 Core Type: `Task`

**Purpose**: Define SPECIFIC granular actions. Atomic units of work.

**Design Principle**: Tasks are the smallest executable unit. Must have clear completion criteria.

```typescript
interface Task {
  // Identity
  task_id: string;                   // UUID
  parent_execution_item_id: string;  // Links to ExecutionItem

  // Definition
  title: string;                     // Specific action
  description: string;               // Context
  specific_call_to_action: string;   // Ultra-specific instruction

  // Classification
  task_domain: OutcomeDomain;        // Inherits from parent
  task_type: TaskType;

  // Timeline
  target_completion_date: string;
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;
  scheduled_time?: string;           // Specific calendar slot

  // Recurrence
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_instance_number?: number; // For tracking instances

  // State Management
  completion_state: CompletionState;
  completed_date?: string;
  completion_verified: boolean;      // Has completion been verified?
  verified_by?: string;              // Who verified (coach, system, self)

  // Execution Details
  steps: TaskStep[];                 // Breakdown if complex
  resources_needed: string[];
  tools_needed: string[];
  information_needed: string[];
  links: string[];                   // Relevant URLs

  // Completion Criteria
  completion_criteria: string;       // How to know it's done
  completion_method: string;         // How to mark as done
  verification_evidence_required: boolean;
  verification_evidence?: ProofArtifact[];

  // Dependencies
  depends_on_tasks: string[];
  blocks_tasks: string[];            // Tasks that can't start until this completes

  // Notes
  student_notes?: string;
  coach_notes?: string;
  execution_notes?: string;          // Notes during execution

  // Metadata
  created_at: string;
  created_by: string;
  last_updated_at: string;
  tags: string[];
  custom_fields: Record<string, any>;
}

// Supporting Types

type TaskType =
  | 'email'
  | 'phone_call'
  | 'meeting'
  | 'research'
  | 'writing'
  | 'editing'
  | 'submission'
  | 'practice'
  | 'review'
  | 'creation'
  | 'calculation'
  | 'organization'
  | 'documentation'
  | 'communication'
  | 'learning';

interface TaskStep {
  step_number: number;
  step_description: string;
  is_completed: boolean;
  completed_date?: string;
  notes?: string;
}
```

---

### 4.5 Supporting System: `ResourceAllocation`

**Purpose**: Track time, tools, and people allocation (168-hour framework).

**Design Principle**: Universal time management applicable to any schedule.

```typescript
interface ResourceAllocation {
  week_number: number;

  // Time Allocation (168-Hour Framework)
  time_allocation: TimeAllocation;

  // Tool Allocation
  tools_required: ToolRequirement[];

  // People Allocation
  people_dependencies: PersonDependency[];

  // Other Resources
  other_resources: Resource[];
}

interface TimeAllocation {
  total_hours_in_period: number;     // Usually 168 (hours/week)

  // Fixed Commitments (Not negotiable)
  fixed_commitments: TimeBlock[];
  total_fixed_hours: number;         // Sum of fixed

  // Allocated to Outcomes
  outcome_allocations: OutcomeTimeAllocation[];
  total_allocated_hours: number;

  // Available
  available_hours: number;           // Calculated: total - fixed - allocated

  // Recommendations
  recommended_adjustments: string[];
  bottlenecks_identified: string[];
  optimization_suggestions: string[];
}

interface TimeBlock {
  block_type: 'sleep' | 'school' | 'work' | 'commute' | 'meals' | 'family' | 'health' | 'other_fixed';
  hours_per_week: number;
  specific_times?: string[];         // "Mon-Fri 8am-3pm", "Every night 11pm-7am"
  is_flexible: boolean;
  notes?: string;
}

interface OutcomeTimeAllocation {
  outcome_id: string;
  outcome_title: string;
  hours_allocated: number;
  specific_time_blocks?: string[];   // "Mon 7-9pm", "Sat 2-5pm"
  priority_level: PriorityLevel;
  is_sufficient: boolean;            // Enough time to achieve outcome?
  gap_analysis?: string;             // If insufficient, what's missing
}

interface ToolRequirement {
  tool_name: string;
  tool_type: 'software' | 'hardware' | 'platform' | 'service' | 'physical_tool';
  is_available: boolean;
  cost?: number;
  acquisition_plan?: string;
  alternatives?: string[];
}

interface PersonDependency {
  person_role: 'teacher' | 'mentor' | 'coach' | 'parent' | 'peer' | 'administrator' | 'organization';
  person_name?: string;
  dependency_type: 'approval' | 'information' | 'recommendation' | 'collaboration' | 'feedback';
  is_available: boolean;
  contact_plan?: string;
  backup_person?: string;
  relationship_strength: number;     // 1-10 (for recommendation sequence)
}
```

---

### 4.6 Supporting System: `CriticalDate`

**Purpose**: Track all important dates with context and preparation status.

**Design Principle**: Deadlines are just one type of critical date. Include milestones, events, etc.

```typescript
interface CriticalDate {
  // Identity
  critical_date_id: string;

  // Classification
  date_type: CriticalDateType;

  // Definition
  title: string;
  description: string;
  date: string;                      // ISO 8601
  time?: string;                     // Specific time if applicable

  // Urgency
  days_until: number;                // Calculated from today
  priority_level: PriorityLevel;
  is_hard_deadline: boolean;         // vs flexible
  consequences_if_missed: string;

  // Relationships
  related_outcomes: string[];
  related_execution_items: string[];
  related_tasks: string[];

  // Preparation
  preparation_status: 'not_started' | 'in_progress' | 'ready' | 'submitted' | 'completed';
  preparation_completion_percentage: number;
  prerequisites: string[];           // What must be done before

  // Sprint Planning (for tight deadlines)
  has_sprint_plan: boolean;
  sprint_plan?: SprintPlan;

  // Milestones
  milestones_toward_date: Milestone[];

  // Metadata
  added_date: string;
  added_by: string;
  last_updated_at: string;
  notification_preferences?: NotificationPreference;
  tags: string[];
  custom_fields: Record<string, any>;
}

// Supporting Types

type CriticalDateType =
  | 'application_deadline'
  | 'test_date'
  | 'scholarship_deadline'
  | 'program_deadline'
  | 'interview_date'
  | 'meeting_date'
  | 'event_date'
  | 'milestone_date'
  | 'review_date'
  | 'decision_date'
  | 'custom';

interface SprintPlan {
  total_days_available: number;
  total_hours_needed: number;
  daily_breakdown: DailySprintTask[];
  content_recycling_sources?: string[];
  risk_factors: string[];
  contingency_plan?: string;
}

interface DailySprintTask {
  day_number: number;
  date: string;
  tasks: string[];                   // Task descriptions
  hours_allocated: number;
  dependencies_from_previous_day: string[];
}

interface NotificationPreference {
  notify_days_before: number[];      // [7, 3, 1] = notify 7 days, 3 days, 1 day before
  notification_channel: 'email' | 'sms' | 'app' | 'all';
  escalate_if_not_ready: boolean;
}
```

---

### 4.7 Supporting System: `ProgressTracking`

**Purpose**: Comprehensive measurement of progress and patterns.

**Design Principle**: Track not just completion, but trends, bottlenecks, and learnings.

```typescript
interface ProgressTracking {
  week_number: number;
  tracking_period_start: string;
  tracking_period_end: string;

  // Completion Metrics
  completion_metrics: CompletionMetrics;

  // Time Metrics
  time_metrics: TimeMetrics;

  // Quality Metrics
  quality_metrics: QualityMetrics;

  // Trend Analysis
  trend_analysis: TrendAnalysis;

  // Bottlenecks & Blockers
  bottlenecks: BottleneckAnalysis;

  // Wins & Celebrations
  wins: Win[];

  // Reflections
  reflections: Reflection[];

  // Next Period Preview
  carryover: CarryoverAnalysis;
}

interface CompletionMetrics {
  // Outcomes
  total_outcomes: number;
  completed_outcomes: number;
  in_progress_outcomes: number;
  blocked_outcomes: number;
  outcome_completion_rate: number;   // 0-100

  // Execution Items
  total_execution_items: number;
  completed_execution_items: number;
  in_progress_execution_items: number;
  blocked_execution_items: number;
  execution_item_completion_rate: number;

  // Tasks
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  skipped_tasks: number;
  task_completion_rate: number;

  // Overall
  overall_completion_percentage: number;
}

interface TimeMetrics {
  total_hours_estimated: number;
  total_hours_actual: number;
  time_efficiency_ratio: number;     // actual/estimated (< 1 = faster, > 1 = slower)

  // By Domain
  time_by_domain: Record<OutcomeDomain, number>;

  // By Priority
  time_by_priority: Record<PriorityLevel, number>;

  // Insights
  underestimated_tasks: string[];    // Tasks that took longer
  overestimated_tasks: string[];     // Tasks that took less time
  time_allocation_adherence: number; // 0-100 (how well did we stick to plan)
}

interface QualityMetrics {
  outcomes_requiring_rework: number;
  execution_items_cancelled: number;
  tasks_skipped: number;

  // Proof Submission
  proofs_submitted: number;
  proofs_verified: number;
  proof_submission_rate: number;     // 0-100

  // Quality Indicators
  first_time_success_rate: number;   // Items completed without rework
  revision_count_average: number;
  quality_trend: 'improving' | 'steady' | 'declining';
}

interface TrendAnalysis {
  // Week-over-Week
  outcomes_completed_this_week: number;
  outcomes_completed_last_week: number;
  outcomes_trend: 'improving' | 'steady' | 'declining';

  execution_items_completed_this_week: number;
  execution_items_completed_last_week: number;
  execution_items_trend: 'improving' | 'steady' | 'declining';

  tasks_completed_this_week: number;
  tasks_completed_last_week: number;
  tasks_trend: 'improving' | 'steady' | 'declining';

  // Multi-Week Trends
  four_week_completion_average: number;
  eight_week_completion_average: number;
  momentum: 'accelerating' | 'steady' | 'decelerating';

  // Predictive
  projected_completion_date?: string; // Based on current rate
  at_risk_outcomes: string[];         // Outcomes unlikely to complete on time
}

interface BottleneckAnalysis {
  total_blocked_items: number;
  blocked_by_dependency: number;
  blocked_by_resource: number;
  blocked_by_external: number;
  blocked_by_internal: number;

  // Specific Bottlenecks
  bottlenecks_identified: Bottleneck[];
  resolution_in_progress: number;
  chronic_bottlenecks: string[];     // Recurring across weeks
}

interface Bottleneck {
  bottleneck_type: 'dependency' | 'resource' | 'external' | 'internal' | 'information' | 'time' | 'skill';
  description: string;
  affected_items: string[];          // IDs of blocked items
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution_plan?: string;
  resolution_owner?: string;
  estimated_resolution_date?: string;
}

interface Win {
  win_id: string;
  win_type: 'outcome_achieved' | 'milestone_reached' | 'breakthrough' | 'recognition' | 'efficiency_gain';
  title: string;
  description: string;
  date: string;
  related_items: string[];           // IDs of related outcomes/items/tasks
  celebration_note?: string;         // "Yay! Another essay done!"
  share_publicly: boolean;           // Shareable achievement?
}

interface Reflection {
  reflection_id: string;
  reflection_type: 'student' | 'coach' | 'parent' | 'teacher' | 'joint';
  author: string;
  date: string;

  // Content
  what_went_well: string[];
  what_was_challenging: string[];
  what_learned: string[];
  what_would_change: string[];

  // Forward-Looking
  insights_for_next_week: string[];
  adjustments_recommended: string[];
  mindset_notes?: string;

  // Metadata
  tags: string[];
}

interface CarryoverAnalysis {
  // Items Moving Forward
  carryover_outcomes: string[];
  carryover_execution_items: string[];
  carryover_tasks: string[];

  carryover_reason_breakdown: Record<string, number>; // {"not_started": 3, "in_progress": 5}

  // Next Week Preview
  next_week_priorities: string[];
  next_week_estimated_hours: number;
  next_week_critical_dates: string[];

  // Recommendations
  capacity_recommendation: 'reduce_load' | 'maintain' | 'increase_load';
  focus_areas: string[];
  items_to_defer: string[];
  items_to_cancel: string[];
}
```

---

### 4.8 Supporting System: `WeeklyContext`

**Purpose**: Capture qualitative context, emotional state, external factors.

**Design Principle**: Numbers don't tell the whole story. Context matters.

```typescript
interface WeeklyContext {
  week_number: number;

  // Emotional & Mental State
  student_wellbeing: WellbeingSnapshot;

  // External Factors
  external_factors: ExternalFactor[];

  // Key Events
  significant_events: SignificantEvent[];

  // Relationships
  relationship_updates: RelationshipUpdate[];

  // Crises & Challenges
  crises_encountered: Crisis[];

  // Discoveries & Insights
  discoveries: Discovery[];

  // Coach Observations
  coach_observations: string[];

  // Student Voice
  student_reflections: string[];
  parent_feedback?: string[];
}

interface WellbeingSnapshot {
  stress_level: number;              // 1-10
  energy_level: number;              // 1-10
  confidence_level: number;          // 1-10
  motivation_level: number;          // 1-10

  mood: string;                      // Free text
  challenges_noted: string[];
  support_needed?: string;

  // Patterns
  sleep_quality: 'poor' | 'fair' | 'good' | 'excellent';
  burnout_risk: 'low' | 'moderate' | 'high';
}

interface ExternalFactor {
  factor_type: 'school' | 'family' | 'health' | 'social' | 'financial' | 'political' | 'environmental' | 'other';
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
  impact_severity: number;           // 1-10
  duration: 'temporary' | 'ongoing';
  adaptation_strategy?: string;
}

interface SignificantEvent {
  event_type: 'achievement' | 'setback' | 'opportunity' | 'decision' | 'transition' | 'revelation';
  title: string;
  description: string;
  date: string;
  emotional_impact: string;
  actions_taken?: string[];
  lessons_learned?: string[];
}

interface RelationshipUpdate {
  relationship_type: 'teacher' | 'mentor' | 'peer' | 'parent' | 'coach' | 'administrator';
  person_identifier?: string;
  update_type: 'strengthened' | 'strained' | 'new' | 'ended' | 'maintained';
  description: string;
  next_steps?: string[];
}

interface Crisis {
  crisis_id: string;
  crisis_type: 'academic' | 'social' | 'family' | 'health' | 'technical' | 'financial' | 'emotional';
  description: string;
  date_occurred: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';

  // Response
  response_applied: string;          // Which framework: "Crisis Response Formula"
  response_steps: string[];
  outcome: string;
  resolved: boolean;
  resolution_date?: string;

  // Learning
  lessons_learned: string[];
  prevention_strategies?: string[];
}

interface Discovery {
  discovery_type: 'self' | 'opportunity' | 'strategy' | 'resource' | 'person' | 'path';
  title: string;
  description: string;
  date: string;
  impact_potential: number;          // 1-10
  action_items_generated: string[]; // ExecutionItem or Task IDs created from discovery
}
```

---

## 5. Framework Library

### 5.1 Framework Registry

**Purpose**: Standardize coaching frameworks as reusable, trackable systems.

**Design Principle**: Frameworks are patterns that can be applied, measured, and improved.

```typescript
interface FrameworkDefinition {
  // Identity
  framework_id: string;
  framework_name: string;
  framework_category: FrameworkCategory;

  // Description
  short_description: string;
  full_description: string;
  origin_story?: string;             // Where framework came from

  // Application
  applicable_domains: OutcomeDomain[];
  applicable_situations: string[];
  prerequisites?: string[];

  // Structure
  has_steps: boolean;
  steps?: FrameworkStepDefinition[];

  // Evidence
  evidence_source: string;           // "Week 20 transcript", "Jenny coaching pattern"
  effectiveness_data?: EffectivenessData;

  // Metadata
  created_date: string;
  created_by: string;
  version: number;
  tags: string[];
}

type FrameworkCategory =
  | 'time_management'
  | 'prioritization'
  | 'application_strategy'
  | 'test_preparation'
  | 'relationship_building'
  | 'crisis_management'
  | 'content_development'
  | 'strategic_positioning'
  | 'execution'
  | 'depth_exploration'
  | 'skill_acquisition'
  | 'personal_branding';

interface FrameworkStepDefinition {
  step_number: number;
  step_name: string;
  step_description: string;
  step_purpose: string;
  typical_duration?: string;
  completion_criteria?: string;
}

interface EffectivenessData {
  times_applied: number;
  success_rate: number;              // 0-100
  average_outcome_score: number;     // If measured
  student_satisfaction: number;      // 1-10
  coach_confidence: number;          // 1-10
}

// Framework Application Instance

interface FrameworkApplication {
  application_id: string;
  framework_id: string;
  framework_name: string;

  // Where Applied
  applied_to_outcomes: string[];
  applied_to_execution_items: string[];
  applied_to_tasks: string[];

  // Application Details
  application_date: string;
  applied_by: string;
  application_context: string;       // Why this framework for this situation

  // Progress
  current_step?: number;
  completed_steps: number[];
  step_progress: StepProgress[];

  // Effectiveness
  working_well: string[];
  challenges: string[];
  adjustments_made: string[];
  effectiveness_rating?: number;     // 1-10, assessed after completion

  // Learning
  insights_gained: string[];
  would_use_again: boolean;
  recommendations_for_others?: string;
}

interface StepProgress {
  step_number: number;
  step_name: string;
  is_completed: boolean;
  completed_date?: string;
  notes?: string;
  challenges_encountered?: string[];
  time_taken_minutes?: number;
}
```

### 5.2 Core Frameworks (from 2-Year Analysis)

**31 Frameworks Identified** - See Section 5.3 for full registry.

**Example: 8-Week Architecture Framework**

```typescript
const EIGHT_WEEK_ARCHITECTURE: FrameworkDefinition = {
  framework_id: "fw_001",
  framework_name: "8-Week Goal Architecture",
  framework_category: "time_management",

  short_description: "Break overwhelming goals into 8 weekly increments with specific numeric targets",
  full_description: "Transform long-term goals (1400 SAT → 1550) into achievable weekly milestones with concrete metrics. Creates strategic view separate from tactical execution.",
  origin_story: "Week 60, Jenny coaching session with Huda",

  applicable_domains: ["test_preparation", "skill_development", "academic", "creative_project"],
  applicable_situations: [
    "Student overwhelmed by large goal",
    "Long-term goal with measurable metric",
    "Need to build momentum through incremental wins"
  ],

  has_steps: true,
  steps: [
    {
      step_number: 1,
      step_name: "Identify Overwhelming Goal",
      step_description: "What feels impossible? What's the big target?",
      step_purpose: "Name the challenge clearly",
      completion_criteria: "Goal defined with current state and target state"
    },
    {
      step_number: 2,
      step_name: "Calculate Weekly Increment",
      step_description: "Divide gap by 8 weeks to get weekly target",
      step_purpose: "Make increments feel achievable",
      typical_duration: "5 minutes",
      completion_criteria: "Weekly target calculated (e.g., 50 SAT points/week)"
    },
    {
      step_number: 3,
      step_name: "Create 8-Week Tracker Document",
      step_description: "Visual document with Week 1-8 and targets",
      step_purpose: "Make progress visible and trackable",
      completion_criteria: "Document created with all 8 weeks mapped"
    },
    {
      step_number: 4,
      step_name: "Execute Week-by-Week",
      step_description: "Focus on one week's target at a time",
      step_purpose: "Build momentum through sequential wins",
      completion_criteria: "Week 8 target achieved"
    }
  ],

  evidence_source: "Week 60 transcript (2024-07-07)",
  effectiveness_data: {
    times_applied: 15,
    success_rate: 87,
    average_outcome_score: 8.5,
    student_satisfaction: 9,
    coach_confidence: 9
  },

  created_date: "2024-07-07",
  created_by: "Jenny (from coaching pattern analysis)",
  version: 1,
  tags: ["time_management", "goal_decomposition", "test_prep", "P3-JUNIOR"]
};
```

---

## 6. Integration with v10.8.2

### 6.1 Database Integration

**Existing `weekly_vitals` table** gets ONE new JSONB column:

```sql
-- Migration: Add action_plan column to weekly_vitals

ALTER TABLE weekly_vitals
ADD COLUMN action_plan JSONB;

-- Index for performance
CREATE INDEX idx_weekly_vitals_action_plan ON weekly_vitals USING gin(action_plan);

-- Index for queries by outcome domain
CREATE INDEX idx_action_plan_outcome_domain ON weekly_vitals USING gin((action_plan -> 'outcomes'));
```

### 6.2 Linking Strategy

**Two-Way Linking**:

1. **Action Plan → Weekly Vitals**: `linked_vitals_component` field
2. **Weekly Vitals → Action Plan**: Query by student_id + week_number

**Example Query**:

```sql
-- Get complete week (vitals + action plan)
SELECT
  w.week_number,
  w.academic_vitals,
  w.ec_details,
  w.award_details,
  w.program_details,
  w.action_plan
FROM weekly_vitals w
WHERE w.student_id = 'huda_001'
  AND w.week_number = 45;
```

### 6.3 UI Component Hierarchy

```
WeeklyVitalsCard (existing v10.8.2)
├── AcademicVitalsSection (existing)
├── ECDetailsSection (existing) - 10 activities
├── AwardDetailsSection (existing)
├── ProgramDetailsSection (existing)
└── **NEW** WeeklyActionPlanSection
     ├── OutcomesView (Goals with progress)
     ├── ExecutionItemsView (Action items)
     ├── TasksView (Granular tasks with CTAs)
     ├── TimeAllocationView (168-hour breakdown)
     ├── CriticalDatesView (Deadlines, milestones)
     └── ProgressSummaryView (Completion metrics, trends)
```

---

## 7. Example Implementations

### 7.1 Example 1: Test Prep Student (SAT Focus)

**Student Profile**: Junior, current SAT 1350, target 1500, 10 weeks available

```json
{
  "week_number": 12,
  "outcomes": [
    {
      "outcome_id": "out_001",
      "outcome_domain": "test_preparation",
      "outcome_type": "milestone",
      "outcome_scope": "weekly",
      "title": "Achieve 1400 SAT Practice Score",
      "description": "First milestone in 8-week architecture toward 1500",
      "purpose": "Establish baseline improvement from 1350",
      "target_metric": {
        "metric_type": "quantitative",
        "value": 1400,
        "unit": "SAT score",
        "comparison_operator": ">="
      },
      "current_metric": {
        "metric_type": "quantitative",
        "value": 1350,
        "unit": "SAT score"
      },
      "target_completion_date": "2024-03-10",
      "priority_level": "P1",
      "urgency_score": 7,
      "impact_score": 8,
      "completion_state": "in_progress",
      "completion_percentage": 50,
      "child_execution_items": ["exec_001", "exec_002", "exec_003"]
    }
  ],
  "execution_items": [
    {
      "execution_item_id": "exec_001",
      "parent_outcome_id": "out_001",
      "title": "Daily Math Practice - Khan Academy",
      "why": "Math is 50% of SAT, daily practice builds automaticity",
      "what": "Complete 30 minutes of targeted math modules daily",
      "how": "Khan Academy account, focus on algebra and geometry weak areas",
      "when": "Every evening 7:00-7:30pm after dinner",
      "who": "student",
      "execution_type": "practice",
      "priority_level": "P1",
      "is_recurring": true,
      "recurrence_pattern": {
        "frequency": "daily",
        "time_of_day": "7:00pm"
      },
      "child_tasks": ["task_001", "task_002", "task_003", "task_004", "task_005"]
    },
    {
      "execution_item_id": "exec_002",
      "parent_outcome_id": "out_001",
      "title": "Full Timed Practice Test",
      "why": "Simulates real test conditions, identifies weak areas",
      "what": "Complete full-length SAT practice test under timed conditions",
      "how": "College Board Practice Test #10, printed, with timer",
      "when": "Saturday morning 9:00am-12:30pm",
      "who": "student",
      "execution_type": "practice",
      "priority_level": "P0",
      "estimated_duration_minutes": 210,
      "child_tasks": ["task_006", "task_007"]
    }
  ],
  "time_allocation": {
    "total_hours_in_period": 168,
    "fixed_commitments": [
      { "block_type": "sleep", "hours_per_week": 56 },
      { "block_type": "school", "hours_per_week": 35 },
      { "block_type": "commute", "hours_per_week": 5 },
      { "block_type": "meals", "hours_per_week": 14 }
    ],
    "total_fixed_hours": 110,
    "outcome_allocations": [
      {
        "outcome_id": "out_001",
        "outcome_title": "Achieve 1400 SAT Practice Score",
        "hours_allocated": 7,
        "specific_time_blocks": ["Mon-Fri 7-7:30pm", "Sat 9am-12:30pm"],
        "priority_level": "P1",
        "is_sufficient": true
      }
    ],
    "available_hours": 51
  }
}
```

### 7.2 Example 2: Application Sprint Student

**Student Profile**: Senior, 3 essays due in 8 days, high pressure deadline

```json
{
  "week_number": 45,
  "outcomes": [
    {
      "outcome_id": "out_002",
      "outcome_domain": "application",
      "outcome_type": "achievement",
      "outcome_scope": "weekly",
      "title": "Submit Complete Cameron Impact Application",
      "description": "All 4 essays + application materials submitted before May 22 deadline",
      "purpose": "Full scholarship opportunity - $20k/year",
      "deeper_purpose": "Financial freedom to attend dream school without debt",
      "target_metric": {
        "metric_type": "binary",
        "value": "true",
        "comparison_operator": "=="
      },
      "target_completion_date": "2024-05-22T23:59:00Z",
      "is_time_bound": true,
      "priority_level": "P0",
      "urgency_score": 10,
      "impact_score": 10,
      "risk_if_missed": "Cannot apply - full scholarship opportunity lost forever",
      "completion_state": "in_progress",
      "completion_percentage": 25,
      "milestones": [
        {
          "milestone_id": "ms_001",
          "title": "Essay 2 Complete (Innovation)",
          "target_date": "2024-05-16",
          "is_completed": false
        },
        {
          "milestone_id": "ms_002",
          "title": "Essay 3 Complete (Leadership)",
          "target_date": "2024-05-18",
          "is_completed": false
        },
        {
          "milestone_id": "ms_003",
          "title": "Essay 4 Complete (Vision)",
          "target_date": "2024-05-20",
          "is_completed": false
        },
        {
          "milestone_id": "ms_004",
          "title": "All Essays Polished & Submitted",
          "target_date": "2024-05-22",
          "is_completed": false
        }
      ]
    }
  ],
  "critical_dates": [
    {
      "critical_date_id": "cd_001",
      "date_type": "scholarship_deadline",
      "title": "Cameron Impact Scholarship Deadline",
      "description": "All materials must be submitted via online portal",
      "date": "2024-05-22T23:59:00Z",
      "days_until": 8,
      "priority_level": "P0",
      "is_hard_deadline": true,
      "consequences_if_missed": "Cannot apply - $80k total scholarship lost",
      "has_sprint_plan": true,
      "sprint_plan": {
        "total_days_available": 8,
        "total_hours_needed": 12,
        "daily_breakdown": [
          {
            "day_number": 1,
            "date": "2024-05-14",
            "tasks": ["Outline Essay 2: Synthoria distribution innovation"],
            "hours_allocated": 1
          },
          {
            "day_number": 2,
            "date": "2024-05-15",
            "tasks": ["Draft Essay 2 complete"],
            "hours_allocated": 2
          },
          {
            "day_number": 3,
            "date": "2024-05-16",
            "tasks": ["Draft Essay 3: Empowering AI leadership"],
            "hours_allocated": 2
          },
          {
            "day_number": 4,
            "date": "2024-05-17",
            "tasks": ["Complete Essay 3 draft"],
            "hours_allocated": 2
          },
          {
            "day_number": 5,
            "date": "2024-05-18",
            "tasks": ["Draft Essay 4: Future vision"],
            "hours_allocated": 2
          },
          {
            "day_number": 6,
            "date": "2024-05-19",
            "tasks": ["Polish all 4 essays - round 1"],
            "hours_allocated": 2
          },
          {
            "day_number": 7,
            "date": "2024-05-20",
            "tasks": ["Final polish - round 2"],
            "hours_allocated": 1
          },
          {
            "day_number": 8,
            "date": "2024-05-21",
            "tasks": ["Submit application + verify submission"],
            "hours_allocated": 0.5
          }
        ],
        "content_recycling_sources": [
          "Stardew Valley essay (already adapted for Essay 1)",
          "Synthoria distribution story (use for Essay 2)",
          "Empowering AI board building (use for Essay 3)"
        ],
        "risk_factors": [
          "School finals week overlapping",
          "Limited evening hours after homework",
          "Potential technical issues with submission portal"
        ],
        "contingency_plan": "If behind schedule by Day 5, reduce polish time and submit Day 7 evening"
      }
    }
  ],
  "framework_applications": [
    {
      "framework_id": "fw_007",
      "framework_name": "Deadline Urgency Management",
      "applied_to_outcomes": ["out_002"],
      "application_context": "8 days, 3 essays remaining - extreme time pressure",
      "step_progress": [
        {
          "step_number": 1,
          "step_name": "Identify recyclable content",
          "is_completed": true,
          "notes": "Stardew, Synthoria, Empowering AI stories identified"
        },
        {
          "step_number": 2,
          "step_name": "Create daily sprint breakdown",
          "is_completed": true,
          "notes": "8-day plan created with 2-day increments per essay"
        },
        {
          "step_number": 3,
          "step_name": "Execute sprint",
          "is_completed": false
        }
      ]
    },
    {
      "framework_id": "fw_021",
      "framework_name": "Essay Recycling Strategy",
      "applied_to_execution_items": ["exec_004", "exec_005", "exec_006"],
      "application_context": "Need to write 3 essays quickly using existing content",
      "working_well": ["Stardew essay adapted perfectly for Q1", "Synthoria story is strong"],
      "challenges": ["Essay 4 has no existing content - must write from scratch"]
    }
  ]
}
```

### 7.3 Example 3: Extracurricular Growth Student

**Student Profile**: Sophomore, scaling nonprofit, building personal brand

```json
{
  "week_number": 60,
  "outcomes": [
    {
      "outcome_id": "out_003",
      "outcome_domain": "extracurricular",
      "outcome_type": "skill_acquisition",
      "outcome_scope": "multi_week",
      "title": "Launch Professional Instagram Account",
      "description": "Create and launch personal brand account as '16-year-old game developer'",
      "purpose": "Build digital portfolio and audience before game launch",
      "deeper_purpose": "Establish credibility as young developer for college applications",
      "target_metric": {
        "metric_type": "qualitative",
        "value": "Account created with 8+ posts documenting game development"
      },
      "target_completion_date": "2024-09-01",
      "priority_level": "P2",
      "child_execution_items": ["exec_007", "exec_008", "exec_009"]
    },
    {
      "outcome_id": "out_004",
      "outcome_domain": "entrepreneurship",
      "outcome_type": "milestone",
      "outcome_scope": "weekly",
      "title": "Acquire 3 Video Production Clients",
      "description": "Secure first 3 paying clients for video advertising services",
      "purpose": "Launch video production business, gain portfolio work",
      "deeper_purpose": "Demonstrate entrepreneurship and scale beyond game development",
      "target_metric": {
        "metric_type": "quantitative",
        "value": 3,
        "unit": "clients",
        "comparison_operator": ">="
      },
      "current_metric": {
        "metric_type": "quantitative",
        "value": 2,
        "unit": "clients"
      },
      "target_completion_date": "2024-07-14",
      "priority_level": "P1",
      "child_execution_items": ["exec_010", "exec_011"]
    }
  ],
  "execution_items": [
    {
      "execution_item_id": "exec_007",
      "parent_outcome_id": "out_003",
      "title": "Create Instagram Account",
      "why": "Need platform to document game development journey publicly",
      "what": "Set up professional Instagram account with bio, profile photo",
      "how": "Create account, write bio as '16-year-old game developer', link to website",
      "when": "This weekend (July 7-8)",
      "who": "student",
      "execution_type": "creation",
      "priority_level": "P2",
      "estimated_duration_minutes": 30,
      "child_tasks": ["task_010"]
    },
    {
      "execution_item_id": "exec_010",
      "parent_outcome_id": "out_004",
      "title": "Follow Up with 2 Interested Businesses",
      "why": "Need to convert interest into commitments - close deals",
      "what": "Email 2 businesses from last event with detailed service offerings",
      "how": "Draft email: services offered, pricing, portfolio samples, next steps",
      "when": "Monday morning (July 9)",
      "who": "student",
      "execution_type": "communication",
      "priority_level": "P1",
      "estimated_duration_minutes": 45,
      "child_tasks": ["task_011", "task_012"]
    }
  ],
  "context": {
    "week_number": 60,
    "student_wellbeing": {
      "stress_level": 6,
      "energy_level": 7,
      "confidence_level": 8,
      "motivation_level": 9,
      "mood": "Excited about new projects but slightly overwhelmed by scope",
      "challenges_noted": ["Computer broke - screen detached", "Multiple projects starting simultaneously"],
      "burnout_risk": "moderate"
    },
    "significant_events": [
      {
        "event_type": "setback",
        "title": "Computer Hardware Failure",
        "description": "Laptop screen detached from keyboard while editing video",
        "date": "2024-07-05",
        "emotional_impact": "Stressful initially but handled well",
        "actions_taken": ["Found recovery files", "Identified backup laptop", "Adjusted timeline"],
        "lessons_learned": ["Always backup work", "Have contingency hardware plan"]
      },
      {
        "event_type": "achievement",
        "title": "Found 2 Potential Video Clients",
        "description": "Pitched video advertising services at local business event, 2 businesses interested",
        "date": "2024-07-06",
        "emotional_impact": "Confidence boost",
        "lessons_learned": ["First three clients are hardest - on track"]
      }
    ],
    "coach_observations": [
      "Strong progress on multiple fronts despite computer setback",
      "Excellent Figma designs for personal website - readiness demonstrated",
      "Need to ensure not overcommitting with too many simultaneous projects",
      "Personal brand positioning is clear: '16-year-old game developer'"
    ],
    "student_reflections": [
      "Computer breaking was scary but I handled it",
      "Excited to finally launch Instagram and show my work",
      "First two clients feel validating - not just beginner's luck"
    ]
  },
  "framework_applications": [
    {
      "framework_id": "fw_002",
      "framework_name": "8-Week Goal Architecture",
      "applied_to_outcomes": ["out_003"],
      "application_context": "8 weeks to launch Instagram with consistent content",
      "current_step": 1,
      "step_progress": [
        {
          "step_number": 1,
          "step_name": "Week 1: Create account only",
          "is_completed": false
        }
      ]
    },
    {
      "framework_id": "fw_020",
      "framework_name": "First Three Principle",
      "applied_to_outcomes": ["out_004"],
      "application_context": "Acquiring first 3 video clients - acknowledging initial friction",
      "working_well": ["Found 2 clients quickly at first event"],
      "challenges": ["Need sustained outreach to find #3"],
      "effectiveness_rating": 8
    },
    {
      "framework_id": "fw_022",
      "framework_name": "Personal Brand Framework",
      "applied_to_outcomes": ["out_003"],
      "application_context": "Positioning as '16-year-old game developer'",
      "insights_gained": [
        "Age + specialty = clear brand",
        "Start with game, expand later to other projects"
      ]
    }
  ]
}
```

---

## 8. Database Schema

### 8.1 Migration SQL

```sql
-- ========================================
-- MIGRATION: Add Weekly Action Plan to weekly_vitals
-- Version: 1.0
-- Date: 2025-10-27
-- ========================================

-- Step 1: Add action_plan JSONB column
ALTER TABLE weekly_vitals
ADD COLUMN action_plan JSONB DEFAULT NULL;

-- Step 2: Add GIN index for JSONB performance
CREATE INDEX idx_weekly_vitals_action_plan
ON weekly_vitals USING gin(action_plan);

-- Step 3: Add indexes for common queries
CREATE INDEX idx_action_plan_outcomes
ON weekly_vitals USING gin((action_plan -> 'outcomes'));

CREATE INDEX idx_action_plan_execution_items
ON weekly_vitals USING gin((action_plan -> 'execution_items'));

CREATE INDEX idx_action_plan_tasks
ON weekly_vitals USING gin((action_plan -> 'tasks'));

-- Step 4: Add index for outcome domain filtering
CREATE INDEX idx_action_plan_outcome_domain
ON weekly_vitals ((action_plan -> 'outcomes' -> 0 ->> 'outcome_domain'));

-- Step 5: Add index for priority filtering
CREATE INDEX idx_action_plan_priority
ON weekly_vitals ((action_plan -> 'outcomes' -> 0 ->> 'priority_level'));

-- Step 6: Add index for completion state
CREATE INDEX idx_action_plan_completion_state
ON weekly_vitals ((action_plan -> 'outcomes' -> 0 ->> 'completion_state'));

-- Step 7: Comment the column
COMMENT ON COLUMN weekly_vitals.action_plan IS
'Weekly Action Plan & Tasks - Contains outcomes, execution items, tasks, time allocation, critical dates, progress tracking, and context. See docs/guides/WEEKLY_ACTION_PLAN_SPEC_V1.0.md for full schema.';
```

### 8.2 Example Queries

```sql
-- Query 1: Get all outcomes for a student for a specific week
SELECT
  week_number,
  jsonb_array_elements(action_plan -> 'outcomes') as outcome
FROM weekly_vitals
WHERE student_id = 'huda_001'
  AND week_number = 45;

-- Query 2: Find all P0 outcomes across all weeks
SELECT
  week_number,
  outcome ->> 'title' as outcome_title,
  outcome ->> 'target_completion_date' as deadline
FROM weekly_vitals,
     jsonb_array_elements(action_plan -> 'outcomes') as outcome
WHERE student_id = 'huda_001'
  AND outcome ->> 'priority_level' = 'P0'
ORDER BY week_number;

-- Query 3: Get progress summary for last 4 weeks
SELECT
  week_number,
  action_plan -> 'progress_tracking' -> 'completion_metrics' ->> 'overall_completion_percentage' as completion,
  action_plan -> 'progress_tracking' -> 'completion_metrics' ->> 'outcome_completion_rate' as outcome_rate,
  action_plan -> 'progress_tracking' -> 'trend_analysis' ->> 'momentum' as momentum
FROM weekly_vitals
WHERE student_id = 'huda_001'
  AND week_number >= (SELECT MAX(week_number) - 3 FROM weekly_vitals WHERE student_id = 'huda_001')
ORDER BY week_number DESC;

-- Query 4: Find blocked items across all weeks
SELECT
  week_number,
  outcome ->> 'title' as blocked_outcome,
  outcome -> 'blocked_by' ->> 'description' as blocker_description
FROM weekly_vitals,
     jsonb_array_elements(action_plan -> 'outcomes') as outcome
WHERE student_id = 'huda_001'
  AND outcome ->> 'completion_state' = 'blocked';

-- Query 5: Get critical dates in next 2 weeks
SELECT
  cd ->> 'title' as critical_date_title,
  cd ->> 'date' as date,
  cd ->> 'days_until' as days_until,
  cd ->> 'preparation_status' as status
FROM weekly_vitals,
     jsonb_array_elements(action_plan -> 'critical_dates') as cd
WHERE student_id = 'huda_001'
  AND (cd ->> 'days_until')::int <= 14
ORDER BY (cd ->> 'days_until')::int;

-- Query 6: Framework effectiveness analysis
SELECT
  fa ->> 'framework_name' as framework,
  COUNT(*) as times_used,
  AVG((fa ->> 'effectiveness_rating')::numeric) as avg_effectiveness
FROM weekly_vitals,
     jsonb_array_elements(action_plan -> 'framework_applications') as fa
WHERE student_id = 'huda_001'
  AND fa ->> 'effectiveness_rating' IS NOT NULL
GROUP BY fa ->> 'framework_name'
ORDER BY avg_effectiveness DESC;
```

---

## 9. Backend API Specification

### 9.1 Endpoints

```typescript
// ========================================
// GET /api/v10/students/:studentId/weeks/:weekNumber/action-plan
// ========================================
// Get complete action plan for specific week

interface GetActionPlanResponse {
  success: boolean;
  data: {
    week_number: number;
    student_id: string;
    action_plan: WeeklyActionPlan;
    linked_vitals: {
      academic_vitals: any;
      ec_details: any[];
      award_details: any[];
      program_details: any[];
    };
  };
}

// ========================================
// POST /api/v10/students/:studentId/weeks/:weekNumber/action-plan
// ========================================
// Create new action plan for week

interface CreateActionPlanRequest {
  action_plan: WeeklyActionPlan;
}

interface CreateActionPlanResponse {
  success: boolean;
  data: {
    plan_id: string;
    week_number: number;
    created_at: string;
  };
}

// ========================================
// PATCH /api/v10/students/:studentId/weeks/:weekNumber/action-plan
// ========================================
// Update existing action plan (partial update)

interface UpdateActionPlanRequest {
  updates: Partial<WeeklyActionPlan>;
}

// ========================================
// POST /api/v10/students/:studentId/weeks/:weekNumber/outcomes
// ========================================
// Add new outcome to week

interface AddOutcomeRequest {
  outcome: Outcome;
}

interface AddOutcomeResponse {
  success: boolean;
  data: {
    outcome_id: string;
    week_number: number;
  };
}

// ========================================
// PATCH /api/v10/students/:studentId/weeks/:weekNumber/outcomes/:outcomeId
// ========================================
// Update specific outcome

interface UpdateOutcomeRequest {
  updates: Partial<Outcome>;
}

// ========================================
// POST /api/v10/students/:studentId/weeks/:weekNumber/outcomes/:outcomeId/execution-items
// ========================================
// Add execution item under outcome

interface AddExecutionItemRequest {
  execution_item: ExecutionItem;
}

// ========================================
// PATCH /api/v10/students/:studentId/weeks/:weekNumber/execution-items/:executionItemId
// ========================================
// Update execution item

interface UpdateExecutionItemRequest {
  updates: Partial<ExecutionItem>;
}

// ========================================
// POST /api/v10/students/:studentId/weeks/:weekNumber/execution-items/:executionItemId/tasks
// ========================================
// Add task under execution item

interface AddTaskRequest {
  task: Task;
}

// ========================================
// PATCH /api/v10/students/:studentId/weeks/:weekNumber/tasks/:taskId
// ========================================
// Update task (most common: mark complete)

interface UpdateTaskRequest {
  updates: Partial<Task>;
}

interface UpdateTaskResponse {
  success: boolean;
  data: {
    task_id: string;
    completion_state: CompletionState;
    completed_date?: string;
  };
}

// ========================================
// POST /api/v10/students/:studentId/weeks/:weekNumber/tasks/:taskId/complete
// ========================================
// Mark task complete with proof

interface CompleteTaskRequest {
  completion_proof?: string;
  proof_artifacts?: ProofArtifact[];
  completion_notes?: string;
  actual_duration_minutes?: number;
}

// ========================================
// GET /api/v10/students/:studentId/action-plans/summary
// ========================================
// Get multi-week summary

interface GetActionPlanSummaryRequest {
  start_week?: number;
  end_week?: number;
  weeks_back?: number; // Alternative: last N weeks
}

interface GetActionPlanSummaryResponse {
  success: boolean;
  data: {
    student_id: string;
    weeks_analyzed: number[];
    aggregate_metrics: {
      total_outcomes: number;
      completed_outcomes: number;
      overall_completion_rate: number;
      total_hours_estimated: number;
      total_hours_actual: number;
      time_efficiency_ratio: number;
    };
    trends: {
      outcome_completion_trend: 'improving' | 'steady' | 'declining';
      momentum: 'accelerating' | 'steady' | 'decelerating';
    };
    chronic_bottlenecks: string[];
    top_frameworks_used: Array<{
      framework_name: string;
      times_applied: number;
      avg_effectiveness: number;
    }>;
  };
}

// ========================================
// GET /api/v10/students/:studentId/critical-dates
// ========================================
// Get upcoming critical dates across all weeks

interface GetCriticalDatesRequest {
  days_ahead?: number; // Default 30
  priority_filter?: PriorityLevel[];
  date_type_filter?: CriticalDateType[];
}

interface GetCriticalDatesResponse {
  success: boolean;
  data: {
    critical_dates: Array<{
      critical_date: CriticalDate;
      week_number: number;
      related_outcomes_count: number;
      preparation_status: string;
    }>;
  };
}

// ========================================
// POST /api/v10/students/:studentId/weeks/:weekNumber/frameworks/apply
// ========================================
// Apply framework to outcomes/items

interface ApplyFrameworkRequest {
  framework_id: string;
  apply_to_outcomes?: string[];
  apply_to_execution_items?: string[];
  apply_to_tasks?: string[];
  application_context: string;
}

interface ApplyFrameworkResponse {
  success: boolean;
  data: {
    application_id: string;
    framework_name: string;
    steps_generated?: StepProgress[];
  };
}

// ========================================
// GET /api/v10/frameworks
// ========================================
// Get all registered frameworks

interface GetFrameworksResponse {
  success: boolean;
  data: {
    frameworks: FrameworkDefinition[];
    categories: FrameworkCategory[];
  };
}

// ========================================
// GET /api/v10/frameworks/:frameworkId
// ========================================
// Get specific framework details

interface GetFrameworkResponse {
  success: boolean;
  data: {
    framework: FrameworkDefinition;
    usage_stats: {
      times_applied: number;
      success_rate: number;
      avg_effectiveness: number;
    };
  };
}
```

### 9.2 Implementation Notes

**Backend File**: `/services/agent-framework/src/routes/v10.0.ts`

**Key Functions**:

1. **JSONB Manipulation**: Use PostgreSQL JSONB operators (`->`, `->>`, `jsonb_set()`)
2. **Nested Updates**: Use `jsonb_set()` with path arrays for deep updates
3. **Array Operations**: Use `jsonb_array_elements()` for querying arrays
4. **Validation**: JSON Schema validation on all action plan mutations
5. **Atomic Updates**: Wrap multi-entity updates in transactions

---

## 10. Frontend Component Design

### 10.1 Component Hierarchy

```
/unified-frontend/apps/unified-app/src/components/v10/

WeeklyActionPlanCard.tsx (NEW)
├── WeeklyActionPlanHeader.tsx
│   ├── Week selector
│   ├── Progress ring (overall completion)
│   └── View toggle (Outcomes / Execution / Timeline)
│
├── OutcomesView.tsx
│   ├── OutcomeCard.tsx (each outcome)
│   │   ├── Outcome header (title, domain icon, priority)
│   │   ├── Progress bar
│   │   ├── Metrics (target vs current)
│   │   ├── Why section (expandable depth)
│   │   ├── Linked vitals component preview
│   │   └── Child execution items (expandable)
│   │        └── ExecutionItemCard.tsx
│   │             ├── Execution item header
│   │             ├── Five W's (Why/What/How/When/Who)
│   │             ├── Time estimate vs actual
│   │             └── Child tasks (expandable)
│   │                  └── TaskCard.tsx
│   │                       ├── Task checkbox
│   │                       ├── Specific CTA
│   │                       ├── Scheduled time
│   │                       └── Quick complete button
│   │
│   └── OutcomeFilters.tsx
│       ├── Filter by domain
│       ├── Filter by priority
│       ├── Filter by completion state
│       └── Sort options
│
├── ExecutionItemsView.tsx
│   ├── Flat list view of all execution items
│   ├── Grouped by priority or domain
│   └── Quick action buttons
│
├── TasksView.tsx
│   ├── Today's Tasks section
│   ├── This Week's Tasks section
│   ├── Overdue Tasks section
│   └── Task quick complete with proof upload
│
├── TimeAllocationView.tsx
│   ├── 168-hour breakdown visual
│   ├── Fixed commitments pie chart
│   ├── Outcome allocations bar chart
│   └── Available hours indicator
│
├── CriticalDatesTimeline.tsx
│   ├── Timeline visualization
│   ├── Critical date cards
│   │   ├── Date indicator
│   │   ├── Days until
│   │   ├── Preparation status
│   │   └── Sprint plan (if applicable)
│   └── Milestone markers
│
├── ProgressSummaryView.tsx
│   ├── Completion metrics cards
│   ├── Week-over-week trend graph
│   ├── Time efficiency chart
│   ├── Bottlenecks list
│   ├── Wins celebration section
│   └── Reflections panel
│
└── FrameworkApplicationsView.tsx
    ├── Active frameworks list
    ├── Framework step progress
    └── Framework effectiveness ratings
```

### 10.2 Key Components Implementation

```typescript
// WeeklyActionPlanCard.tsx

import React, { useState } from 'react';
import { WeeklyActionPlan } from '@/types/v10';

interface WeeklyActionPlanCardProps {
  studentId: string;
  weekNumber: number;
  actionPlan: WeeklyActionPlan;
  onUpdate: (updates: Partial<WeeklyActionPlan>) => Promise<void>;
}

export const WeeklyActionPlanCard: React.FC<WeeklyActionPlanCardProps> = ({
  studentId,
  weekNumber,
  actionPlan,
  onUpdate
}) => {
  const [view, setView] = useState<'outcomes' | 'execution' | 'tasks' | 'timeline'>('outcomes');

  const overallCompletion = actionPlan.progress_tracking?.completion_metrics?.overall_completion_percentage || 0;

  return (
    <div className="weekly-action-plan-card">
      <WeeklyActionPlanHeader
        weekNumber={weekNumber}
        overallCompletion={overallCompletion}
        currentView={view}
        onViewChange={setView}
      />

      {view === 'outcomes' && (
        <OutcomesView
          outcomes={actionPlan.outcomes}
          executionItems={actionPlan.execution_items}
          tasks={actionPlan.tasks}
          onUpdateOutcome={(outcomeId, updates) => {
            // Update specific outcome
          }}
        />
      )}

      {view === 'execution' && (
        <ExecutionItemsView
          executionItems={actionPlan.execution_items}
          tasks={actionPlan.tasks}
          onUpdateExecutionItem={(itemId, updates) => {
            // Update specific execution item
          }}
        />
      )}

      {view === 'tasks' && (
        <TasksView
          tasks={actionPlan.tasks}
          onCompleteTask={(taskId, proof) => {
            // Mark task complete
          }}
        />
      )}

      {view === 'timeline' && (
        <CriticalDatesTimeline
          criticalDates={actionPlan.critical_dates}
          outcomes={actionPlan.outcomes}
        />
      )}
    </div>
  );
};
```

```typescript
// OutcomeCard.tsx

interface OutcomeCardProps {
  outcome: Outcome;
  executionItems: ExecutionItem[];
  tasks: Task[];
  onUpdate: (updates: Partial<Outcome>) => void;
}

export const OutcomeCard: React.FC<OutcomeCardProps> = ({
  outcome,
  executionItems,
  tasks,
  onUpdate
}) => {
  const [expanded, setExpanded] = useState(false);

  const childExecutionItems = executionItems.filter(
    item => outcome.child_execution_items.includes(item.execution_item_id)
  );

  const domainIcon = getDomainIcon(outcome.outcome_domain);
  const priorityColor = getPriorityColor(outcome.priority_level);

  return (
    <div className={`outcome-card priority-${outcome.priority_level.toLowerCase()}`}>
      <div className="outcome-header">
        <span className="domain-icon">{domainIcon}</span>
        <h3>{outcome.title}</h3>
        <span className={`priority-badge ${priorityColor}`}>
          {outcome.priority_level}
        </span>
        <span className={`completion-state ${outcome.completion_state}`}>
          {outcome.completion_state}
        </span>
      </div>

      <div className="outcome-progress">
        <ProgressBar percentage={outcome.completion_percentage} />
        <span>{outcome.completion_percentage}% complete</span>
      </div>

      <div className="outcome-metrics">
        <div className="metric current">
          <label>Current</label>
          <span>{formatMetric(outcome.current_metric)}</span>
        </div>
        <div className="metric-arrow">→</div>
        <div className="metric target">
          <label>Target</label>
          <span>{formatMetric(outcome.target_metric)}</span>
        </div>
      </div>

      {expanded && (
        <div className="outcome-details">
          <div className="why-section">
            <h4>Why This Matters</h4>
            <p>{outcome.purpose}</p>
            {outcome.deeper_purpose && (
              <details>
                <summary>Deeper Purpose</summary>
                <p>{outcome.deeper_purpose}</p>
              </details>
            )}
            {outcome.critical_importance && (
              <details>
                <summary>Critical Importance</summary>
                <p>{outcome.critical_importance}</p>
              </details>
            )}
          </div>

          <div className="execution-items-section">
            <h4>How We'll Achieve This</h4>
            {childExecutionItems.map(item => (
              <ExecutionItemCard
                key={item.execution_item_id}
                executionItem={item}
                tasks={tasks.filter(t => item.child_tasks.includes(t.task_id))}
                onUpdate={updates => {/* Update execution item */}}
              />
            ))}
          </div>

          {outcome.milestones.length > 0 && (
            <div className="milestones-section">
              <h4>Milestones</h4>
              {outcome.milestones.map(milestone => (
                <MilestoneCard
                  key={milestone.milestone_id}
                  milestone={milestone}
                  onToggleComplete={() => {/* Toggle milestone */}}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        className="expand-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show Less' : 'Show More'}
      </button>
    </div>
  );
};
```

```typescript
// TaskCard.tsx

interface TaskCardProps {
  task: Task;
  onComplete: (proof?: ProofArtifact[]) => void;
  onUpdate: (updates: Partial<Task>) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onUpdate
}) => {
  const [showProofUpload, setShowProofUpload] = useState(false);

  const isCompleted = task.completion_state === 'completed';
  const isOverdue = !isCompleted && new Date(task.target_completion_date) < new Date();

  return (
    <div className={`task-card ${task.completion_state} ${isOverdue ? 'overdue' : ''}`}>
      <div className="task-header">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => {
            if (task.verification_evidence_required) {
              setShowProofUpload(true);
            } else {
              onComplete();
            }
          }}
        />
        <span className="task-title">{task.title}</span>
        {task.is_recurring && <span className="recurring-badge">↻</span>}
      </div>

      <div className="task-cta">
        <strong>Action:</strong> {task.specific_call_to_action}
      </div>

      {task.scheduled_time && (
        <div className="task-schedule">
          <span>⏰ {task.scheduled_time}</span>
        </div>
      )}

      <div className="task-metadata">
        <span>{task.estimated_duration_minutes} min</span>
        <span>Due: {formatDate(task.target_completion_date)}</span>
      </div>

      {showProofUpload && (
        <ProofUploadModal
          task={task}
          onSubmit={proof => {
            onComplete(proof);
            setShowProofUpload(false);
          }}
          onCancel={() => setShowProofUpload(false)}
        />
      )}
    </div>
  );
};
```

---

## 11. Migration & Data Strategy

### 11.1 Migration Plan

**Phase 1: Schema Migration (Week 1)**
- Add `action_plan` JSONB column to `weekly_vitals`
- Add indexes
- Test queries on empty column

**Phase 2: Backend API (Week 2-3)**
- Implement all endpoints in `/services/agent-framework/src/routes/v10.0.ts`
- Add validation schemas
- Write unit tests

**Phase 3: Frontend Components (Week 4-5)**
- Build component hierarchy
- Implement OutcomesView first (MVP)
- Add TasksView
- Add TimeAllocationView

**Phase 4: Data Population (Week 6)**
- Manually populate Week 45 (Cameron deadline example)
- Manually populate Week 60 (8-week architecture example)
- Validate UI rendering

**Phase 5: Framework Library (Week 7)**
- Register all 31 frameworks
- Add framework application UI
- Test framework tracking

**Phase 6: Full Integration (Week 8)**
- Integrate with WeeklyVitals component
- Add linking between vitals and action plan
- End-to-end testing

### 11.2 Backward Compatibility

- Existing `weekly_vitals` rows work unchanged
- `action_plan` is nullable - no impact on existing data
- v10.8.2 UI continues working without action plan data

### 11.3 Testing Strategy

**Unit Tests**:
- JSONB query correctness
- Nested update logic
- Completion state transitions

**Integration Tests**:
- Full CRUD for outcomes/items/tasks
- Multi-week queries
- Framework application

**E2E Tests**:
- Create outcome → add execution item → add task → complete task
- Sprint plan execution workflow
- Time allocation updates

---

## 12. Appendix: Complete Framework Registry

### 12.1 All 31 Frameworks Extracted

1. **168-Hour Framework** (Week 1) - Time allocation
2. **8-Week Goal Architecture** (Week 60) - Goal decomposition
3. **Strategic vs Tactical Split** - Planning separation
4. **Immediate Action Items** - Executable tasks
5. **Priority Levels (P0/P1/P2)** - Prioritization
6. **Status Tracking** - State management
7. **Deadline Sprint Planning** (Week 45) - Tight deadlines
8. **Essay Consolidation Protocol** (Week 70) - Content merging
9. **Application Strategy Tracking** - College applications
10. **SAT Score Progression Plan** (Week 60) - Test prep
11. **Test Technique Protocols** (Week 16) - Test-taking strategies
12. **Impact Maximization Principle** (Week 30) - Scaling impact
13. **Scale Amplification Framework** (Week 20) - Individual → systemic
14. **Publication Award Psychology** (Week 30) - Framing opportunities
15. **Recommendation Relationship Sequence** (Week 30) - Teacher relationships
16. **Teacher Diversification Strategy** (Week 20) - Recommender pool
17. **Crisis Response Formula** (Week 10) - Emotional management
18. **Deadline Urgency Management** (Week 45) - Sprint execution
19. **Tutorial Combination Strategy** (Week 89) - Skill acquisition
20. **First Three Principle** (Week 60) - Initial friction acknowledgment
21. **Essay Recycling Strategy** (Week 20) - Content reuse
22. **Personal Brand Framework** (Week 60) - Identity positioning
23. **Social Launch Sequence** (Week 60) - Platform launch
24. **10-Spot College Strategy** (Week 45) - College list structure
25. **Legacy Organization Insight** (Week 20) - Strategic alignment
26. **Major Discovery Pivot** (Week 45) - Narrative reframe
27. **Milestone Celebration Pattern** (Week 89) - Momentum maintenance
28. **Voice Reading Validation** (Week 89) - Essay review
29. **Information Minimization** (Week 89) - Privacy protection
30. **Why-Ladder Technique** (Week 20) - Depth exploration
31. **Intellectual Curiosity Hook** (Week 89) - Scholarly framing

---

## 13. Conclusion & Next Steps

This specification provides a **universal, extensible, First Principles-based architecture** for Weekly Action Plans & Tasks that:

✅ Works for ANY student profile (college-bound, career-focused, skill-building, etc.)
✅ Uses semantic, self-documenting naming conventions
✅ Extensible through open enums and custom fields
✅ Separates strategy (outcomes) from tactics (execution) from operations (tasks)
✅ Integrates seamlessly with existing v10.8.2 weekly vitals
✅ Tracks 31 proven coaching frameworks from 2 years of real sessions
✅ Provides comprehensive progress tracking and analytics

**Next Steps**:
1. **User Review**: Review this spec and provide feedback/approvals
2. **Refinement**: Adjust based on feedback
3. **Implementation**: Begin Phase 1 (Schema Migration)

**Questions for User**:
- Does this schema meet your requirements for tactical task management?
- Any domains, frameworks, or patterns missing from the 2-year analysis?
- Should we prioritize certain views (Outcomes vs Tasks vs Timeline)?
- Any specific UI/UX requirements for mobile vs desktop?

---

**Document Version**: 1.0
**Status**: Ready for Review
**Next Update**: After user feedback
