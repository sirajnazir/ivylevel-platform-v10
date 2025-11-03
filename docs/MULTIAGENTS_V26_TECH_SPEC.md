# MultiAgents Chat v26.0 - Technical Specification

**Document Version:** v26.0
**Last Updated:** 2025-10-31
**Status:** 🎯 READY FOR IMPLEMENTATION
**Dependencies:** MULTIAGENTS_V26_UI_UX_SPEC.md, MULTIAGENTS_V26_PRODUCT_SPEC.md

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 System Architecture (Incremental - No Breaking Changes)

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + TypeScript)                              │
│  Location: /unified-frontend/apps/unified-app/              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EXISTING v25.0 TABS (Unchanged):                           │
│  • Assessment, GamePlan, Preparation, Sessions, Growth      │
│                                                             │
│  NEW v26.0 TAB:                                             │
│  • MultiAgents v2.0 (separate React components)             │
│                                                             │
│  HIDDEN TABS (CSS display:none):                            │
│  • Application, Evidence, AI Chat                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │ New v26 endpoints only
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Express.js + Node.js)                             │
│  Location: /services/agent-framework/                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EXISTING v25.0 ROUTES (Unchanged):                         │
│  • /api/v10/* (vitals, tasks, timeline, etc.)               │
│                                                             │
│  NEW v26.0 ROUTES:                                          │
│  • /api/v26/session/* (session management)                  │
│  • /api/v26/agents/* (agent interactions)                   │
│                                                             │
│  INTELLIGENCE TYPES (Existing - Reused):                    │
│  • 36 types in /intelligence/types/                         │
│  • No new files needed - use existing                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ PostgreSQL queries
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE (PostgreSQL)                                      │
│  Database: ivylevel (existing)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EXISTING TABLES (Unchanged):                               │
│  • students, weekly_vitals, game_plans, etc.                │
│                                                             │
│  NEW v26.0 TABLES:                                          │
│  • multiagent_sessions                                      │
│  • multiagent_messages                                      │
│  • intelligence_activations                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Frontend:**
- React 18.3.1 + TypeScript
- styled-components (existing pattern)
- React hooks for state management
- WebSocket (optional for real-time updates)

**Backend:**
- Node.js 22.16.0 + Express.js
- TypeScript
- Existing agent framework (reuse ExecutionAgent, GamePlanAgent, etc.)

**Database:**
- PostgreSQL 14+ (existing)
- 3 new tables only

**AI/ML:**
- OpenAI GPT-4-Turbo (existing integration)
- Existing intelligence types (no new AI training needed)

---

## 2. DATABASE SCHEMA (New Tables Only)

### 2.1 multiagent_sessions Table

```sql
CREATE TABLE multiagent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('onboarding', 'weekly_execution')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'paused', 'error')),

  -- Phase tracking
  current_phase TEXT CHECK (current_phase IN ('assessment', 'gameplan', 'execution', 'complete')),
  current_agent TEXT CHECK (current_agent IN ('assessment', 'gameplan', 'execution', 'awards', 'programs', 'scholarships')),

  -- Data packages (JSONB)
  assessment_package JSONB,
  gameplan_package JSONB,
  execution_package JSONB,

  -- Analytics (JSONB)
  analytics JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_multiagent_sessions_student ON multiagent_sessions(student_id);
CREATE INDEX idx_multiagent_sessions_status ON multiagent_sessions(status);
CREATE INDEX idx_multiagent_sessions_phase ON multiagent_sessions(current_phase);
```

### 2.2 multiagent_messages Table

```sql
CREATE TABLE multiagent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL, -- 'assessment' | 'gameplan' | 'execution' | 'user'
  role TEXT NOT NULL CHECK (role IN ('agent', 'user')),
  content TEXT NOT NULL,

  -- Intelligence trace
  intelligence_type TEXT, -- e.g., 'TYPE-089-WarmOpening'
  processing_time INTEGER, -- milliseconds
  confidence NUMERIC(5,2), -- 0-100

  -- Metadata (JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_multiagent_messages_session ON multiagent_messages(session_id, timestamp);
CREATE INDEX idx_multiagent_messages_agent ON multiagent_messages(agent_id);
CREATE INDEX idx_multiagent_messages_intelligence ON multiagent_messages(intelligence_type);
```

### 2.3 intelligence_activations Table

```sql
CREATE TABLE intelligence_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES multiagent_messages(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  intelligence_type TEXT NOT NULL,
  version TEXT, -- e.g., 'v1.2.3'

  -- Source tracking
  source_file TEXT,
  source_lines TEXT, -- e.g., '145-289'
  training_data TEXT,

  -- Execution flow (JSONB array)
  execution_steps JSONB DEFAULT '[]'::jsonb,

  -- Response correlation
  generated_text TEXT,
  intelligence_mapping JSONB DEFAULT '[]'::jsonb,

  -- Performance metrics
  model_used TEXT, -- e.g., 'GPT-4-Turbo'
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost NUMERIC(10,6), -- USD
  confidence NUMERIC(5,2), -- 0-100

  -- Status
  status TEXT CHECK (status IN ('success', 'error', 'retry')),
  error TEXT,

  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER, -- milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intelligence_activations_session ON intelligence_activations(session_id);
CREATE INDEX idx_intelligence_activations_type ON intelligence_activations(intelligence_type);
CREATE INDEX idx_intelligence_activations_agent ON intelligence_activations(agent_id);
```

---

## 3. BACKEND API ENDPOINTS

### 3.1 Session Management

**POST /api/v26/session/start**
- Purpose: Initialize new onboarding session
- Request Body:
```typescript
{
  studentId: string; // 'huda-2025'
  sessionType: 'onboarding';
}
```
- Response:
```typescript
{
  sessionId: string;
  status: 'in_progress';
  currentAgent: 'assessment';
  initialMessage: {
    id: string;
    content: string;
    intelligenceType: string;
  };
}
```

**GET /api/v26/session/:sessionId**
- Purpose: Get session details
- Response: Complete MultiAgentSession object

**POST /api/v26/session/:sessionId/pause**
- Purpose: Pause active session
- Response: { status: 'paused' }

**POST /api/v26/session/:sessionId/resume**
- Purpose: Resume paused session
- Response: { status: 'in_progress', messages: [...] }

### 3.2 Agent Interactions

**POST /api/v26/agents/:agentId/message**
- Purpose: Send user message, get agent response
- agentId: 'assessment' | 'gameplan' | 'execution'
- Request Body:
```typescript
{
  sessionId: string;
  content: string; // user message
}
```
- Response:
```typescript
{
  message: {
    id: string;
    content: string;
    intelligenceType: string;
    processingTime: number;
    confidence: number;
  };
  intelligenceTrace: IntelligenceActivation;
  sessionUpdate: {
    currentPhase: string;
    analyticsUpdate: Partial<SessionAnalytics>;
  };
}
```

**GET /api/v26/agents/:agentId/status**
- Purpose: Get agent current status
- Response:
```typescript
{
  agentId: string;
  status: 'active' | 'standby' | 'processing' | 'complete';
  intelligenceLoaded: string[];
  messageCount: number;
}
```

### 3.3 Intelligence Trace

**GET /api/v26/session/:sessionId/trace**
- Purpose: Get all intelligence activations for session
- Query Params: ?agentId=assessment&limit=50
- Response:
```typescript
{
  activations: IntelligenceActivation[];
  total: number;
}
```

**GET /api/v26/session/:sessionId/analytics**
- Purpose: Get session analytics
- Response: SessionAnalytics object

### 3.4 Handoff

**POST /api/v26/session/:sessionId/handoff**
- Purpose: Trigger agent handoff
- Request Body:
```typescript
{
  fromAgent: string;
  toAgent: string;
  dataPackage: any; // AssessmentPackage | GamePlanPackage
}
```
- Response:
```typescript
{
  status: 'success';
  newAgent: string;
  initialMessage: Message;
}
```

---

## 4. FRONTEND IMPLEMENTATION

### 4.1 New Components Structure

```
/unified-frontend/apps/unified-app/src/components/v26/
├── MultiAgentsTab.tsx              # Main container
├── LandingView.tsx                 # Initial state with "Start Onboarding"
├── AgentCard.tsx                   # Reusable agent card component
├── AgentChatInterface.tsx          # Chat UI for active agent
├── IntelligenceTracePanel.tsx      # Expandable trace panel
├── OrchestrationFlow.tsx           # Right sidebar orchestration
├── SessionAnalytics.tsx            # Analytics display
├── AgentHandoffAnimation.tsx       # Handoff visual
└── types.ts                        # TypeScript interfaces
```

### 4.2 State Management

**Use React Context for global session state:**

```typescript
// SessionContext.tsx
interface SessionContextType {
  session: MultiAgentSession | null;
  activeAgent: string;
  sendMessage: (content: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const SessionContext = React.createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MultiAgentSession | null>(null);
  const [activeAgent, setActiveAgent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v26/agents/${activeAgent}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id,
          content
        })
      });
      const data = await response.json();

      // Update session with new message
      setSession(prev => ({
        ...prev!,
        messages: [...prev!.messages, data.message]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SessionContext.Provider value={{ session, activeAgent, sendMessage, loading, error }}>
      {children}
    </SessionContext.Provider>
  );
}
```

### 4.3 Key Component: MultiAgentsTab.tsx

```typescript
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { SessionProvider, useSession } from './SessionContext';
import LandingView from './LandingView';
import AgentCard from './AgentCard';
import OrchestrationFlow from './OrchestrationFlow';

export function MultiAgentsTab() {
  return (
    <SessionProvider>
      <MultiAgentsContent />
    </SessionProvider>
  );
}

function MultiAgentsContent() {
  const { session } = useSession();

  if (!session) {
    return <LandingView />;
  }

  return (
    <Container>
      <Header>
        <Title>MultiAgents Chat v2.0</Title>
        <SessionInfo>
          Session: New Student Huda Onboarding | Started: {formatTime(session.startedAt)}
        </SessionInfo>
      </Header>

      <MainLayout>
        <AgentsSidebar>
          {AGENTS.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={session.currentAgent === agent.id}
              status={getAgentStatus(agent.id, session)}
            />
          ))}
        </AgentsSidebar>

        <ActiveAgentPanel>
          {/* Render expanded agent card for current agent */}
          <AgentCard
            agent={AGENTS.find(a => a.id === session.currentAgent)}
            isActive={true}
            expanded={true}
          />
        </ActiveAgentPanel>

        <OrchestrationSidebar>
          <OrchestrationFlow session={session} />
        </OrchestrationSidebar>
      </MainLayout>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  gap: 20px;
  max-width: 1800px;
  margin: 0 auto;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;
```

### 4.4 Key Component: AgentCard.tsx

```typescript
import React, { useState } from 'react';
import styled from 'styled-components';
import AgentChatInterface from './AgentChatInterface';
import IntelligenceTracePanel from './IntelligenceTracePanel';

interface AgentCardProps {
  agent: Agent;
  isActive: boolean;
  status: AgentStatus;
  expanded?: boolean;
}

export function AgentCard({ agent, isActive, status, expanded = false }: AgentCardProps) {
  const [showTrace, setShowTrace] = useState(false);

  if (!expanded) {
    // Collapsed view for sidebar
    return (
      <CompactCard $active={isActive} $color={agent.color}>
        <AgentIcon>{agent.icon}</AgentIcon>
        <AgentName>{agent.name}</AgentName>
        <StatusIndicator $status={status}>
          {STATUS_ICONS[status]} {status.toUpperCase()}
        </StatusIndicator>
      </CompactCard>
    );
  }

  // Expanded view for main panel
  return (
    <ExpandedCard $color={agent.color}>
      <CardHeader>
        <HeaderLeft>
          <AgentIcon large>{agent.icon}</AgentIcon>
          <div>
            <AgentNameLarge>{agent.name}</AgentNameLarge>
            <AgentVersion>v{agent.version}</AgentVersion>
          </div>
        </HeaderLeft>
        <StatusBadge $status={status}>
          {STATUS_ICONS[status]} {status.toUpperCase()}
        </StatusBadge>
      </CardHeader>

      <AgentProfile>
        <ProfileSection>
          <SectionTitle>Primary Goal</SectionTitle>
          <SectionContent>{agent.goal}</SectionContent>
        </ProfileSection>
        <ProfileSection>
          <SectionTitle>Training</SectionTitle>
          <SectionContent>{agent.training}</SectionContent>
        </ProfileSection>
        <ProfileSection>
          <SectionTitle>Intelligence Types</SectionTitle>
          <IntelligenceList>
            {agent.intelligenceTypes.map((type, idx) => (
              <IntelligenceBadge key={idx} $active={type.active}>
                {type.name}
              </IntelligenceBadge>
            ))}
          </IntelligenceList>
        </ProfileSection>
      </AgentProfile>

      <ChatSection>
        <AgentChatInterface agentId={agent.id} />
      </ChatSection>

      <TraceSection>
        <TraceHeader onClick={() => setShowTrace(!showTrace)}>
          🔍 Intelligence Trace {showTrace ? '▲' : '▼'}
        </TraceHeader>
        {showTrace && <IntelligenceTracePanel agentId={agent.id} />}
      </TraceSection>
    </ExpandedCard>
  );
}
```

---

## 5. INTELLIGENCE TYPE INTEGRATION

### 5.1 Reuse Existing Intelligence Types

**No new intelligence files needed.** Use existing:

```
/services/agent-framework/src/intelligence/types/
├── TYPE-089-WarmOpening.ts          (Assessment Phase 1)
├── TYPE-090-DeepDiveQuestions.ts    (Assessment Phase 2)
├── TYPE-091-GapIdentification.ts    (Assessment Phase 3)
├── TYPE-092-PotentialActivation.ts  (Assessment Phase 4)
├── TYPE-001-GamePlanSynthesis.ts    (GamePlan)
├── TYPE-002-WeakSpotPrioritization.ts
├── TYPE-003-TimelineArchitecture.ts
├── TYPE-049-ExecutionLadderNavigation.ts (Execution Week 1)
├── TYPE-050-OutcomeEngineering.ts
├── TYPE-051-TaskDecomposition.ts
└── QuickWinsStrategy.ts
```

### 5.2 Intelligence Execution Pattern

```typescript
// Example: Execute TYPE-089-WarmOpening
import { IntelligenceRegistry } from '../intelligence/IntelligenceRegistry';

async function executeIntelligence(
  intelligenceType: string,
  context: any
): Promise<IntelligenceResult> {
  const startTime = Date.now();

  // Load intelligence from registry
  const intelligence = IntelligenceRegistry.get(intelligenceType);

  // Execute intelligence
  const result = await intelligence.execute(context);

  const duration = Date.now() - startTime;

  // Save activation trace
  await saveIntelligenceActivation({
    intelligenceType,
    duration,
    result,
    context
  });

  return result;
}
```

---

## 6. DEPLOYMENT & ROLLOUT

### 6.1 Database Migration

```sql
-- Run this migration to add v26 tables
-- File: services/agent-framework/migrations/026_multiagent_v26.sql

-- Create multiagent_sessions table
CREATE TABLE multiagent_sessions (...);

-- Create multiagent_messages table
CREATE TABLE multiagent_messages (...);

-- Create intelligence_activations table
CREATE TABLE intelligence_activations (...);

-- Add indexes
CREATE INDEX idx_multiagent_sessions_student ON multiagent_sessions(student_id);
...
```

### 6.2 Backend Deployment Steps

1. Add new routes to `/services/agent-framework/src/routes/v26.ts`
2. Import and register in main server file
3. Test all endpoints with Postman/curl
4. No changes to existing v25 routes

### 6.3 Frontend Deployment Steps

1. Add new v26 components to `/unified-frontend/apps/unified-app/src/components/v26/`
2. Update Header.tsx to add new tab (with hide logic for Application/Evidence/AI Chat)
3. Update StudentDashboard.tsx to route to MultiAgentsTab
4. Build and test locally
5. No changes to existing v25 components

### 6.4 Feature Flag (Optional)

```typescript
// featureFlags.ts
export const FEATURE_FLAGS = {
  multiagents_v26: process.env.ENABLE_MULTIAGENTS_V26 === 'true'
};

// Use in Header.tsx
{FEATURE_FLAGS.multiagents_v26 && (
  <TabButton active={activeTab === 'multiagents_v2'}>
    🤖 MultiAgents v2.0
  </TabButton>
)}
```

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests

**Backend:**
- Test each API endpoint independently
- Test intelligence type loading/execution
- Test session state transitions
- Test handoff logic

**Frontend:**
- Test component rendering
- Test user interactions (button clicks, message send)
- Test state management (SessionContext)

### 7.2 Integration Tests

- Complete onboarding flow (Assessment → GamePlan → Execution)
- Multi-agent handoff sequence
- Intelligence trace accuracy
- Error handling and retries

### 7.3 Manual Testing

**Test Case 1: New Student Onboarding**
1. Click "MultiAgents v2.0" tab
2. Click "New Student Huda Onboarding Start"
3. Complete Assessment session (all 4 phases)
4. Verify handoff to GamePlan Agent
5. Complete GamePlan session
6. Verify handoff to Execution Agent
7. Complete Week 1 planning
8. Verify session completes successfully

**Test Case 2: Session Resume**
1. Start new session
2. Close tab mid-assessment
3. Reopen tab
4. Verify resume option appears
5. Resume and continue from exact point

### 7.4 Performance Testing

- Load test: 10 concurrent sessions
- Response time: Average < 3s per message
- Database queries: < 100ms per query
- Intelligence activation: < 500ms average

---

## 8. MONITORING & OBSERVABILITY

### 8.1 Logging

```typescript
// Log all intelligence activations
logger.info('Intelligence activated', {
  sessionId,
  intelligenceType,
  duration,
  confidence,
  cost
});

// Log all errors
logger.error('Agent message failed', {
  sessionId,
  agentId,
  error,
  retryCount
});
```

### 8.2 Metrics to Track

- Sessions started per day
- Sessions completed per day
- Average session duration
- Intelligence activation frequency
- Average response time
- Error rate
- Cost per session

---

## 9. SECURITY CONSIDERATIONS

### 9.1 Authentication

- Reuse existing JWT authentication
- Verify student_id matches authenticated user
- No cross-student data access

### 9.2 Input Validation

- Sanitize all user inputs (XSS protection)
- Rate limiting: Max 1 message per 3 seconds
- Max message length: 2000 characters

### 9.3 Data Privacy

- All session data tied to student_id
- No sharing of intelligence activations between students
- Comply with existing data retention policies

---

## 10. ROLLBACK PLAN

### 10.1 If Issues Detected

1. Hide MultiAgents v2.0 tab via feature flag
2. All v25.0 tabs continue working (zero impact)
3. Database tables remain (data preserved)
4. Debug and fix issues
5. Re-enable feature flag

### 10.2 Database Rollback

```sql
-- If needed to remove v26 tables
DROP TABLE IF EXISTS intelligence_activations CASCADE;
DROP TABLE IF EXISTS multiagent_messages CASCADE;
DROP TABLE IF EXISTS multiagent_sessions CASCADE;
```

---

**Status:** ✅ Technical Specification Complete - Ready for Implementation
**Next Steps:**
1. Review all 3 specs (UI/UX, Product, Tech)
2. User approval
3. Begin implementation
