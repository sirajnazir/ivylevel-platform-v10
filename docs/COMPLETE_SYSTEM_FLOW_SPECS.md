# Complete System Flow Specifications

**Document Version:** v24.0
**Platform Version:** v24.0 - Weekly Execution Data Verified + Complete Documentation
**Last Updated:** 2025-10-31
**Status:** ✅ Production Ready - Data Integrity Verified + All Master Specs Synchronized
**Data Verification:** ✅ 89 weeks verified, 1,151 execution items, 80/89 weeks with action plans (89.9%)

---

## 📋 TABLE OF CONTENTS

1. [System Architecture Overview](#system-architecture-overview)
2. [Authentication & Test Accounts](#authentication--test-accounts)
3. [Backend Server Configuration](#backend-server-configuration)
4. [Frontend Application Configuration](#frontend-application-configuration)
5. [Database Schema & Data](#database-schema--data)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Frontend Pages & Components](#frontend-pages--components)
9. [File System Structure](#file-system-structure)
10. [Message Flow Sequences](#message-flow-sequences)
11. [Version History](#version-history)

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### System Stack (v23.0)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
│                  http://localhost:5173                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (Vite + React)                         │
│  Location: /unified-frontend/apps/unified-app/               │
│  Port: 5173                                                  │
│  Framework: React 18.3.1 + TypeScript                        │
│  Styling: styled-components                                  │
│  State: React hooks + Context                                │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
                       │ VITE_API_URL=http://localhost:8787
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Express + Node.js)                     │
│  Location: /services/agent-framework/                        │
│  Port: 8787                                                  │
│  Entry: src/server-utfa.ts                                   │
│  Runtime: Node v22.16.0 + tsx                                │
│  Framework: Express.js                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL Queries
                       │ Pool Connection
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           DATABASE (PostgreSQL 15+)                          │
│  Connection: ${DATABASE_URL} from .env                       │
│  Port: 5432 (default)                                        │
│  Schemas: public (89 tables, 12 views, 8 functions)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         VECTOR STORE (Pinecone)                              │
│  Index: jenny-v3-3072-093025                                 │
│  Dimensions: 3072 (text-embedding-3-large)                   │
│  Purpose: RAG retrieval for coaching intelligence            │
└─────────────────────────────────────────────────────────────┘
```

### Component Versions

| Component | Version | Location |
|-----------|---------|----------|
| Platform | v23.0 | Root |
| Frontend | v3.0.0 | unified-frontend/apps/unified-app/ |
| Backend | v3.0.0 | services/agent-framework/ |
| Database | PostgreSQL 15+ | Remote/Local |
| Node.js | v22.16.0 | System |
| React | 18.3.1 | Frontend |
| TypeScript | 5.x | Both |

---

## 2. AUTHENTICATION & TEST ACCOUNTS

### Production Test Account: Huda

**Primary Account (Student View):**
```
Email: hudasir4j@gmail.com
Password: Password123
Student ID (Frontend): huda_001
Student ID (Backend/DB): huda-2025
Role: student
```

**Data Scope:**
- 89 weeks of coaching data (2023-08-02 to 2025-03-04)
- Complete game plan (gp_huda-2025_001)
- 16+ opportunities (awards, programs)
- IvyScore: 85 (Platinum tier)
- All 4 pillars scored (Aptitude: 90, Passion: 100, Service: 80, Identity: 100)

**Login Flow:**
1. Navigate to `http://localhost:5173`
2. Click "Student Login"
3. Enter credentials above
4. Dashboard loads at `/student/dashboard`

### Coach Account

```
Username: jenny
Password: jenny123
Email: jenny@ivylevel.com
Role: coach
```

### Admin Account

```
Username: admin
Password: admin123
Email: admin@ivylevel.com
Role: admin
```

### Authentication Architecture

**Token-based JWT Authentication:**
```typescript
// Location: services/agent-framework/src/routes/auth.ts

POST /api/auth/login
Request: { username: string, password: string }
Response: {
  token: string,
  user: { id, username, role, studentId? }
}

// Token stored in: localStorage.getItem('token')
// User stored in: localStorage.getItem('user')
```

**Protected Route Pattern:**
```typescript
// Location: unified-frontend/apps/unified-app/src/components/auth/ProtectedRoute.tsx

<ProtectedRoute allowedRoles={['student']}>
  <StudentDashboard />
</ProtectedRoute>
```

---

## 3. BACKEND SERVER CONFIGURATION

### Server Details

**Primary Server:** `server-utfa.ts`
- **Location:** `/services/agent-framework/src/server-utfa.ts`
- **Port:** `8787`
- **Protocol:** `HTTP` (development)
- **Start Command:** `tsx src/server-utfa.ts`
- **Process Manager:** Manual (tsx watch mode)
- **Logs:** `/logs/agent-framework-utfa.log`

### Environment Configuration

**File:** `/services/agent-framework/.env.local` (overrides root `.env`)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=...

# Pinecone Configuration
PINECONE_INDEX=jenny-v3-3072-093025
PINECONE_NAMESPACE=default

# Service Configuration
SERVICE_NAME=agent-framework-utfa
PORT=8787
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Starting the Backend

```bash
# From project root
cd /services/agent-framework

# Install dependencies (if needed)
pnpm install

# Start server
tsx src/server-utfa.ts

# Or with logging
tsx src/server-utfa.ts > ../../logs/agent-framework-utfa.log 2>&1 &

# Verify running
curl http://localhost:8787/health
# Expected: {"ok":true}
```

### Server Routes Mounted

```typescript
// Location: src/server-utfa.ts:64-92

app.use('/enum', enumsRouter(pool));              // v10.5.2 Universal enumerations
app.use('/', createSnapshotRoutes(pool));         // v3.7.1 Snapshots
app.use('/', v32Router(pool));                    // v3.2 Evidence, HGTI
app.use('/', v10Router(pool));                    // v10.0 Vitals, Tasks, Timeline
app.use('/', v12Router(pool));                    // v12.0 Game Plan
app.use('/api/v15.2', v152Router);                // v15.2 LangChain orchestration
app.use('/api/v15.3', v153Router);                // v15.3 + v16.1 EQ intelligence
app.use('/api/v17.0', v170Router);                // v17.0 Full orchestration
app.use('/api/v18', v18Router(pool));             // v18.0 GamePlan adaptive
app.use('/api/auth', authRouter);                 // Authentication
```

### Health Check Endpoints

```bash
# Basic health
GET /health
Response: {"ok":true}

# Detailed health
GET /health/details
Response: {
  "ok": true,
  "index_name": "jenny-v3-3072-093025",
  "temporal_facts": "UTFA",
  "db_ping_ms": -1,
  "uptime_s": 3600
}
```

---

## 4. FRONTEND APPLICATION CONFIGURATION

### Application Details

**Framework:** Vite + React
- **Location:** `/unified-frontend/apps/unified-app/`
- **Port:** `5173`
- **Dev Server:** Vite
- **Start Command:** `pnpm dev`

### Environment Configuration

**File:** `/unified-frontend/apps/unified-app/.env.local`

```bash
# Backend API
VITE_API_URL=http://localhost:8787
VITE_API_BASE_URL=http://localhost:8787

# Feature Flags
VITE_ENABLE_EVIDENCE_PANEL=true
VITE_ENABLE_HGTI_GRAPH=true
VITE_ENABLE_MISSING_EVIDENCE=true
```

### Starting the Frontend

```bash
# From project root
cd unified-frontend/apps/unified-app

# Install dependencies (if needed)
pnpm install

# Start dev server
pnpm dev

# Server starts at http://localhost:5173
```

### API Service Configuration

**File:** `src/utils/v10ApiService.ts`

```typescript
// API Base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// Centralized API client
export const v10Api = {
  // Assessment
  getAssessment: (studentId: string) =>
    fetch(`${API_BASE_URL}/students/${studentId}/assessment`),

  // Game Plan
  getGamePlan: (studentId: string) =>
    fetch(`${API_BASE_URL}/students/${studentId}/game-plan`),

  // Weekly Vitals
  getWeeklyVitals: (studentId: string, params?: { limit?: number }) =>
    fetch(`${API_BASE_URL}/students/${studentId}/vitals/weeks?limit=${params?.limit || 10}`),

  // ... more endpoints
};
```

### Routing Configuration

**File:** `src/App.tsx`

```typescript
<Routes>
  <Route path="/" element={<Login />} />
  <Route path="/login/student" element={<StudentLogin />} />
  <Route path="/login/coach" element={<CoachLogin />} />
  <Route path="/login/admin" element={<AdminLogin />} />

  <Route path="/student/dashboard" element={
    <ProtectedRoute allowedRoles={['student']}>
      <StudentDashboard />
    </ProtectedRoute>
  } />

  <Route path="/coach/dashboard" element={
    <ProtectedRoute allowedRoles={['coach']}>
      <CoachDashboard />
    </ProtectedRoute>
  } />

  <Route path="/admin/dashboard" element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  } />
</Routes>
```

---

## 5. DATABASE SCHEMA & DATA

### Connection Details

**Environment Variable:** `DATABASE_URL`
```bash
# Format
postgresql://username:password@host:port/database

# Pool Configuration (src/db/pool.ts)
max: 20 connections
idleTimeoutMillis: 30000
connectionTimeoutMillis: 2000
```

### Key Tables (v23.0)

| Table Name | Rows (Huda) | Purpose |
|------------|-------------|---------|
| `students` | 1 | Student profile |
| `game_plans` | 1 | Strategic roadmap |
| `weekly_vitals` | 89 | Weekly progress snapshots |
| `opportunities` | 16+ | Awards, programs, scholarships |
| `milestones` | 20+ | Phase milestones |
| `tasks` | 50+ | Action items |
| `timeline_events` | 30+ | Journey events |
| `projects` | 5+ | EC projects |
| `applications` | 10+ | College applications |
| `coaching_sessions` | 89+ | Session records |

### Sample Queries

```sql
-- Get student profile
SELECT * FROM students WHERE student_id = 'huda-2025';

-- Get latest weekly vitals
SELECT * FROM weekly_vitals
WHERE student_id = 'huda-2025'
ORDER BY week_number DESC
LIMIT 1;

-- Get game plan
SELECT * FROM game_plans
WHERE student_id = 'huda-2025'
AND version = 1;

-- Get opportunities
SELECT * FROM opportunities
WHERE student_id = 'huda-2025'
ORDER BY priority, deadline;
```

### Materialized Views

```sql
-- Current week vitals (auto-refreshed)
mv_current_week_vitals

-- HGTI scores timeline (v3.2)
mv_hgti_timeline

-- Evidence chips aggregation (v3.2)
mv_evidence_chips_summary
```

---

## 6. API ENDPOINTS REFERENCE

### Base URL
```
http://localhost:8787
```

### Authentication Endpoints

```http
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "hudasir4j@gmail.com",
  "password": "Password123"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "id": "huda_001",
    "email": "hudasir4j@gmail.com",
    "role": "student",
    "studentId": "huda-2025"
  }
}
```

```http
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "message": "Logged out successfully"
}
```

```http
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "id": "huda_001",
  "username": "huda_001",
  "role": "student",
  "studentId": "huda-2025"
}
```

### Assessment Endpoints (v12.0)

```http
GET /students/:studentId/assessment
Example: /students/huda-2025/assessment

Response:
{
  "studentId": "huda-2025",
  "gamePlanId": "gp_huda-2025_001",
  "version": 1,
  "lastUpdated": "2025-10-28T07:34:22.780Z",
  "ivyReadyScore": {
    "overall": 85,
    "tier": "Platinum",
    "t20Level": "Strong (T5-T10 Range)",
    "changeVs180Days": 3
  },
  "pillars": {
    "aptitude": { "score": 9, "percentage": 90, ... },
    "passion": { "score": 10, "percentage": 100, ... },
    "service": { "score": 8, "percentage": 80, ... },
    "identity": { "score": 10, "percentage": 100, ... }
  },
  "dimensionalScores": [...],
  "strengths": [...],
  "weakSpots": [...],
  "admissionsRubric": {...}
}
```

### Game Plan Endpoints (v12.0)

```http
GET /students/:studentId/game-plan
Example: /students/huda-2025/game-plan

Response:
{
  "game_plan_id": "gp_huda-2025_001",
  "student_id": "huda-2025",
  "version": 1,
  "created_date": "2023-08-02T00:00:00.000Z",
  "last_updated": "2025-10-28T07:34:22.780Z",
  "profile_assessment": {
    "weak_spots": [...],
    "strengths": [...],
    "target_profile": {...},
    "extracurricular_activities": [...]
  },
  "phases": [...],
  "current_phase_id": "phase_3",
  "readiness_score": {...}
}
```

### Weekly Vitals Endpoints (v10.0)

```http
GET /students/:studentId/vitals/current-week
Example: /students/huda-2025/vitals/current-week

Response:
{
  "week_number": 89,
  "week_start": "2025-02-26T08:00:00.000Z",
  "week_end": "2025-03-04T08:00:00.000Z",
  "focus_areas": [...],
  "progress_status": "ahead",
  "completion_percentage": 100,
  "vitals": {
    "academic": {...},
    "extracurricular": {...},
    "growth": {...}
  },
  "upcoming_deadlines": [...],
  "active_tasks": [...]
}
```

```http
GET /students/:studentId/vitals/weeks?limit=10&start_week=1&end_week=89
Example: /students/huda-2025/vitals/weeks?limit=4

Response:
{
  "weeks": [
    {
      "week_number": 89,
      "week_start": "2025-02-26T08:00:00.000Z",
      "week_end": "2025-03-04T08:00:00.000Z",
      "focus_areas": [...],
      "progress_status": "ahead",
      "completion_percentage": 100,
      "academic_vitals": {
        "sat": { "total": 1530, "ebrw": 750, "math": 780 },
        "ap_exams": [...],
        "gpa_weighted": 3.93,
        "current_courses": [...]
      },
      "ec_details": [...],
      "award_details": [...]
    },
    ...
  ]
}
```

### Opportunities Endpoints (v10.0)

```http
GET /students/:studentId/opportunities
Example: /students/huda-2025/opportunities

Response:
{
  "opportunities": [
    {
      "opportunity_id": "opp_award_1",
      "title": "NCWIT Aspirations in Computing Award",
      "category": "award",
      "description": "...",
      "deadline": "2024-06-15T07:00:00.000Z",
      "priority": "P0",
      "status": "completed",
      "student_id": "huda-2025"
    },
    ...
  ]
}
```

### Milestones Endpoints (v12.0)

```http
GET /students/:studentId/milestones?phase_id=phase_3
Example: /students/huda-2025/milestones?phase_id=phase_3

Response:
{
  "milestones": [
    {
      "milestone_id": "ms_001",
      "title": "Complete EA applications",
      "status": "in_progress",
      "target_date": "2024-11-01",
      "completion_percentage": 75
    },
    ...
  ]
}
```

### Tasks Endpoints (v10.0)

```http
GET /students/:studentId/tasks?status=in_progress&category=application
Example: /students/huda-2025/tasks

Response:
{
  "tasks": [...],
  "stats": {
    "total_tasks": 50,
    "completed": 35,
    "in_progress": 10,
    "not_started": 5,
    "overdue": 2,
    "completion_rate": 0.70
  }
}
```

### Timeline Endpoints (v10.0)

```http
GET /students/:studentId/timeline?event_type=award&limit=20
Example: /students/huda-2025/timeline

Response:
{
  "events": [
    {
      "id": "evt_001",
      "title": "Won NCWIT State Winner",
      "event_date": "2024-04-15",
      "event_type": "award",
      "week_number": 35
    },
    ...
  ],
  "summary": {
    "total_events": 30,
    "by_type": {...}
  }
}
```

### Projects Endpoints (v10.0)

```http
GET /students/:studentId/projects?status=active
Example: /students/huda-2025/projects

Response:
{
  "projects": [
    {
      "id": "proj_001",
      "title": "Empowering AI Nonprofit",
      "category": "community_service",
      "status": "active",
      "progress": 85,
      "metrics": {...}
    },
    ...
  ]
}
```

### Applications Endpoints (v10.0)

```http
GET /students/:studentId/applications
Example: /students/huda-2025/applications

Response:
{
  "applications": [
    {
      "college_name": "MIT",
      "decision_plan": "ea",
      "application_status": "submitted",
      "submission_date": "2024-11-01"
    },
    ...
  ],
  "stats": {
    "total_colleges": 15,
    "submitted": 10,
    "pending": 5,
    "decisions": {...}
  }
}
```

### Evidence Endpoints (v3.2)

```http
GET /students/:studentId/evidence-chips
Example: /students/huda-2025/evidence-chips

Response:
{
  "chips": [
    {
      "chip_id": "chip_001",
      "category": "academic",
      "evidence_type": "transcript",
      "strength": "high",
      "data": {...}
    },
    ...
  ]
}
```

### HGTI Endpoints (v3.2)

```http
GET /students/:studentId/hgti-scores
Example: /students/huda-2025/hgti-scores

Response:
{
  "current_score": 8.5,
  "timeline": [
    { "week": 1, "score": 6.0 },
    { "week": 89, "score": 8.5 }
  ],
  "breakthroughs": [...]
}
```

---

## 7. DATA FLOW DIAGRAMS

### Login Flow

```
User Browser
    │
    ├─► Navigate to http://localhost:5173
    │
    ├─► Click "Student Login"
    │
    ├─► Enter: huda_001 / huda123
    │
    └─► Submit Form
         │
         └─► StudentLogin.tsx
              │
              └─► POST http://localhost:8787/api/auth/login
                   │
                   └─► authRouter.ts (Backend)
                        │
                        ├─► Query: SELECT * FROM users WHERE username = 'huda_001'
                        │
                        ├─► Verify password (bcrypt)
                        │
                        ├─► Generate JWT token
                        │
                        └─► Response: { token, user: { studentId: 'huda-2025' } }
                             │
                             └─► Frontend stores token + user in localStorage
                                  │
                                  └─► Redirect to /student/dashboard
```

### Assessment Page Load Flow

```
StudentDashboard.tsx (Assessment Tab)
    │
    ├─► useEffect(() => { loadAssessmentData() }, [studentId])
    │
    └─► v10Api.getAssessment('huda-2025')
         │
         └─► GET http://localhost:8787/students/huda-2025/assessment
              │
              └─► v12Router.ts (Backend)
                   │
                   └─► SQL Query:
                        SELECT
                          gp.*,
                          s.first_name,
                          s.last_name
                        FROM game_plans gp
                        JOIN students s ON gp.student_id = s.student_id
                        WHERE gp.student_id = 'huda-2025'
                        AND gp.version = 1
                   │
                   └─► Transform to assessment format
                        │
                        └─► Response JSON:
                             {
                               ivyReadyScore: { overall: 85, tier: "Platinum" },
                               pillars: { aptitude: 90, passion: 100, ... },
                               dimensionalScores: [...],
                               strengths: [...],
                               weakSpots: [...]
                             }
                             │
                             └─► Frontend receives data
                                  │
                                  ├─► setV12AssessmentData(data)
                                  │
                                  └─► Render Components:
                                       ├─► IvyScoreCard (85, Platinum)
                                       ├─► CircularProgress (4 pillars)
                                       ├─► AptitudeCard (90%)
                                       ├─► PassionCard (100%)
                                       ├─► ServiceCard (80%)
                                       ├─► IdentityCard (100%)
                                       ├─► DimensionalScores (6 dimensions)
                                       ├─► Strengths section
                                       ├─► WeakSpots section
                                       └─► AdmissionsRubric section
```

### Weekly Vitals Load Flow

```
WeeklyVitals.tsx Component
    │
    ├─► useEffect(() => { loadVitals() }, [studentId, viewMode])
    │
    └─► v10Api.getWeeklyVitals('huda-2025', { limit: 4 })
         │
         └─► GET http://localhost:8787/students/huda-2025/vitals/weeks?limit=4
              │
              └─► v10Router.ts (Backend)
                   │
                   └─► SQL Query:
                        SELECT
                          week_number,
                          week_start_date,
                          week_end_date,
                          focus_areas,
                          progress_status,
                          completion_percentage,
                          academic_vitals,
                          ec_vitals,
                          growth_vitals,
                          ec_details,
                          award_details
                        FROM weekly_vitals
                        WHERE student_id = 'huda-2025'
                        ORDER BY week_number DESC
                        LIMIT 4
                   │
                   └─► Response JSON:
                        {
                          weeks: [
                            {
                              week_number: 89,
                              academic_vitals: {
                                sat: { total: 1530, ebrw: 750, math: 780 },
                                ap_exams: [...],
                                gpa_weighted: 3.93
                              },
                              ec_details: [...],
                              award_details: [...]
                            },
                            ...
                          ]
                        }
                        │
                        └─► Frontend receives data
                             │
                             ├─► setWeeks(data.weeks)
                             │
                             └─► Render VitalCard for each week:
                                  ├─► Week header (89, dates)
                                  ├─► Progress bar (100%)
                                  ├─► Academic Profile (expandable)
                                  │    ├─► GPA: 3.93
                                  │    ├─► SAT: 1530
                                  │    ├─► AP Exams: 4 listed
                                  │    └─► Current Courses
                                  ├─► Extracurriculars (expandable)
                                  ├─► Awards (expandable)
                                  └─► Weekly Action Plan Card
```

---

## 8. FRONTEND PAGES & COMPONENTS

### Student Dashboard Structure

**File:** `unified-frontend/apps/unified-app/src/components/student/StudentDashboard.tsx`

**Tabs (activeTab state):**
1. `assessment` - How Ivy+ Ready are you today?
2. `gameplan` - Precision Roadmap
3. `preparation` - Weekly Progress & Action Plans
4. `sessions` - Coaching Session Videos
5. `application` - Application Timeline & Projects
6. `growth_transformations` - Growth Journey
7. `evidence` - Evidence Panel (v3.2)
8. `aichat` - AI Chat Interface

### Assessment Tab Components

**Location:** Lines 519-689 in StudentDashboard.tsx

```
Assessment Tab
├─► Left Column
│   ├─► CircularProgress (lines 523-557)
│   │   ├─► Profile image
│   │   ├─► Overall IvyScore (85)
│   │   └─► 4 Pillar rings (Aptitude, Passion, Service, Identity)
│   │
│   └─► IvyScoreCard (lines 559-572)
│       ├─► Score: 85
│       ├─► Tier: Platinum
│       ├─► Change vs 180 days: +3
│       └─► Target gap: 15 points
│
├─► Right Column - 2x2 Card Grid (lines 575-584)
│   ├─► AptitudeCard (90%) - Top Left
│   │   └─► 11 AP courses, 4.3→4.46 GPA, self-taught dev
│   │
│   ├─► IdentityCard (100%) - Bottom Left
│   │   └─► Digital Storyteller, exists in "hyphens"
│   │
│   ├─► ServiceCard (80%) - Top Right
│   │   └─► $24K raised, 44 cities, ELD tutoring
│   │
│   └─► PassionCard (100%) - Bottom Right
│       └─► 1.8M views, Synthoria game, Folklift, Empowering AI
│
├─► Dimensional Breakdown Section (lines 592-607)
│   ├─► Academic Readiness: 92% (Platinum)
│   ├─► Extracurricular Depth: 95% (Diamond)
│   ├─► Service & Leadership: 88% (Platinum)
│   ├─► Narrative & Differentiation: 95% (Diamond)
│   └─► Application Execution: (score)
│
├─► Standout Strengths Section (lines 610-629)
│   └─► Green cards with ROI scores, impact levels
│
├─► Focus Areas Section (lines 632-654)
│   └─► Priority-colored cards (P0/P1/P2) with tactical plans
│
└─► Admissions Rubric Section (lines 657-687)
    ├─► Academic Index
    ├─► Extracurricular Rating
    ├─► Personal Qualities
    ├─► Recommendation Strength
    ├─► Overall Admit Probability: 15-25%
    └─► Target Schools: MIT, Stanford, Brown, Northwestern, USC
```

**Components:**
- `CircularProgress.tsx` - Multi-ring score visualization
- `IvyScoreCard.tsx` - Score summary card
- `AptitudeCard.tsx` - Academic pillar card
- `PassionCard.tsx` - Passion pillar card
- `ServiceCard.tsx` - Service pillar card
- `IdentityCard.tsx` - Identity pillar card

### Game Plan Tab Components

**File:** `unified-frontend/apps/unified-app/src/components/student/GamePlanView.tsx`

```
Game Plan Tab
├─► Section A: Initial Game Plan (lines 729-853)
│   ├─► Main Column
│   │   ├─► Target Profile & Narrative Card
│   │   │   └─► "The Digital Storyteller" narrative
│   │   │
│   │   ├─► Extracurricular Strategy Card
│   │   │   └─► List of planned EC activities with metrics
│   │   │
│   │   └─► Target Schools Card
│   │       └─► 15 schools (Reach/Target/Safety)
│   │
│   └─► Side Column
│       ├─► Target Awards Card
│       ├─► Target Summer Programs Card
│       └─► Multi-Year Timeline Card
│
└─► Section B: Progress & Evolution (lines 856-1001)
    ├─► Current Phase Header (lines 864-877)
    │   ├─► Phase name, weeks, status
    │   └─► Completion percentage circle
    │
    ├─► Main Column
    │   ├─► Phase Milestones Progress Card (lines 882-915)
    │   │   └─► Milestones with status icons (✓, ⏱, ○)
    │   │
    │   └─► Opportunities Status & Evolution Card (lines 918-953)
    │       └─► Awards, programs with completion status
    │
    └─► Side Column
        ├─► Timeline Progress Summary Card (lines 958-979)
        │   └─► All phases with progress bars
        │
        └─► EC Evolution Summary Card (lines 982-999)
            └─► EC status (Active/Completed)
```

**Data Source:**
```typescript
const gamePlan = await v10Api.getGamePlan(studentId);
// Uses: /students/huda-2025/game-plan endpoint
```

### Preparation Tab Components

**File:** `unified-frontend/apps/unified-app/src/components/v10/WeeklyVitals.tsx`

```
Preparation Tab
├─► Header (lines 502-524)
│   ├─► Title: "Weekly Progress"
│   └─► View Controls
│       ├─► Recent (4 weeks)
│       ├─► Last Quarter (12 weeks)
│       └─► All Weeks (89)
│
└─► VitalsGrid (lines 525-816)
    └─► For each week (lines 527-815):
        ├─► VitalCard (lines 528-803)
        │   ├─► Header (lines 529-538)
        │   │   ├─► Week number: 89
        │   │   ├─► Date range
        │   │   └─► Status badge (ahead/on_track/behind)
        │   │
        │   ├─► Progress Bar (lines 539-547)
        │   │   └─► Completion: 100%
        │   │
        │   ├─► Academic Profile (Collapsible) (lines 550-699)
        │   │   ├─► GPA: 3.93 / 4.0
        │   │   ├─► SAT: 1530 (EBRW: 750, Math: 780)
        │   │   ├─► AP Exams: 4 with scores
        │   │   └─► Current Courses (Grade 12)
        │   │
        │   ├─► Extracurriculars (Collapsible) (lines 774-787)
        │   │   └─► EC cards with metrics
        │   │
        │   └─► Awards (Collapsible) (lines 790-802)
        │       └─► Award cards with levels
        │
        └─► WeeklyActionPlanCard (lines 805-813)
            ├─► Linked tasks for this week
            ├─► Completion status
            └─► Coach feedback
```

**Sub-component:**
- `WeeklyActionPlanCard.tsx` - Action plan per week

### Sessions Tab Components

**File:** `unified-frontend/apps/unified-app/src/components/student/SessionsViewOptimal.tsx`

```
Sessions Tab
├─► Header (Sticky) (lines 32-144)
│   ├─► Title + Video Count
│   ├─► Theme Toggle (Dark/Light)
│   ├─► Search Input
│   └─► Category Filter
│
└─► VideoGrid (lines 173-180)
    └─► For each session:
        └─► VideoCard (lines 226-263)
            ├─► Thumbnail/Preview
            ├─► Play Button Overlay
            ├─► Video Info
            │   ├─► Title
            │   ├─► Date
            │   ├─► Duration
            │   └─► Category badge
            └─► onClick → Opens EnhancedMediaPlayer
```

**Features:**
- Video preloading
- Thumbnail caching
- Dark/light theme
- Search & filter
- Enhanced media player with controls

---

## 9. FILE SYSTEM STRUCTURE

### Project Root Structure

```
/ivylevel-platform-v10/
├── .env                           # Root environment (DB, API keys)
├── .gitignore
├── package.json                   # Root workspace config
├── pnpm-workspace.yaml            # Monorepo configuration
├── tsconfig.json                  # TypeScript base config
│
├── docs/                          # 📄 ALL DOCUMENTATION
│   ├── COMPLETE_SYSTEM_FLOW_SPECS.md   # ⭐ THIS FILE (v23.0)
│   ├── MASTER_PROD_TECH_SPEC.md        # Architecture spec
│   ├── PROD_DB_ARCH.md                 # Database architecture
│   ├── PROD_FEATURE_RELEASE_DETAILS.md # Release history
│   ├── agents/                         # Agent-specific specs
│   ├── guides/                         # Implementation guides
│   └── setup/                          # Setup instructions
│
├── services/                      # 🔧 BACKEND SERVICES
│   └── agent-framework/           # Main backend service
│       ├── package.json           # Backend dependencies
│       ├── .env.local             # Backend env (overrides root)
│       ├── src/
│       │   ├── server-utfa.ts     # ⭐ MAIN SERVER (port 8787)
│       │   ├── routes/            # API route handlers
│       │   │   ├── auth.ts        # /api/auth/*
│       │   │   ├── v10.0.ts       # Weekly vitals, tasks, timeline
│       │   │   ├── v12.0.ts       # Game plan, assessment
│       │   │   ├── v3.2.ts        # Evidence, HGTI
│       │   │   ├── v15.2.ts       # LangChain orchestration
│       │   │   ├── v15.3.ts       # Universal agents
│       │   │   ├── v17.0.ts       # Full orchestration
│       │   │   └── v18.0.ts       # GamePlan adaptive
│       │   ├── db/
│       │   │   └── pool.ts        # PostgreSQL connection
│       │   ├── agents/            # Agent implementations
│       │   │   └── v18/
│       │   │       ├── GamePlanAgent.ts
│       │   │       ├── ExecutionAgent.ts
│       │   │       ├── AssessmentAgentV3.ts
│       │   │       └── ...
│       │   ├── intelligence/      # Intelligence types (v3.0)
│       │   │   ├── IntelligenceRegistry.ts
│       │   │   └── types/
│       │   │       ├── TYPE-001-GamePlanSynthesis.ts
│       │   │       ├── TYPE-002-WeakSpotPrioritization.ts
│       │   │       ├── TYPE-049-ExecutionLadderNavigation.ts
│       │   │       ├── TYPE-080-FourPhaseAssessmentFlow.ts
│       │   │       └── ... (36 total types)
│       │   ├── facts/             # Fact sources & resolvers
│       │   ├── retrieval/         # RAG retrieval
│       │   └── orchestration/     # Strategy orchestration
│       └── ...
│
├── unified-frontend/              # 🎨 FRONTEND APPLICATION
│   └── apps/
│       └── unified-app/           # Main React app
│           ├── package.json       # Frontend dependencies
│           ├── .env.local         # Frontend env
│           ├── vite.config.ts     # Vite configuration
│           ├── index.html         # HTML entry point
│           ├── src/
│           │   ├── App.tsx        # ⭐ MAIN APP + ROUTING
│           │   ├── main.tsx       # React entry point
│           │   ├── components/
│           │   │   ├── auth/      # Authentication components
│           │   │   │   ├── Login.tsx
│           │   │   │   ├── StudentLogin.tsx
│           │   │   │   ├── CoachLogin.tsx
│           │   │   │   ├── AdminLogin.tsx
│           │   │   │   └── ProtectedRoute.tsx
│           │   │   ├── student/   # Student dashboard
│           │   │   │   ├── StudentDashboard.tsx  # ⭐ MAIN DASHBOARD
│           │   │   │   ├── GamePlanView.tsx
│           │   │   │   ├── SessionsViewOptimal.tsx
│           │   │   │   ├── CircularProgress.tsx
│           │   │   │   ├── IvyScoreCard.tsx
│           │   │   │   ├── AptitudeCard.tsx
│           │   │   │   ├── PassionCard.tsx
│           │   │   │   ├── ServiceCard.tsx
│           │   │   │   ├── IdentityCard.tsx
│           │   │   │   └── ...
│           │   │   ├── v10/       # v10.0 components
│           │   │   │   ├── WeeklyVitals.tsx
│           │   │   │   ├── WeeklyActionPlanCard.tsx
│           │   │   │   ├── TaskManager.tsx
│           │   │   │   ├── TimelineView.tsx
│           │   │   │   ├── ProjectsView.tsx
│           │   │   │   └── GrowthTransformationsTab.tsx
│           │   │   ├── v3.2/      # v3.2 components
│           │   │   │   ├── EvidencePanel.tsx
│           │   │   │   ├── HGTIScoreCard.tsx
│           │   │   │   └── MissingEvidenceCard.tsx
│           │   │   ├── coach/     # Coach dashboard
│           │   │   ├── admin/     # Admin dashboard
│           │   │   └── shared/    # Shared components
│           │   ├── hooks/         # React hooks
│           │   │   ├── useAuth.ts
│           │   │   └── useDashboardData.ts
│           │   ├── utils/         # Utilities
│           │   │   ├── v10ApiService.ts  # ⭐ API CLIENT
│           │   │   └── featureFlags.ts
│           │   ├── services/      # Frontend services
│           │   │   ├── agentClient.ts
│           │   │   └── videoPrefetchService.ts
│           │   ├── contexts/      # React contexts
│           │   │   └── ThemeContext.tsx
│           │   └── config/
│           │       └── api.ts     # API configuration
│           └── ...
│
├── data/                          # 📊 DATA FILES
│   ├── canonical/                 # Student canonical data
│   ├── coaching_intelligence/     # Coaching extractions
│   └── kb_intel_chips/            # Knowledge base chips
│
├── scripts/                       # 🔨 UTILITY SCRIPTS
│   └── migration_v14_to_v32/      # Database migrations
│
└── logs/                          # 📋 APPLICATION LOGS
    └── agent-framework-utfa.log   # Backend server logs
```

### Key File Locations (Quick Reference)

| Purpose | File Path |
|---------|-----------|
| Backend entry point | `services/agent-framework/src/server-utfa.ts` |
| Frontend entry point | `unified-frontend/apps/unified-app/src/App.tsx` |
| Main dashboard | `unified-frontend/apps/unified-app/src/components/student/StudentDashboard.tsx` |
| API client | `unified-frontend/apps/unified-app/src/utils/v10ApiService.ts` |
| Database pool | `services/agent-framework/src/db/pool.ts` |
| Auth routes | `services/agent-framework/src/routes/auth.ts` |
| v10.0 routes | `services/agent-framework/src/routes/v10.0.ts` |
| v12.0 routes | `services/agent-framework/src/routes/v12.0.ts` |
| Intelligence registry | `services/agent-framework/src/intelligence/IntelligenceRegistry.ts` |

---

## 10. MESSAGE FLOW SEQUENCES

### Sequence 1: User Login

```
[User] → [Browser]
  Opens http://localhost:5173
  ↓
[Browser] → [Vite Dev Server:5173]
  Serves index.html + bundled React app
  ↓
[React Router] → [Login.tsx]
  Renders login page with 3 options
  ↓
[User] → [StudentLogin.tsx]
  Clicks "Student Login"
  Enters: huda_001 / huda123
  Clicks "Login"
  ↓
[StudentLogin.tsx] → [agentClient.ts]
  Calls: login(username, password)
  ↓
[agentClient.ts] → [Backend:8787]
  POST http://localhost:8787/api/auth/login
  Body: { "username": "huda_001", "password": "huda123" }
  ↓
[Express] → [authRouter.ts]
  Route: POST /api/auth/login
  ↓
[authRouter.ts] → [PostgreSQL]
  Query: SELECT * FROM users WHERE username = 'huda_001'
  ↓
[PostgreSQL] → [authRouter.ts]
  Returns: { id, username, password_hash, role, student_id }
  ↓
[authRouter.ts]
  Verifies password with bcrypt.compare()
  Generates JWT token with jwt.sign()
  ↓
[authRouter.ts] → [agentClient.ts]
  Response: {
    token: "eyJhbGc...",
    user: {
      id: "huda_001",
      username: "huda_001",
      role: "student",
      studentId: "huda-2025"
    }
  }
  ↓
[agentClient.ts] → [localStorage]
  Stores:
    - localStorage.setItem('token', token)
    - localStorage.setItem('user', JSON.stringify(user))
  ↓
[React Router] → [StudentDashboard.tsx]
  Navigates to /student/dashboard
  ↓
[StudentDashboard.tsx]
  Renders with user.studentId = "huda-2025"
```

### Sequence 2: Assessment Data Load

```
[StudentDashboard.tsx]
  useEffect(() => fetchAssessmentData(), [studentId])
  ↓
[v10ApiService.ts]
  getAssessment("huda-2025")
  ↓
[fetch]
  GET http://localhost:8787/students/huda-2025/assessment
  Headers: { Authorization: "Bearer <token>" }
  ↓
[Express Middleware]
  Verifies JWT token
  Extracts user from token
  ↓
[v12Router.ts]
  Route: GET /students/:id/assessment
  Params: { id: "huda-2025" }
  ↓
[v12Router.ts] → [PostgreSQL]
  Query:
    SELECT
      gp.*,
      s.first_name,
      s.last_name
    FROM game_plans gp
    JOIN students s ON gp.student_id = s.student_id
    WHERE gp.student_id = 'huda-2025'
    AND gp.version = 1
  ↓
[PostgreSQL] → [v12Router.ts]
  Returns game_plan record with embedded JSON:
    - profile_assessment
    - unique_story
    - target_profile
    - spike_strategy
    - readiness_score
  ↓
[v12Router.ts]
  Transforms data to assessment format:
    - ivyReadyScore: { overall, tier, changeVs180Days }
    - pillars: { aptitude, passion, service, identity }
    - dimensionalScores: [...]
    - strengths: [...]
    - weakSpots: [...]
    - admissionsRubric: {...}
  ↓
[v12Router.ts] → [v10ApiService.ts]
  Response: JSON assessment data
  ↓
[v10ApiService.ts] → [StudentDashboard.tsx]
  Returns parsed data
  ↓
[StudentDashboard.tsx]
  setV12AssessmentData(data)
  ↓
[React Re-render]
  Renders all assessment components:
    - CircularProgress (85, 4 pillars)
    - IvyScoreCard (85, Platinum)
    - AptitudeCard (90%)
    - PassionCard (100%)
    - ServiceCard (80%)
    - IdentityCard (100%)
    - DimensionalScores grid
    - Strengths list
    - WeakSpots list
    - AdmissionsRubric card
```

### Sequence 3: Weekly Vitals Load

```
[StudentDashboard.tsx]
  User clicks "Preparation" tab
  setActiveTab('preparation')
  ↓
[StudentDashboard.tsx]
  Renders: <WeeklyVitals studentId={studentId} />
  ↓
[WeeklyVitals.tsx]
  useEffect(() => loadVitals(), [studentId, viewMode])
  viewMode = 'recent' (default, 4 weeks)
  ↓
[v10ApiService.ts]
  getWeeklyVitals("huda-2025", { limit: 4 })
  ↓
[fetch]
  GET http://localhost:8787/students/huda-2025/vitals/weeks?limit=4
  Headers: { Authorization: "Bearer <token>" }
  ↓
[v10Router.ts]
  Route: GET /students/:id/vitals/weeks
  Params: { id: "huda-2025" }
  Query: { limit: "4" }
  ↓
[v10Router.ts] → [PostgreSQL]
  Query:
    SELECT
      week_number,
      week_start_date,
      week_end_date,
      focus_areas,
      progress_status,
      completion_percentage,
      academic_vitals,
      ec_vitals,
      growth_vitals,
      ec_details,
      award_details
    FROM weekly_vitals
    WHERE student_id = 'huda-2025'
    ORDER BY week_number DESC
    LIMIT 4
  ↓
[PostgreSQL] → [v10Router.ts]
  Returns 4 rows:
    - Week 89: { academic_vitals: { sat: 1530, gpa: 3.93, ... }, ... }
    - Week 88: { ... }
    - Week 87: { ... }
    - Week 86: { ... }
  ↓
[v10Router.ts]
  Transforms to frontend format:
    {
      weeks: [
        {
          week_number: 89,
          week_start: "2025-02-26T08:00:00.000Z",
          week_end: "2025-03-04T08:00:00.000Z",
          academic_vitals: {
            sat: { total: 1530, ebrw: 750, math: 780, attempts: [...] },
            ap_exams: [{ subject, score, test_date, grade_level }, ...],
            gpa_weighted: 3.93,
            current_courses: [...]
          },
          ec_details: [...],
          award_details: [...],
          focus_areas: [...],
          progress_status: "ahead",
          completion_percentage: 100
        },
        ...
      ]
    }
  ↓
[v10Router.ts] → [v10ApiService.ts]
  Response: JSON vitals data
  ↓
[v10ApiService.ts] → [WeeklyVitals.tsx]
  Returns parsed data
  ↓
[WeeklyVitals.tsx]
  setWeeks(data.weeks)
  ↓
[WeeklyVitals.tsx] → [v10ApiService.ts]
  Calls: loadActionPlans(data.weeks)

  For each week in parallel:
    getActionPlan("huda-2025", week.week_number)
    ↓
    GET http://localhost:8787/students/huda-2025/action-plan/89
    ↓
    [Backend returns action plan data]
    ↓
    setActionPlans({ ...prev, [89]: actionPlan })
  ↓
[React Re-render]
  Maps weeks.map(week => (
    <VitalCard key={week.week_number}>
      <VitalHeader>Week {week.week_number}</VitalHeader>
      <ProgressBar>{week.completion_percentage}%</ProgressBar>
      <AcademicProfile>{week.academic_vitals}</AcademicProfile>
      <Extracurriculars>{week.ec_details}</Extracurriculars>
      <Awards>{week.award_details}</Awards>
      <WeeklyActionPlanCard actionPlan={actionPlans[week.week_number]} />
    </VitalCard>
  ))
```

### Sequence 4: Game Plan Navigation

```
[User] → [StudentDashboard.tsx]
  Clicks "Game Plan" tab
  ↓
[StudentDashboard.tsx]
  setActiveTab('gameplan')
  renderTabContent() → <GamePlanView />
  ↓
[GamePlanView.tsx]
  useEffect(() => loadGamePlan(), [user.studentId])
  ↓
[v10ApiService.ts]
  getGamePlan("huda-2025")
  ↓
[fetch]
  GET http://localhost:8787/students/huda-2025/game-plan
  ↓
[v12Router.ts]
  Route: GET /students/:id/game-plan
  ↓
[PostgreSQL]
  Query: SELECT * FROM game_plans WHERE student_id = 'huda-2025'
  ↓
[v12Router.ts]
  Returns game plan with:
    - profile_assessment.weak_spots
    - profile_assessment.strengths
    - profile_assessment.target_profile
    - profile_assessment.extracurricular_activities
    - phases (array of 4 phases)
    - current_phase_id
    - readiness_score
  ↓
[GamePlanView.tsx]
  setGamePlanData(gamePlan)
  ↓
[v10ApiService.ts]
  getOpportunities("huda-2025")
  ↓
[fetch]
  GET http://localhost:8787/students/huda-2025/opportunities
  ↓
[v10Router.ts]
  Returns 16+ opportunities (awards, programs)
  ↓
[GamePlanView.tsx]
  setOpportunities(opps)
  ↓
[v10ApiService.ts]
  getMilestones("huda-2025", { phase_id: current_phase_id })
  ↓
[fetch]
  GET http://localhost:8787/students/huda-2025/milestones?phase_id=phase_3
  ↓
[v12Router.ts]
  Returns milestones for current phase
  ↓
[GamePlanView.tsx]
  setMilestones(miles)
  ↓
[React Re-render]
  Renders:
    - Section A: Initial Game Plan
      - Target Profile & Narrative
      - Extracurricular Strategy (planned ECs)
      - Target Schools list
      - Target Awards
      - Target Summer Programs
      - Multi-Year Timeline

    - Section B: Progress & Evolution
      - Current Phase Header (with completion %)
      - Phase Milestones Progress
      - Opportunities Status & Evolution
      - Timeline Progress Summary
      - EC Evolution Summary
```

---

## 11. VERSION HISTORY

### v23.0 - AssessmentAgent Intelligence Types Complete (2025-10-31)

**Git Commit:** `a2eb1c4`

**Additions:**
- ✅ TYPE-080: 4-Phase Assessment Flow (500 lines)
- ✅ TYPE-081: IvyScore Calculation (580 lines)
- ✅ TYPE-082: Gap Analysis Engine (400 lines)
- ✅ TYPE-083: Potential Indicator Extraction (390 lines)
- ✅ AssessmentAgentV3 agent implementation (200 lines)
- ✅ COMPLETE_SYSTEM_FLOW_SPECS.md (this document)

**System Status:**
- ✅ Backend running on port 8787
- ✅ Frontend running on port 5173
- ✅ Database connected (89 weeks Huda data)
- ✅ All API endpoints verified
- ✅ 36 Intelligence Types total (2 universal, 34 domain-specific)

**Files Modified:**
- `services/agent-framework/src/intelligence/types/TYPE-080-FourPhaseAssessmentFlow.ts`
- `services/agent-framework/src/intelligence/types/TYPE-081-IvyScoreCalculation.ts`
- `services/agent-framework/src/intelligence/types/TYPE-082-GapAnalysisEngine.ts`
- `services/agent-framework/src/intelligence/types/TYPE-083-PotentialIndicatorExtraction.ts`
- `services/agent-framework/src/agents/v18/AssessmentAgentV3.ts`
- `services/agent-framework/src/intelligence/IntelligenceRegistry.ts`

**Bug Fixes:**
- Fixed `FactCategory` import errors in TYPE-049, TYPE-050, TYPE-051-063 stubs
- Fixed `FactCategory` import in ExecutionAgent.ts

### v19.1 - Program-Competition Cascade (UNIVERSAL) (2025-10-30)

**Git Commit:** `82869a6`

**Additions:**
- ✅ TYPE-031: Program-Competition Cascade Intelligence (560 lines)
- First UNIVERSAL intelligence type (available to all agents)
- 3-5X effort multiplication pattern
- Cascade pattern matching (1 artifact → N opportunities)

### v18.0 - GamePlanAgent Intelligence Types Complete (2025-10-29)

**Git Commit:** `aafb3fa` (6 of 6), `a8108bc` (3 of 6)

**Additions:**
- ✅ 6 GamePlanAgent Intelligence Types (TYPE-001 to TYPE-006)
- GamePlan synthesis, weak spot prioritization, timeline architecture
- Multi-path convergence, quarterly adaptation, time mathematician

### Previous Versions

See `docs/PROD_FEATURE_RELEASE_DETAILS.md` for complete version history from v1.0 through v22.0.

---

## QUICK START CHECKLIST

### Starting the Full Stack

```bash
# 1. Start Backend (Terminal 1)
cd /Users/snazir/ivylevel-platform-v10/services/agent-framework
tsx src/server-utfa.ts

# Verify: http://localhost:8787/health should return {"ok":true}

# 2. Start Frontend (Terminal 2)
cd /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app
pnpm dev

# Verify: http://localhost:5173 should load login page

# 3. Login as Huda
# Navigate to: http://localhost:5173
# Click: Student Login
# Email: hudasir4j@gmail.com
# Password: Password123

# 4. Verify Data Flow
# - Assessment tab should show IvyScore: 85
# - Game Plan tab should load roadmap
# - Preparation tab should show 89 weeks
# - All data should be from PostgreSQL database
```

### Health Check Commands

```bash
# Backend health
curl http://localhost:8787/health

# Backend detailed health
curl http://localhost:8787/health/details

# Test assessment endpoint
curl http://localhost:8787/students/huda-2025/assessment | python3 -m json.tool | head -50

# Test vitals endpoint
curl "http://localhost:8787/students/huda-2025/vitals/weeks?limit=1" | python3 -m json.tool | head -80

# Frontend accessibility
curl -I http://localhost:5173
```

---

## TROUBLESHOOTING

### Backend Not Starting

**Issue:** Port 8787 not listening

**Solution:**
```bash
# Check if port is in use
lsof -nP -iTCP:8787 -sTCP:LISTEN

# Kill existing process
pkill -f "tsx.*server-utfa"

# Check for TypeScript errors
cd services/agent-framework
pnpm run type-check

# Start with logs
tsx src/server-utfa.ts 2>&1 | tee ../../logs/agent-framework-utfa.log
```

### Frontend Not Loading Data

**Issue:** API calls returning 404 or CORS errors

**Solution:**
```bash
# Verify .env.local
cat unified-frontend/apps/unified-app/.env.local
# Should contain: VITE_API_URL=http://localhost:8787

# Check browser console for CORS errors
# Backend should have CORS enabled for localhost:5173

# Verify backend is running
curl http://localhost:8787/health
```

### Database Connection Issues

**Issue:** Backend can't connect to PostgreSQL

**Solution:**
```bash
# Check DATABASE_URL in .env
cat services/agent-framework/.env.local | grep DATABASE_URL

# Test direct connection
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM students;"

# Verify pool.ts configuration
cat services/agent-framework/src/db/pool.ts
```

### Authentication Failing

**Issue:** Login returns 401 or token invalid

**Solution:**
```bash
# Verify user exists
psql "$DATABASE_URL" -c "SELECT username, role, student_id FROM users WHERE username = 'huda_001';"

# Check JWT_SECRET is set
cat .env | grep JWT_SECRET

# Clear browser localStorage
# In browser console: localStorage.clear()
```

---

## MAINTENANCE TASKS

### Daily

- [ ] Check backend logs: `tail -f logs/agent-framework-utfa.log`
- [ ] Verify health endpoints respond
- [ ] Test student login flow

### Weekly

- [ ] Review database backup status
- [ ] Check for TypeScript compilation errors
- [ ] Update dependencies if needed: `pnpm update`

### Before New Feature Development

- [ ] Read this document (COMPLETE_SYSTEM_FLOW_SPECS.md)
- [ ] Verify current version in git: `git log -1 --oneline`
- [ ] Check latest data: `curl localhost:8787/health/details`
- [ ] Update this document with new endpoints/flows
- [ ] Increment version number in docs
- [ ] Commit with descriptive message

---

## DOCUMENT MAINTENANCE

**When to Update This Document:**

1. ✅ New API endpoint added → Update Section 6
2. ✅ New frontend page/component → Update Section 8
3. ✅ Database schema change → Update Section 5
4. ✅ New environment variable → Update Sections 3 & 4
5. ✅ Port change → Update Sections 1, 3, 4
6. ✅ Authentication change → Update Section 2
7. ✅ New intelligence type → Update Section 11
8. ✅ Any system architecture change → Update Section 1

**Version Update Process:**

```bash
# 1. Update version number at top of document
# From: v23.0 → To: v24.0

# 2. Update Last Updated date
# To: Current date (YYYY-MM-DD)

# 3. Update Git Commit reference
# Run: git log -1 --oneline
# Add commit hash to version

# 4. Update Section 11 with changes
# Add new version entry with date, changes, files modified

# 5. Commit this document with code changes
git add docs/COMPLETE_SYSTEM_FLOW_SPECS.md
git commit -m "v24.0: Update system flow specs with [feature name]"
```

---

**END OF DOCUMENT**

*For questions or clarifications, refer to the master specifications in `/docs/` or check git commit history.*
