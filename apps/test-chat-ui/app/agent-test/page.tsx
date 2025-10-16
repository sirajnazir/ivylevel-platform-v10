'use client';

/**
 * Agent Framework Test Page (v1.0)
 * Test interface for the new agent-framework system
 * Created: 2025-10-16 (Week 5)
 */

import { useState, useEffect } from 'react';

type Chip = {
  kind: 'evidence' | 'insight' | 'source';
  text: string;
};

type Message = {
  role: 'user' | 'assistant';
  text: string;
  chips?: Chip[];
  debug?: {
    agent_id?: string;
    tools_called?: string[];
    took_ms?: number;
    source?: string;
  };
  handoff?: {
    to_agent: string;
    reason: string;
  };
};

type Agent = {
  agent_id: string;
  display_name: string;
  tagline: string;
  category: string;
  version: string;
  tools_count: number;
  intents_count: number;
};

export default function AgentTestPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('huda-2025');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('auto');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Load available agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const res = await fetch('/api/agent-chat?path=list');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/agent-chat?path=stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;

    const userText = input;
    setHistory((h) => [...h, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          message: userText,
          agent_id: selectedAgent === 'auto' ? undefined : selectedAgent,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      // Update session ID if this was a new session
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      setHistory((h) => [
        ...h,
        {
          role: 'assistant',
          text: data.answer,
          chips: data.chips,
          debug: data.debug,
          handoff: data.handoff,
        },
      ]);
    } catch (error: any) {
      setHistory((h) => [
        ...h,
        {
          role: 'assistant',
          text: `❌ Error: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearHistory() {
    setHistory([]);
    setSessionId(null);
  }

  function handleHandoff(agentId: string) {
    setSelectedAgent(agentId);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid #e5e7eb',
          padding: '20px',
          overflowY: 'auto',
          backgroundColor: '#f9fafb',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Agent Framework Test
        </h2>

        {/* Student ID */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
            Student ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            placeholder="student-id"
          />
        </div>

        {/* Agent Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
            Agent
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
            }}
          >
            <option value="auto">🎯 Auto-route</option>
            {agents.map((agent) => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.display_name.replace('Jenny - ', '')}
              </option>
            ))}
          </select>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {selectedAgent === 'auto' ? (
              'Routes based on intent'
            ) : (
              <>
                {agents.find((a) => a.agent_id === selectedAgent)?.tools_count || 0} tools,{' '}
                {agents.find((a) => a.agent_id === selectedAgent)?.intents_count || 0} intents
              </>
            )}
          </div>
        </div>

        {/* Session Info */}
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#4338ca', marginBottom: '4px' }}>
            Session
          </div>
          <div style={{ fontSize: '10px', color: '#4338ca', wordBreak: 'break-all' }}>
            {sessionId ? sessionId.slice(0, 30) + '...' : 'No session yet'}
          </div>
          <div style={{ fontSize: '11px', color: '#4338ca', marginTop: '4px' }}>
            {history.length / 2} turns
          </div>
        </div>

        {/* Available Agents */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
            Available Agents ({agents.length})
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.6' }}>
            {agents.map((agent) => (
              <div key={agent.agent_id} style={{ marginBottom: '6px' }}>
                <strong>{agent.display_name.replace('Jenny - ', '')}</strong>
                <div style={{ color: '#9ca3af', fontSize: '10px' }}>{agent.tagline}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={clearHistory}
            style={{
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Clear History
          </button>
          <button
            onClick={loadStats}
            style={{
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Load Stats
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
            />
            Show Debug Info
          </label>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ marginTop: '20px', fontSize: '11px', color: '#6b7280' }}>
            <div style={{ fontWeight: '500', marginBottom: '8px' }}>Usage Stats</div>
            <div>Total requests: {stats.total_requests}</div>
            {stats.agents?.map((agent: any) => (
              <div key={agent.agent_id} style={{ marginTop: '4px' }}>
                {agent.agent_id}: {agent.request_count}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            Jenny Agent Framework Test
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Testing 5 specialized agents with zero-hallucination architecture
          </p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {history.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                Ask Jenny anything
              </div>
              <div style={{ fontSize: '13px' }}>
                Try: "What is my game plan?" or "What awards do I have?"
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: '20px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
                  color: msg.role === 'user' ? '#ffffff' : '#1f2937',
                }}
              >
                {/* Message Text */}
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6' }}>
                  {msg.text}
                </div>

                {/* Evidence Chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {msg.chips.map((chip, j) => (
                      <span
                        key={j}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#e0e7ff',
                          color: '#4338ca',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                        }}
                      >
                        {chip.text}
                      </span>
                    ))}
                  </div>
                )}

                {/* Debug Info */}
                {showDebug && msg.debug && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#fef3c7',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#92400e',
                    }}
                  >
                    <div>
                      <strong>Agent:</strong> {msg.debug.agent_id || 'unknown'}
                    </div>
                    {msg.debug.tools_called && msg.debug.tools_called.length > 0 && (
                      <div>
                        <strong>Tools:</strong> {msg.debug.tools_called.join(', ')}
                      </div>
                    )}
                    <div>
                      <strong>Duration:</strong> {msg.debug.took_ms}ms
                    </div>
                  </div>
                )}

                {/* Handoff Suggestion */}
                {msg.handoff && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#dbeafe',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#1e40af',
                    }}
                  >
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      💡 Handoff Suggestion
                    </div>
                    <div style={{ marginBottom: '8px' }}>{msg.handoff.reason}</div>
                    <button
                      onClick={() => handleHandoff(msg.handoff!.to_agent)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Switch to {msg.handoff.to_agent}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>
              <div style={{ fontSize: '14px' }}>🤖 Jenny is thinking...</div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Jenny about your college application..."
              rows={2}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'none',
                fontFamily: 'inherit',
              }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: loading || !input.trim() ? '#d1d5db' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
