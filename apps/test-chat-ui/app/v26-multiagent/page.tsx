'use client';

/**
 * v26 MultiAgent Test Page
 *
 * Full multi-agent orchestration UI with:
 * - Agent cards with visual states (active, idle, delegating, processing)
 * - Session-based conversation flow
 * - Intelligence type activation traces
 * - Agent handoff visualization
 *
 * Created: 2025-11-04 (v30.1.1)
 */

import { useState, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

type AgentStatus = 'idle' | 'active' | 'processing' | 'delegating' | 'completed';

type AgentCard = {
  agent_id: string;
  display_name: string;
  tagline: string;
  icon: string;
  color: string;
  status: AgentStatus;
  intelligence_types: string[];
};

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_id?: string;
  agent_name?: string;
  timestamp: string;
  intelligence_activated?: string[];
  processing_time_ms?: number;
};

type SessionState = {
  session_id: string | null;
  current_phase: 'assessment' | 'gameplan' | 'execution' | 'specialist' | 'complete';
  current_agent: string;
  status: 'in_progress' | 'paused' | 'completed';
};

// ============================================================================
// Agent Definitions
// ============================================================================

const AGENTS: Record<string, AgentCard> = {
  'assessment-agent-v18': {
    agent_id: 'assessment-agent-v18',
    display_name: 'Assessment Agent',
    tagline: '4-phase evaluation, IvyScore, gap analysis',
    icon: '🎯',
    color: '#8b5cf6', // purple
    status: 'idle',
    intelligence_types: ['TYPE-080', 'TYPE-081', 'TYPE-082', 'TYPE-083', 'TYPE-085', 'TYPE-086'],
  },
  'gameplan-agent-v18': {
    agent_id: 'gameplan-agent-v18',
    display_name: 'GamePlan Agent',
    tagline: 'Strategic roadmap, timeline architecture',
    icon: '🗺️',
    color: '#3b82f6', // blue
    status: 'idle',
    intelligence_types: ['TYPE-001', 'TYPE-002', 'TYPE-003', 'TYPE-004', 'TYPE-006', 'TYPE-007'],
  },
  'awards-agent-v18': {
    agent_id: 'awards-agent-v18',
    display_name: 'Awards Agent',
    tagline: 'Award arbitrage, quick wins, tier classification',
    icon: '🏆',
    color: '#eab308', // yellow
    status: 'idle',
    intelligence_types: ['TYPE-022', 'TYPE-023', 'TYPE-024', 'TYPE-025', 'TYPE-026', 'TYPE-027'],
  },
  'extracurriculars-agent-v18': {
    agent_id: 'extracurriculars-agent-v18',
    display_name: 'ECs Agent',
    tagline: 'Portfolio optimization, narrative synthesis',
    icon: '🎨',
    color: '#10b981', // green
    status: 'idle',
    intelligence_types: ['TYPE-013', 'TYPE-014', 'TYPE-015', 'TYPE-016', 'TYPE-019'],
  },
  'summer-programs-agent-v18': {
    agent_id: 'summer-programs-agent-v18',
    display_name: 'Summer Programs',
    tagline: 'Program selection, application strategy, ROI',
    icon: '☀️',
    color: '#f59e0b', // orange
    status: 'idle',
    intelligence_types: ['TYPE-028', 'TYPE-029', 'TYPE-030'],
  },
  'scholarships-agent-v18': {
    agent_id: 'scholarships-agent-v18',
    display_name: 'Scholarships',
    tagline: 'Scholarship scoring, timeline, financial aid',
    icon: '💰',
    color: '#06b6d4', // cyan
    status: 'idle',
    intelligence_types: ['TYPE-031', 'TYPE-032', 'TYPE-033'],
  },
  'execution-agent-v18': {
    agent_id: 'execution-agent-v18',
    display_name: 'Execution Agent',
    tagline: 'Task decomposition, outcome engineering',
    icon: '⚡',
    color: '#ef4444', // red
    status: 'idle',
    intelligence_types: ['TYPE-049', 'TYPE-050', 'TYPE-051', 'TYPE-052', 'TYPE-053', 'TYPE-054', 'TYPE-055', 'TYPE-056', 'TYPE-057', 'TYPE-058', 'TYPE-059', 'TYPE-060', 'TYPE-061', 'TYPE-062', 'TYPE-063'],
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function V26MultiAgentPage() {
  // State
  const [studentId, setStudentId] = useState('huda-2025');
  const [sessionState, setSessionState] = useState<SessionState>({
    session_id: null,
    current_phase: 'assessment',
    current_agent: 'assessment-agent-v18',
    status: 'in_progress',
  });
  const [agents, setAgents] = useState<Record<string, AgentCard>>(AGENTS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTrace, setShowTrace] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update agent statuses based on current agent
  useEffect(() => {
    const updated = { ...agents };
    Object.keys(updated).forEach(agentId => {
      if (agentId === sessionState.current_agent) {
        updated[agentId].status = loading ? 'processing' : 'active';
      } else {
        updated[agentId].status = 'idle';
      }
    });
    setAgents(updated);
  }, [sessionState.current_agent, loading]);

  // ============================================================================
  // API Functions
  // ============================================================================

  async function startSession() {
    try {
      const response = await fetch('/api/v26/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          session_type: 'onboarding',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.status}`);
      }

      const data = await response.json();

      setSessionState({
        session_id: data.session_id,
        current_phase: data.current_phase,
        current_agent: data.current_agent,
        status: data.status,
      });

      // Add welcome message
      setMessages([{
        role: 'system',
        content: data.welcome_message || 'Session started! Begin chatting with the Assessment Agent.',
        timestamp: new Date().toISOString(),
      }]);

      console.log('[SESSION_START]', data);
    } catch (error: any) {
      alert(`Failed to start session: ${error.message}`);
      console.error('[SESSION_START_ERROR]', error);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading || !sessionState.session_id) return;

    const userMessage = input;
    setInput('');
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const response = await fetch(`/api/v26/agents/${sessionState.current_agent}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionState.session_id,
          student_id: studentId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent request failed: ${response.status}`);
      }

      const data = await response.json();

      // Check for delegation
      if (data.delegation) {
        // Mark current agent as delegating
        setAgents(prev => ({
          ...prev,
          [sessionState.current_agent]: {
            ...prev[sessionState.current_agent],
            status: 'delegating',
          },
        }));

        // Add delegation system message
        setMessages(prev => [...prev, {
          role: 'system',
          content: `🔀 ${AGENTS[sessionState.current_agent].display_name} is delegating to specialist agents...`,
          timestamp: new Date().toISOString(),
        }]);

        // Show delegated agent responses
        if (data.delegation.results) {
          for (const result of data.delegation.results) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: result.response,
              agent_id: result.agent_id,
              agent_name: AGENTS[result.agent_id]?.display_name || result.agent_id,
              timestamp: new Date().toISOString(),
              intelligence_activated: result.intelligence_activated,
              processing_time_ms: result.processing_time_ms,
            }]);
          }
        }
      }

      // Add agent response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        agent_id: sessionState.current_agent,
        agent_name: AGENTS[sessionState.current_agent].display_name,
        timestamp: new Date().toISOString(),
        intelligence_activated: data.intelligence_activated,
        processing_time_ms: data.processing_time_ms,
      }]);

      // Check for handoff
      if (data.handoff) {
        setSessionState(prev => ({
          ...prev,
          current_agent: data.handoff.to_agent,
          current_phase: data.handoff.phase,
        }));

        setMessages(prev => [...prev, {
          role: 'system',
          content: `✨ Handing off to ${AGENTS[data.handoff.to_agent]?.display_name || data.handoff.to_agent}`,
          timestamp: new Date().toISOString(),
        }]);
      }

      console.log('[MESSAGE_RESPONSE]', data);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      }]);
      console.error('[MESSAGE_ERROR]', error);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function resetSession() {
    setSessionState({
      session_id: null,
      current_phase: 'assessment',
      current_agent: 'assessment-agent-v18',
      status: 'in_progress',
    });
    setMessages([]);
    setAgents(AGENTS);
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                🤖 v26 MultiAgent Platform
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                7 Specialized AI Agents • 46 Intelligence Types • Zero-Hallucination Architecture
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Version</div>
              <div className="text-lg font-bold text-indigo-600">v30.1.1</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Left Sidebar - Agent Cards */}
          <div className="col-span-3 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Session Control</h2>

              {!sessionState.session_id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="student-id"
                    />
                  </div>
                  <button
                    onClick={startSession}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Start Session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs">
                    <div className="font-medium text-slate-700">Session ID</div>
                    <div className="text-slate-500 font-mono break-all">
                      {sessionState.session_id.slice(0, 24)}...
                    </div>
                  </div>
                  <div className="text-xs">
                    <div className="font-medium text-slate-700">Current Phase</div>
                    <div className="text-indigo-600 font-semibold capitalize">
                      {sessionState.current_phase}
                    </div>
                  </div>
                  <div className="text-xs">
                    <div className="font-medium text-slate-700">Messages</div>
                    <div className="text-slate-500">{messages.length} total</div>
                  </div>
                  <button
                    onClick={resetSession}
                    className="w-full bg-slate-200 text-slate-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-slate-300 transition-colors"
                  >
                    Reset Session
                  </button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={showTrace}
                    onChange={(e) => setShowTrace(e.target.checked)}
                    className="rounded"
                  />
                  Show Intelligence Traces
                </label>
              </div>
            </div>

            {/* Agent Cards */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700 px-1">Active Agents</h2>
              {Object.values(agents).map(agent => (
                <AgentCardComponent key={agent.agent_id} agent={agent} />
              ))}
            </div>
          </div>

          {/* Center - Chat Area */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && !sessionState.session_id && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">
                      Welcome to v26 MultiAgent Platform
                    </h3>
                    <p className="text-slate-500 max-w-md">
                      Start a session to begin your journey with our specialized AI agents.
                      Each agent brings unique intelligence types to help you succeed.
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <MessageComponent key={idx} message={msg} showTrace={showTrace} />
                ))}

                {loading && (
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-indigo-600"></div>
                    <span className="text-sm">
                      {AGENTS[sessionState.current_agent]?.display_name} is thinking...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {sessionState.session_id && (
                <div className="border-t border-slate-200 p-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message ${AGENTS[sessionState.current_agent]?.display_name}...`}
                      disabled={loading}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function AgentCardComponent({ agent }: { agent: AgentCard }) {
  const getStatusStyle = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return 'ring-2 ring-offset-2 shadow-lg scale-105';
      case 'processing':
        return 'ring-2 ring-offset-2 shadow-lg animate-pulse';
      case 'delegating':
        return 'ring-2 ring-yellow-400 ring-offset-2 shadow-md';
      case 'completed':
        return 'ring-2 ring-green-400 opacity-75';
      case 'idle':
      default:
        return 'opacity-60 grayscale';
    }
  };

  const getStatusIndicator = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />;
      case 'processing':
        return <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />;
      case 'delegating':
        return <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" />;
      case 'completed':
        return <div className="w-2 h-2 rounded-full bg-gray-400" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-300" />;
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 p-3 transition-all duration-300 ${getStatusStyle(agent.status)}`}
      style={{ borderColor: agent.status === 'active' || agent.status === 'processing' ? agent.color : '#e2e8f0' }}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{agent.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-800 truncate">
              {agent.display_name}
            </h3>
            {getStatusIndicator(agent.status)}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            {agent.tagline}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
            <span>⚡</span>
            <span>{agent.intelligence_types.length} types</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageComponent({ message, showTrace }: { message: Message; showTrace: boolean }) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-slate-100 text-slate-600 text-sm px-4 py-2 rounded-full border border-slate-200">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-2xl shadow-sm">
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="max-w-3xl">
        {message.agent_name && (
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
            <span>{AGENTS[message.agent_id!]?.icon}</span>
            <span>{message.agent_name}</span>
          </div>
        )}
        <div className="bg-slate-100 text-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>

          {showTrace && message.intelligence_activated && message.intelligence_activated.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500 mb-2">Intelligence Activated:</div>
              <div className="flex flex-wrap gap-1">
                {message.intelligence_activated.map(type => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-mono"
                  >
                    {type}
                  </span>
                ))}
              </div>
              {message.processing_time_ms && (
                <div className="text-xs text-slate-400 mt-2">
                  Processed in {message.processing_time_ms}ms
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
