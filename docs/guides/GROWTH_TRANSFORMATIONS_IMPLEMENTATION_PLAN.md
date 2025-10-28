# Growth Transformations Tab - Implementation Plan
**Version:** v13.1
**Date:** 2025-10-28
**Status:** 📋 PLANNING - Ready for Review

---

## Executive Summary

The Growth Transformations tab consolidates the student's **entire college prep journey** into a unified, chronological timeline that showcases both:
1. **Tangible Profile Growth** - Applications, test scores, awards, projects, programs
2. **Human Transformational Growth** - Breakthroughs, barrier navigation, identity development

**Target Users:** Students AND Parents
**Key Value:** Quickly see the complete journey from start to current state with all major milestones

---

## Data Architecture

### Event Types & Sources

#### 1. Growth Events (Breakthroughs)
**Source:** `growth_events` table
**Types:** SELF_IMAGE, PARENT_CONFLICT, INTERNAL_CONFIDENCE, MOTIVATION_DROP, TIME_MANAGEMENT, BURNOUT, SOCIAL_EXCLUSION, NEURODIVERSITY
**Fields:**
- `barrier_type` - Type of growth event
- `trigger` - What prompted the breakthrough
- `coach_reflection` - Coach's analysis
- `student_reflection` - Private student notes (if shared)
- `breakthrough` - Boolean flag
- `transformation_delta` - Magnitude (0-1)
- `occurred_at` - Date

**Example:**
```json
{
  "type": "growth_event",
  "barrier_type": "SELF_IMAGE",
  "title": "SELF_IMAGE Breakthrough",
  "date": "2023-06-21",
  "description": "Jenny synthesized Huda's film and CS interests into unified \"digital storyteller\" identity...",
  "impact": "Major",
  "breakthrough": true
}
```

#### 2. Phase Transitions
**Source:** Derived from `growth_events` or coaching session milestones
**Types:** Foundation Phase → Build Phase → Application Phase → Decision Phase
**Fields:**
- `phase_name` - Name of new phase
- `occurred_at` - Date of transition
- `description` - What this phase focuses on

**Example:**
```json
{
  "type": "phase_transition",
  "phase": "Application Phase",
  "date": "2024-08-01",
  "description": "Began college applications and essay writing"
}
```

#### 3. Academic Milestones
**Source:** `students` table + test score chips
**Types:** GPA updates, SAT/ACT scores, AP scores, Subject tests
**Fields:**
- `milestone_type` - "GPA" | "SAT" | "ACT" | "AP"
- `value` - Score/GPA
- `occurred_at` - Date achieved

**Example:**
```json
{
  "type": "academic",
  "milestone": "SAT Score: 1530",
  "date": "2024-08-24",
  "description": "Final SAT score achieved",
  "score": 1530,
  "improvement": "+50 from previous"
}
```

#### 4. Applications
**Source:** College applications data (to be determined - may need new table or JSONB in students)
**Types:** REA, EA, RD, UC applications
**Fields:**
- `college_name` - Name of college
- `application_type` - "REA" | "EA" | "RD" | "UC"
- `submitted_at` - Submission date
- `decision` - Optional: "Accepted" | "Waitlisted" | "Denied"

**Example:**
```json
{
  "type": "application",
  "title": "Stanford REA Submitted",
  "date": "2024-11-01",
  "description": "Submitted Restrictive Early Action to Stanford",
  "application_type": "REA"
}
```

#### 5. Projects
**Source:** Project chips or dedicated projects table
**Types:** Project milestones, launches, versions
**Fields:**
- `project_name` - Name of project
- `milestone` - "Started" | "Alpha" | "Beta" | "Launch" | "Episode"
- `occurred_at` - Date
- `description` - Details
- `impact_metrics` - Optional: users reached, episodes published, etc.

**Example:**
```json
{
  "type": "project",
  "title": "AI Game: Beta Launch",
  "date": "2024-06-01",
  "description": "Released beta version to 100+ testers",
  "project": "AI Ethics Game",
  "milestone": "Beta Launch"
}
```

#### 6. Awards & Recognition
**Source:** Awards chips
**Types:** National, State, Regional awards
**Fields:**
- `award_name` - Name of award
- `level` - "National" | "State" | "Regional" | "School"
- `occurred_at` - Date received
- `description` - Award details

**Example:**
```json
{
  "type": "award",
  "title": "NCWIT Aspirations Award Winner",
  "date": "2024-03-15",
  "description": "Won national award for women in computing",
  "level": "National"
}
```

#### 7. Programs & Summer Experiences
**Source:** Programs chips or extracurricular data
**Types:** Summer programs, bootcamps, competitions
**Fields:**
- `program_name` - Name of program
- `occurred_at` - Start date
- `duration` - Length of program
- `description` - Program details

**Example:**
```json
{
  "type": "program",
  "title": "Kode With Klossy",
  "date": "2023-08-01",
  "description": "Summer coding bootcamp",
  "duration": "2 weeks"
}
```

---

## Database Schema Enhancement

### Option 1: Timeline Events View (RECOMMENDED)
Create a unified view that aggregates from multiple sources:

```sql
CREATE OR REPLACE VIEW v_timeline_events AS
-- Growth Events
SELECT
  id,
  student_id,
  'growth_event' as event_type,
  barrier_type as subtype,
  barrier_type || ' Breakthrough' as title,
  occurred_at as event_date,
  coach_reflection as description,
  CASE
    WHEN transformation_delta >= 0.8 THEN 'major'
    WHEN transformation_delta >= 0.5 THEN 'moderate'
    ELSE 'minor'
  END as impact,
  jsonb_build_object(
    'breakthrough', breakthrough,
    'transformation_delta', transformation_delta,
    'trigger', trigger,
    'linked_artifacts', linked_artifacts
  ) as metadata,
  created_at
FROM growth_events
WHERE breakthrough = true

UNION ALL

-- Academic Milestones (SAT/ACT from chips)
SELECT
  id,
  student_id,
  'academic' as event_type,
  'test_score' as subtype,
  'SAT Score: ' || (source->'result'->>'score') as title,
  (source->'invoked_at')::date as event_date,
  'SAT score achieved' as description,
  'moderate' as impact,
  jsonb_build_object(
    'score', source->'result'->>'score',
    'test_type', 'SAT'
  ) as metadata,
  created_at
FROM chips
WHERE kind = 'SQL'
  AND source->>'resolver' LIKE '%test_score%'

UNION ALL

-- GPA Updates (from academic history)
-- TODO: Add when academic_history table is available

UNION ALL

-- Awards (from chips)
SELECT
  id,
  student_id,
  'award' as event_type,
  source->'result'->>'level' as subtype,
  source->'result'->>'award_name' as title,
  (source->'result'->>'date_received')::date as event_date,
  source->'result'->>'description' as description,
  'major' as impact,
  jsonb_build_object(
    'level', source->'result'->>'level',
    'organization', source->'result'->>'organization'
  ) as metadata,
  created_at
FROM chips
WHERE kind = 'SQL'
  AND source->>'resolver' = 'getStudentAwards'

-- TODO: Add projects, programs, applications when data sources available

ORDER BY event_date DESC;
```

### Option 2: Dedicated Timeline Events Table
If we need more control, create a dedicated table:

```sql
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'growth_event', 'phase_transition', 'academic',
    'application', 'project', 'award', 'program'
  )),
  subtype TEXT, -- More specific categorization
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('minor', 'moderate', 'major')),
  metadata JSONB DEFAULT '{}'::jsonb,
  source_table TEXT, -- Reference to original data
  source_id UUID, -- Reference to original record
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_events_student ON timeline_events(student_id, event_date DESC);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);
CREATE INDEX idx_timeline_events_impact ON timeline_events(impact) WHERE impact = 'major';
```

**Recommendation:** Start with **Option 1 (View)** for faster implementation, migrate to Option 2 if we need caching/performance optimization.

---

## Backend API

### Endpoint: GET /students/:studentId/timeline

**Location:** `services/agent-framework/src/routes/v10.0.ts` (or new `timeline.ts`)

**Query Parameters:**
- `start_date` - Optional: filter events from this date
- `end_date` - Optional: filter events to this date
- `event_types` - Optional: comma-separated list to filter (e.g., "growth_event,academic")
- `limit` - Optional: max events to return (default: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    student_id: "huda_001",
    timeline: [
      {
        id: "uuid",
        event_type: "growth_event",
        subtype: "SELF_IMAGE",
        title: "SELF_IMAGE Breakthrough",
        date: "2025-05-15",
        description: "Culmination of 219 coaching sessions...",
        impact: "major",
        metadata: {
          breakthrough: true,
          transformation_delta: 1.0,
          trigger: "Series of identity integration sessions"
        }
      },
      {
        id: "uuid",
        event_type: "phase_transition",
        subtype: null,
        title: "Phase Transition: Decision Phase",
        date: "2025-03-01",
        description: "Reviewing acceptances and making final choice",
        impact: "major",
        metadata: {
          previous_phase: "Application Phase",
          new_phase: "Decision Phase"
        }
      },
      // ... more events
    ],
    stats: {
      total_events: 47,
      breakthroughs: 6,
      academic_milestones: 8,
      applications: 10,
      awards: 4,
      projects: 12,
      programs: 2,
      phase_transitions: 4
    }
  }
}
```

**Implementation:**
```typescript
router.get('/students/:studentId/timeline', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { start_date, end_date, event_types, limit = 100 } = req.query;

    // Query the view or construct from multiple tables
    const query = `
      SELECT * FROM v_timeline_events
      WHERE student_id = $1
      ${start_date ? 'AND event_date >= $2' : ''}
      ${end_date ? 'AND event_date <= $3' : ''}
      ${event_types ? 'AND event_type = ANY($4)' : ''}
      ORDER BY event_date DESC
      LIMIT $5
    `;

    const result = await pool.query(query, [
      studentId,
      start_date,
      end_date,
      event_types?.split(','),
      limit
    ]);

    // Calculate stats
    const stats = {
      total_events: result.rows.length,
      breakthroughs: result.rows.filter(r =>
        r.event_type === 'growth_event' && r.metadata?.breakthrough
      ).length,
      // ... other counts
    };

    res.json({
      success: true,
      data: {
        student_id: studentId,
        timeline: result.rows,
        stats
      }
    });
  } catch (error) {
    console.error('Timeline fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Frontend Implementation

### 1. TypeScript Interfaces

**File:** `unified-frontend/apps/unified-app/src/types/timeline.ts`

```typescript
export type TimelineEventType =
  | 'growth_event'
  | 'phase_transition'
  | 'academic'
  | 'application'
  | 'project'
  | 'award'
  | 'program';

export type ImpactLevel = 'minor' | 'moderate' | 'major';

export interface TimelineEvent {
  id: string;
  event_type: TimelineEventType;
  subtype: string | null;
  title: string;
  date: string; // ISO date string
  description: string;
  impact: ImpactLevel;
  metadata: Record<string, any>;
}

export interface TimelineStats {
  total_events: number;
  breakthroughs: number;
  academic_milestones: number;
  applications: number;
  awards: number;
  projects: number;
  programs: number;
  phase_transitions: number;
}

export interface TimelineData {
  student_id: string;
  timeline: TimelineEvent[];
  stats: TimelineStats;
}

export interface TimelineFilters {
  start_date?: string;
  end_date?: string;
  event_types?: TimelineEventType[];
  search?: string;
}
```

### 2. API Service

**File:** `unified-frontend/apps/unified-app/src/utils/v10ApiService.ts`

```typescript
export async function fetchStudentTimeline(
  studentId: string,
  filters?: TimelineFilters
): Promise<TimelineData> {
  const params = new URLSearchParams();

  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.event_types?.length) {
    params.append('event_types', filters.event_types.join(','));
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${studentId}/timeline?${params}`,
    {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error(`Timeline fetch failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}
```

### 3. Main Component

**File:** `unified-frontend/apps/unified-app/src/components/student/GrowthTransformationsTab.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TimelineEvent, TimelineData, TimelineFilters } from '../../types/timeline';
import { fetchStudentTimeline } from '../../utils/v10ApiService';
import { TimelineView } from './TimelineView';
import { TimelineFiltersPanel } from './TimelineFiltersPanel';
import { TimelineStats } from './TimelineStats';

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin: 0;
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div`
  min-width: 0;
`;

const Sidebar = styled.div`
  @media (max-width: 968px) {
    order: -1;
  }
`;

interface GrowthTransformationsTabProps {
  studentId: string;
}

export const GrowthTransformationsTab: React.FC<GrowthTransformationsTabProps> = ({
  studentId
}) => {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimeline();
  }, [studentId, filters]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const data = await fetchStudentTimeline(studentId, filters);
      setTimelineData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Growth Transformations</Title>
        <Subtitle>
          Your complete college prep journey - from identity breakthroughs to college acceptances
        </Subtitle>
      </Header>

      <Content>
        <MainContent>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} onRetry={loadTimeline} />}
          {timelineData && (
            <TimelineView
              events={timelineData.timeline}
              onEventClick={(event) => console.log('Event clicked:', event)}
            />
          )}
        </MainContent>

        <Sidebar>
          {timelineData && (
            <>
              <TimelineStats stats={timelineData.stats} />
              <TimelineFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
              />
            </>
          )}
        </Sidebar>
      </Content>
    </Container>
  );
};

const LoadingState = styled.div`
  padding: 48px;
  text-align: center;
  color: #666;
`;

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry
}) => (
  <div>
    <p>Error: {message}</p>
    <button onClick={onRetry}>Retry</button>
  </div>
);
```

### 4. Timeline View Component

**File:** `unified-frontend/apps/unified-app/src/components/student/TimelineView.tsx`

```typescript
import React from 'react';
import styled from 'styled-components';
import { TimelineEvent } from '../../types/timeline';
import { TimelineEventCard } from './TimelineEventCard';

const Timeline = styled.div`
  position: relative;
  padding-left: 40px;

  &::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, #e0e0e0, transparent);
  }
`;

const YearSection = styled.div`
  margin-bottom: 48px;
`;

const YearLabel = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24px;
  padding-left: 20px;
`;

interface TimelineViewProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  onEventClick
}) => {
  // Group events by year
  const eventsByYear = events.reduce((acc, event) => {
    const year = new Date(event.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<number, TimelineEvent[]>);

  const years = Object.keys(eventsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <Timeline>
      {years.map(year => (
        <YearSection key={year}>
          <YearLabel>{year}</YearLabel>
          {eventsByYear[Number(year)].map(event => (
            <TimelineEventCard
              key={event.id}
              event={event}
              onClick={() => onEventClick?.(event)}
            />
          ))}
        </YearSection>
      ))}
    </Timeline>
  );
};
```

### 5. Event Card Component

**File:** `unified-frontend/apps/unified-app/src/components/student/TimelineEventCard.tsx`

```typescript
import React from 'react';
import styled from 'styled-components';
import { TimelineEvent } from '../../types/timeline';
import {
  Award,
  BookOpen,
  TrendingUp,
  FileText,
  Lightbulb,
  Calendar,
  Code
} from 'lucide-react';

const EVENT_COLORS = {
  growth_event: '#FF6B6B',
  phase_transition: '#4ECDC4',
  academic: '#45B7D1',
  application: '#96CEB4',
  project: '#FFEAA7',
  award: '#DDA15E',
  program: '#C77DFF',
};

const EVENT_ICONS = {
  growth_event: Lightbulb,
  phase_transition: TrendingUp,
  academic: BookOpen,
  application: FileText,
  project: Code,
  award: Award,
  program: Calendar,
};

const Card = styled.div<{ color: string }>`
  position: relative;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border-left: 4px solid ${props => props.color};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  &::before {
    content: '';
    position: absolute;
    left: -50px;
    top: 24px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${props => props.color};
    border: 3px solid white;
    box-shadow: 0 0 0 2px ${props => props.color};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`;

const IconContainer = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => props.color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

const Date = styled.div`
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
`;

const Description = styled.div`
  font-size: 15px;
  color: #666;
  line-height: 1.5;
`;

const Badge = styled.span<{ impact: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
  background: ${props =>
    props.impact === 'major' ? '#FFE5E5' :
    props.impact === 'moderate' ? '#FFF4E5' :
    '#F0F0F0'
  };
  color: ${props =>
    props.impact === 'major' ? '#FF4444' :
    props.impact === 'moderate' ? '#FF9900' :
    '#666'
  };
`;

interface TimelineEventCardProps {
  event: TimelineEvent;
  onClick?: () => void;
}

export const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
  event,
  onClick
}) => {
  const color = EVENT_COLORS[event.event_type] || '#666';
  const Icon = EVENT_ICONS[event.event_type] || Lightbulb;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card color={color} onClick={onClick}>
      <Header>
        <IconContainer color={color}>
          <Icon size={20} color={color} />
        </IconContainer>
        <Content>
          <Title>{event.title}</Title>
          <Date>{formatDate(event.date)}</Date>
          <Description>{event.description}</Description>
          {event.impact && (
            <Badge impact={event.impact}>
              {event.impact.toUpperCase()} IMPACT
            </Badge>
          )}
        </Content>
      </Header>
    </Card>
  );
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. ✅ Create implementation plan (this document)
2. Create database view for timeline events
3. Implement backend API endpoint
4. Create TypeScript interfaces
5. Build basic TimelineView component

**Deliverable:** Timeline displaying growth_events only

### Phase 2: Academic & Applications (Week 2)
1. Add academic milestones to view
2. Add application events (may need new data source)
3. Enhance timeline with year grouping
4. Add event type icons and colors

**Deliverable:** Timeline with growth + academic + apps

### Phase 3: Projects & Awards (Week 3)
1. Add projects from chips
2. Add awards from chips
3. Add programs data
4. Implement filters panel
5. Add stats sidebar

**Deliverable:** Complete timeline with all event types

### Phase 4: Polish & Features (Week 4)
1. Add search functionality
2. Add event detail modal
3. Add export to PDF
4. Add sharing functionality
5. Performance optimization
6. Mobile responsive design

**Deliverable:** Production-ready Growth Transformations tab

---

## Success Metrics

### User Experience
- ✅ Timeline loads in < 2 seconds
- ✅ Events grouped by year for easy navigation
- ✅ Clear visual distinction between event types
- ✅ Mobile-responsive design

### Data Accuracy
- ✅ All growth events displayed correctly
- ✅ Dates accurate to the day
- ✅ Event descriptions pulled from source data
- ✅ No duplicate events

### Parent & Student Value
- ✅ Parents can see tangible milestones (test scores, apps, awards)
- ✅ Parents can see human growth (breakthroughs, transformations)
- ✅ Students can reflect on their journey
- ✅ Clear narrative of progress over time

---

## Open Questions

1. **Application Data Source:** Where do we store college application submissions?
   - Option A: New `applications` table
   - Option B: JSONB in `students` table
   - Option C: Extract from coaching session notes

2. **Project Data Source:** How do we track project milestones?
   - Option A: Parse from chips
   - Option B: New `projects` table
   - Option C: Manual entry by coach

3. **Phase Transitions:** How do we determine phase changes?
   - Option A: Manual tagging in coaching sessions
   - Option B: Automatic based on date ranges
   - Option C: Extract from growth_events

4. **Privacy:** Should parents see ALL growth events or filtered list?
   - Current: `student_reflection` is private
   - Question: Should some breakthroughs be student-only?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Answer open questions** above
3. **Prioritize event types** (start with most important)
4. **Begin Phase 1 implementation**

---

**Status:** 📋 Ready for Review
**Estimated Timeline:** 4 weeks for complete implementation
**Priority:** High - Core value proposition for parents
