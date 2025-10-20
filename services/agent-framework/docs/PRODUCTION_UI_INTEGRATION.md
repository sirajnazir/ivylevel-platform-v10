# Production UI Integration Guide - Agent Framework v1.0

**Date:** 2025-10-17
**Version:** v1.0
**Purpose:** Integrate Agent Framework backend with any production UI (ChatKit, custom React, etc.)

---

## Overview

The Agent Framework provides a **backend API** for multi-agent conversations. Your production UI (whether ChatKit, custom React, or any other frontend) integrates by calling these RESTful endpoints.

**Key Principle:** The backend is UI-agnostic. All business logic, agent routing, and data resolution happens server-side. The UI is responsible only for:
1. Rendering messages
2. Sending user input
3. Displaying agent responses
4. Handling authentication

---

## 🔑 Authentication Flow

### 1. Login Endpoint

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "jenny@ivylevel.com",
  "password": "IvyLevel2024!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 3600,
  "user": {
    "coach_id": "jenny-coach",
    "email": "jenny@ivylevel.com",
    "role": "coach"
  }
}
```

**UI Implementation:**
```typescript
// Your UI login function
async function login(email: string, password: string) {
  const response = await fetch('http://localhost:8788/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  // Store tokens in localStorage or secure cookie
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);

  return data;
}
```

### 2. Get Current User Profile

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "coach_id": "jenny-coach",
  "email": "jenny@ivylevel.com",
  "role": "coach",
  "permissions": ["view_students", "chat"]
}
```

### 3. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Request:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "expires_in": 3600
}
```

---

## 💬 Chat API

### Main Chat Endpoint

**Endpoint:** `POST /api/agents/chat`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "student_id": "huda-2025",
  "message": "What scholarships have I won?",
  "session_id": "optional-existing-session-id"
}
```

**Response:**
```json
{
  "session_id": "sess_huda-2025_1760759373472",
  "agent_id": "scholarship-agent",
  "response": {
    "content": "💰 **Scholarship Summary:**\n\n**Total Secured: $25,000** (5 scholarships accepted)\n\n**Accepted (5):**\n1. ✅ Community Foundation Scholarship - $10,000 (largest award!)\n2. ✅ STEM Excellence Award - $5,000\n...",
    "tool_calls": [
      {
        "name": "get_scholarships_accepted",
        "args": { "student_id": "huda-2025" }
      }
    ],
    "evidence": [
      { "kind": "evidence", "text": "scholarships (accepted)" }
    ]
  },
  "metadata": {
    "agent_name": "Jenny - Scholarship Coach",
    "timestamp": "2025-10-17T12:00:00Z",
    "latency_ms": 850
  }
}
```

### UI Implementation

```typescript
// Your UI chat function
async function sendMessage(studentId: string, message: string, sessionId?: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:8788/api/agents/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      student_id: studentId,
      message: message,
      session_id: sessionId // Optional: maintain conversation context
    })
  });

  if (response.status === 401) {
    // Token expired, refresh it
    await refreshToken();
    return sendMessage(studentId, message, sessionId);
  }

  const data = await response.json();
  return data;
}

// Example React component
function ChatInterface({ studentId }: { studentId: string }) {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleSend = async (userMessage: string) => {
    // Add user message to UI
    setMessages([...messages, { role: 'user', content: userMessage }]);

    // Call backend
    const response = await sendMessage(studentId, userMessage, sessionId);

    // Store session ID for conversation continuity
    if (!sessionId) {
      setSessionId(response.session_id);
    }

    // Add assistant response to UI
    setMessages([
      ...messages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response.response.content, agent: response.agent_id }
    ]);
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i} className={msg.role}>
          {msg.content}
        </div>
      ))}
      <input onSubmit={(e) => handleSend(e.target.value)} />
    </div>
  );
}
```

---

## 📋 Agent Management

### List All Agents

**Endpoint:** `GET /api/agents/list`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "agents": [
    {
      "agent_id": "gameplan-agent",
      "display_name": "Jenny - Game Plan Strategist",
      "category": "strategy",
      "tagline": "your strategic planning partner",
      "version": "1.0.0",
      "status": "active",
      "tools_count": 12,
      "intents": ["planning.gameplan", "planning.timeline", "planning.strategy"]
    },
    {
      "agent_id": "scholarship-agent",
      "display_name": "Jenny - Scholarship Coach",
      "category": "finance",
      "tagline": "your scholarship and financial aid guide",
      "version": "1.0.0",
      "status": "active",
      "tools_count": 7,
      "intents": ["scholarship.list", "scholarship.accepted", "scholarship.money"]
    }
    // ... 7 more agents
  ],
  "total": 9
}
```

**UI Usage:**
- Display agent list in sidebar
- Show agent specialties
- Allow user to switch context

### Get Agent Details

**Endpoint:** `GET /api/agents/:agent_id`

**Example:** `GET /api/agents/scholarship-agent`

**Response:**
```json
{
  "agent_id": "scholarship-agent",
  "display_name": "Jenny - Scholarship Coach",
  "tagline": "your scholarship and financial aid guide",
  "version": "1.0.0",
  "category": "finance",
  "tools": [
    {
      "name": "get_scholarships_list",
      "description": "Get all scholarships for a student"
    },
    {
      "name": "get_scholarships_accepted",
      "description": "Get accepted scholarships only"
    }
  ],
  "intents": [
    {
      "intent_id": "scholarship.list",
      "patterns": ["show my scholarships", "list all scholarships"]
    }
  ],
  "jtbd": {
    "student": "I want to track all my scholarship applications and know how much money I have secured",
    "parent": "I want to see my child's total scholarship money won and what is still pending"
  }
}
```

---

## 📊 Session & History

### Get Student Sessions

**Endpoint:** `GET /api/agents/sessions/:student_id`

**Example:** `GET /api/agents/sessions/huda-2025`

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "sess_huda-2025_1760759373472",
      "student_id": "huda-2025",
      "coach_id": "jenny-coach",
      "session_type": "chat",
      "started_at": "2025-10-17T10:00:00Z",
      "last_activity": "2025-10-17T10:15:00Z",
      "message_count": 5,
      "agents_used": ["scholarship-agent", "gameplan-agent"]
    }
  ],
  "total": 15
}
```

### Get Conversation Replay

**Endpoint:** `GET /api/agents/replay/:session_id`

**Example:** `GET /api/agents/replay/sess_huda-2025_1760759373472`

**Response:**
```json
{
  "session_id": "sess_huda-2025_1760759373472",
  "student_id": "huda-2025",
  "messages": [
    {
      "role": "user",
      "content": "What scholarships have I won?",
      "timestamp": "2025-10-17T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "💰 **Scholarship Summary:**...",
      "agent_id": "scholarship-agent",
      "timestamp": "2025-10-17T10:00:02Z",
      "tool_calls": ["get_scholarships_accepted"],
      "evidence": ["scholarships (accepted)"]
    }
  ],
  "metadata": {
    "duration_seconds": 900,
    "agents_used": ["scholarship-agent"]
  }
}
```

**UI Usage:**
- Show conversation history
- Allow users to resume previous conversations
- Display which agents were involved

---

## 🎨 UI Component Patterns

### 1. Message Rendering

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent_id?: string;
  timestamp: string;
  evidence?: Array<{ kind: string; text: string }>;
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`message ${message.role}`}>
      {message.role === 'assistant' && (
        <div className="agent-badge">
          {getAgentName(message.agent_id)}
        </div>
      )}

      <div className="content">
        {/* Render markdown */}
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {message.evidence && message.evidence.length > 0 && (
        <div className="evidence-chips">
          {message.evidence.map((e, i) => (
            <span key={i} className="chip">{e.text}</span>
          ))}
        </div>
      )}

      <div className="timestamp">
        {formatTime(message.timestamp)}
      </div>
    </div>
  );
}
```

### 2. Agent Selector (Optional)

```typescript
function AgentSelector({ onSelect }: { onSelect: (agentId: string) => void }) {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetch('/api/agents/list', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => setAgents(data.agents));
  }, []);

  return (
    <div className="agent-selector">
      <h3>Choose a Coach:</h3>
      {agents.map(agent => (
        <button key={agent.agent_id} onClick={() => onSelect(agent.agent_id)}>
          <div className="agent-card">
            <h4>{agent.display_name}</h4>
            <p>{agent.tagline}</p>
            <span className="category">{agent.category}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

### 3. Session History Sidebar

```typescript
function SessionHistory({ studentId }: { studentId: string }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetch(`/api/agents/sessions/${studentId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => setSessions(data.sessions));
  }, [studentId]);

  return (
    <div className="session-history">
      <h3>Previous Conversations</h3>
      {sessions.map(session => (
        <div key={session.session_id} className="session-item">
          <div className="session-date">
            {formatDate(session.started_at)}
          </div>
          <div className="session-info">
            {session.message_count} messages
            <br />
            Agents: {session.agents_used.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 Real-Time Features (Optional)

### WebSocket Integration

For real-time streaming responses (optional enhancement):

```typescript
// WebSocket connection (future enhancement)
const ws = new WebSocket('ws://localhost:8788/api/agents/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({
    token: getToken(),
    student_id: 'huda-2025',
    message: 'What scholarships have I won?'
  }));
};

ws.onmessage = (event) => {
  const chunk = JSON.parse(event.data);

  if (chunk.type === 'content') {
    // Stream token-by-token to UI
    appendToMessage(chunk.content);
  } else if (chunk.type === 'done') {
    // Response complete
    finalizeMessage(chunk.metadata);
  }
};
```

**Note:** WebSocket streaming is not yet implemented. Current API uses standard HTTP request/response.

---

## 🚀 Deployment Configuration

### Environment Variables

Your UI needs these environment variables:

```bash
# .env.production
NEXT_PUBLIC_AGENT_API_URL=https://api.ivylevel.com/agents
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_STUDENT_ID=huda-2025  # Or from user session
```

### API URL Configuration

```typescript
// config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8788',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    CHAT: '/api/agents/chat',
    AGENTS_LIST: '/api/agents/list',
    SESSIONS: '/api/agents/sessions'
  }
};

// API client
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Handle token refresh
    await refreshAuthToken();
    return apiRequest(endpoint, options);
  }

  return response.json();
}
```

---

## 📱 Mobile Integration (React Native)

Same API endpoints work for mobile:

```typescript
// React Native example
import AsyncStorage from '@react-native-async-storage/async-storage';

async function sendMessage(message: string) {
  const token = await AsyncStorage.getItem('access_token');
  const studentId = await AsyncStorage.getItem('student_id');

  const response = await fetch('https://api.ivylevel.com/agents/api/agents/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      student_id: studentId,
      message: message
    })
  });

  return response.json();
}
```

---

## ✅ Production Checklist

### Before Launch:
- [ ] Replace `http://localhost:8788` with production URL
- [ ] Implement token refresh logic
- [ ] Add error handling for network failures
- [ ] Add loading states during API calls
- [ ] Implement retry logic for failed requests
- [ ] Add proper CORS configuration on backend
- [ ] Test with multiple concurrent users
- [ ] Implement rate limiting awareness in UI
- [ ] Add analytics/tracking (PostHog integration)
- [ ] Test on mobile devices
- [ ] Implement offline mode (queue messages)
- [ ] Add user feedback for long-running operations

---

## 🎯 Best Practices

### 1. Session Management
- Store `session_id` to maintain conversation context
- Clear `session_id` when starting a new topic
- Allow users to resume previous sessions

### 2. Error Handling
```typescript
async function handleAPIError(error: any) {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.status === 429) {
    // Rate limited
    showToast('Too many requests. Please wait a moment.');
  } else if (error.status === 500) {
    // Server error
    showToast('Something went wrong. Our team has been notified.');
  }
}
```

### 3. Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);

async function sendMessage(message: string) {
  setIsLoading(true);
  try {
    const response = await apiRequest('/api/agents/chat', {
      method: 'POST',
      body: JSON.stringify({ student_id, message })
    });
    return response;
  } finally {
    setIsLoading(false);
  }
}
```

### 4. Optimistic Updates
```typescript
// Add message to UI immediately (optimistic)
const optimisticMessage = {
  role: 'user',
  content: userInput,
  timestamp: new Date().toISOString(),
  pending: true
};
setMessages([...messages, optimisticMessage]);

// Send to backend
const response = await sendMessage(userInput);

// Replace optimistic message with confirmed one
updateMessage(optimisticMessage.id, { pending: false });
```

---

## 📞 Support & Documentation

- **Backend API Docs:** See `services/agent-framework/README.md`
- **Agent Specs:** See `services/agent-framework/docs/`
- **Test UI Example:** See `apps/test-chat-ui/` for reference implementation

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-10-17
**Backend Version:** v1.0
**Supported UI Frameworks:** React, Next.js, React Native, Vue, Angular (any HTTP client)
