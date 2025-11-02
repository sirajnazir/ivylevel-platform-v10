/**
 * v26.1 MultiAgents Tab - Redesigned with Intelligence Logging
 *
 * Features:
 * - 2-column responsive card layout (2 cards per row on desktop, 1 on mobile)
 * - Real-time intelligence logging panel showing behind-the-scenes processing
 * - Detailed flow tracing aligned with MULTIAGENT_INTELLIGENCE_FLOW_MASTER_SPEC
 *
 * Created: 2025-11-01
 * Version: v26.1
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

interface MultiAgentSession {
  id: string;
  student_id: string;
  session_type: string;
  status: 'in_progress' | 'completed' | 'paused' | 'error';
  current_phase: 'assessment' | 'gameplan' | 'execution' | 'complete';
  current_agent: string;
  started_at: string;
  completed_at?: string;
}

interface Message {
  id: string;
  session_id: string;
  agent_id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  intelligence_triggered?: string[];
  processing_time?: number;
  confidence?: number;
  timestamp: string;
  metadata?: any;
}

interface IntelligenceLog {
  id: string;
  timestamp: string;
  level: 'system' | 'agent' | 'intelligence' | 'fact' | 'synthesis';
  message: string;
  details?: any;
}

interface AgentCardData {
  agent_id: string;
  name: string;
  emoji: string;
  color: string;
  messages: Message[];
  isActive: boolean;
}

// ============================================================================
// Styled Components
// ============================================================================

const PageContainer = styled.div`
  display: flex;
  height: calc(100vh - 120px);
  background: #f1f5f9;
  gap: 0;
  overflow: hidden;
`;

// Left side: Agent cards (60% width)
const AgentCardsContainer = styled.div`
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px;
  background: #f8fafc;
  gap: 16px;

  @media (max-width: 1200px) {
    flex: 0 0 100%;
  }
`;

// Right side: Intelligence logging panel (40% width)
const IntelligencePanel = styled.div`
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  background: #1e293b;
  color: #e2e8f0;
  border-left: 2px solid #334155;
  overflow: hidden;

  @media (max-width: 1200px) {
    display: none;
  }
`;

const IntelligencePanelHeader = styled.div`
  padding: 16px 20px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const IntelligencePanelTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IntelligenceLogContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.6;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1e293b;
  }

  &::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 4px;
  }
`;

const LogEntry = styled.div<{ $level: string }>`
  padding: 8px 12px;
  margin-bottom: 6px;
  border-left: 3px solid ${props => {
    switch (props.$level) {
      case 'system': return '#3b82f6';
      case 'agent': return '#8b5cf6';
      case 'intelligence': return '#10b981';
      case 'fact': return '#f59e0b';
      case 'synthesis': return '#ec4899';
      default: return '#64748b';
    }
  }};
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
`;

const LogTimestamp = styled.span`
  color: #64748b;
  margin-right: 8px;
`;

const LogLevel = styled.span<{ $level: string }>`
  color: ${props => {
    switch (props.$level) {
      case 'system': return '#60a5fa';
      case 'agent': return '#a78bfa';
      case 'intelligence': return '#34d399';
      case 'fact': return '#fbbf24';
      case 'synthesis': return '#f472b6';
      default: return '#94a3b8';
    }
  }};
  font-weight: 600;
  margin-right: 8px;
  text-transform: uppercase;
`;

const LogMessage = styled.div`
  color: #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
`;

const LogDetails = styled.pre`
  margin: 6px 0 0 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  font-size: 10px;
  color: #cbd5e1;
  overflow-x: auto;
`;

// Agent cards grid
const AgentCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const AgentCard = styled.div<{ $color: string; $isActive: boolean }>`
  background: white;
  border-radius: 12px;
  border: 2px solid ${props => props.$isActive ? props.$color : '#e2e8f0'};
  box-shadow: ${props => props.$isActive ? `0 4px 12px ${props.$color}33` : '0 2px 4px rgba(0,0,0,0.05)'};
  display: flex;
  flex-direction: column;
  height: 400px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 6px 16px rgba(0,0,0,0.1);
  }
`;

const AgentCardHeader = styled.div<{ $color: string }>`
  padding: 16px;
  background: ${props => props.$color}15;
  border-bottom: 1px solid ${props => props.$color}30;
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const AgentCardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
`;

const AgentEmoji = styled.span`
  font-size: 20px;
`;

const AgentStatus = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${props => props.$color};
  font-weight: 600;
`;

const StatusDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$color};
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const AgentCardMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const MessageBubble = styled.div<{ $role: string; $color: string }>`
  padding: 10px 14px;
  border-radius: 12px;
  background: ${props => props.$role === 'user' ? '#3b82f6' : `${props.$color}10`};
  color: ${props => props.$role === 'user' ? 'white' : '#1e293b'};
  font-size: 13px;
  line-height: 1.5;
  align-self: ${props => props.$role === 'user' ? 'flex-end' : 'flex-start'};
  max-width: 85%;
  border: ${props => props.$role === 'user' ? 'none' : `1px solid ${props.$color}30`};
  white-space: pre-wrap;
`;

const MessageMeta = styled.div`
  font-size: 10px;
  color: #64748b;
  margin-top: 4px;
  display: flex;
  gap: 12px;
`;

const AgentCardInput = styled.div`
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3b82f6;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SendButton = styled.button<{ $color: string }>`
  padding: 10px 20px;
  background: ${props => props.$color};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Welcome screen (when no session)
const WelcomeContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
`;

const WelcomeCard = styled.div`
  background: white;
  padding: 48px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  max-width: 600px;
  text-align: center;
`;

const WelcomeTitle = styled.h2`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
`;

const WelcomeSubtitle = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0 0 32px 0;
  line-height: 1.6;
`;

const StartButton = styled.button`
  padding: 16px 48px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// ============================================================================
// Component
// ============================================================================

export const MultiAgentsTabRedesigned: React.FC = () => {
  const { user } = useAuth();
  const [session, setSession] = useState<MultiAgentSession | null>(null);
  const [agentCards, setAgentCards] = useState<AgentCardData[]>([]);
  const [intelligenceLogs, setIntelligenceLogs] = useState<IntelligenceLog[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8787';

  // Agent configurations
  const AGENT_CONFIGS = {
    'assessment-agent-v18': { name: 'Assessment', emoji: '📊', color: '#4F46E5' },
    'gameplan-agent-v18': { name: 'GamePlan', emoji: '🎯', color: '#059669' },
    'execution-agent-v20': { name: 'Execution', emoji: '🚀', color: '#DC2626' },
    'awards-agent-v18': { name: 'Awards', emoji: '🏆', color: '#D97706' },
    'programs-agent-v19': { name: 'Programs', emoji: '🎓', color: '#7C3AED' },
    'scholarships-agent-v21': { name: 'Scholarships', emoji: '💰', color: '#0891B2' },
  };

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [intelligenceLogs]);

  // Add intelligence log
  const addIntelligenceLog = (level: IntelligenceLog['level'], message: string, details?: any) => {
    const log: IntelligenceLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    };
    setIntelligenceLogs(prev => [...prev, log]);
  };

  // Start session
  const startSession = async () => {
    if (!user?.student_id) return;

    setIsLoading(true);
    addIntelligenceLog('system', '🔵 SESSION START REQUESTED', {
      student_id: user.student_id,
      timestamp: new Date().toISOString(),
    });

    try {
      addIntelligenceLog('system', '📡 Sending POST request to /api/v26/session/start', {
        endpoint: `${API_URL}/api/v26/session/start`,
        payload: { student_id: user.student_id, session_type: 'onboarding' },
      });

      const response = await fetch(`${API_URL}/api/v26/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'development',
        },
        body: JSON.stringify({
          student_id: user.student_id,
          session_type: 'onboarding',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        addIntelligenceLog('system', '❌ Session start failed', error);
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      addIntelligenceLog('system', '✅ Session created successfully', {
        session_id: data.session_id,
        current_agent: data.current_agent,
        current_phase: data.current_phase,
      });

      setSession({
        id: data.session_id,
        student_id: user.student_id,
        session_type: 'onboarding',
        status: data.status,
        current_phase: data.current_phase,
        current_agent: data.current_agent,
        started_at: data.started_at,
      });

      // Initialize all agent cards
      const cards: AgentCardData[] = Object.entries(AGENT_CONFIGS).map(([agent_id, config]) => ({
        agent_id,
        ...config,
        messages: agent_id === data.current_agent ? [{
          id: 'welcome',
          session_id: data.session_id,
          agent_id,
          role: 'system',
          content: data.welcome_message,
          timestamp: new Date().toISOString(),
        }] : [],
        isActive: agent_id === data.current_agent,
      }));

      setAgentCards(cards);

      addIntelligenceLog('agent', `📊 ${AGENT_CONFIGS[data.current_agent as keyof typeof AGENT_CONFIGS].name} Agent activated`, {
        agent_id: data.current_agent,
        welcome_message_length: data.welcome_message.length,
      });

      addIntelligenceLog('intelligence', '🧠 Welcome message generated using Assessment Agent intelligence', {
        framework: 'TYPE-080: Four-Phase Assessment Flow',
        phase: 'Phase 1 - Academic Foundation',
      });

    } catch (error) {
      console.error('Error starting session:', error);
      addIntelligenceLog('system', '❌ ERROR: ' + String(error));
      alert('Failed to start session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to agent
  const sendMessage = async (agentId: string) => {
    if (!session || !inputValues[agentId]?.trim()) return;

    const message = inputValues[agentId].trim();
    const agentConfig = AGENT_CONFIGS[agentId as keyof typeof AGENT_CONFIGS];

    // Add user message to card
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      session_id: session.id,
      agent_id: agentId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setAgentCards(prev => prev.map(card =>
      card.agent_id === agentId
        ? { ...card, messages: [...card.messages, userMessage] }
        : card
    ));

    setInputValues(prev => ({ ...prev, [agentId]: '' }));

    // Log user input
    addIntelligenceLog('system', `👤 User message received by ${agentConfig.name} Agent`, {
      message: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      length: message.length,
    });

    try {
      const response = await fetch(`${API_URL}/api/v26/agents/${agentId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'development',
        },
        body: JSON.stringify({
          session_id: session.id,
          student_id: session.student_id,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Log v26 context with intent classification
      if (data.v26_context) {
        addIntelligenceLog('intelligence', `🎯 Intent Classification: ${data.v26_context.intent_classification}`, {
          is_clone_student: data.v26_context.is_clone_student,
          clone_student_id: data.v26_context.clone_student_id,
          conversation_turns: data.v26_context.conversation_turns,
        });

        // Log processing steps from backend
        if (data.v26_context.processing_steps) {
          data.v26_context.processing_steps.forEach((step: string, index: number) => {
            addIntelligenceLog('agent', `📍 STEP ${index + 1}: ${step}`);
          });
        }
      }

      addIntelligenceLog('fact', '📚 Loading facts for clone student (empty for new onboarding)', {
        student_id: data.v26_context?.clone_student_id || session.student_id,
        fact_count: data.facts_used?.length || 0,
      });

      addIntelligenceLog('intelligence', `🧠 Running ${agentConfig.name} Intelligence Types`, {
        triggered: data.intelligence_triggered || [],
        triggered_count: data.intelligence_triggered?.length || 0,
        available_types: agentId === 'execution-agent-v20' ? '15 types (TYPE-049 to TYPE-063)' :
                        agentId === 'gameplan-agent-v18' ? '7 types (TYPE-001 to TYPE-007)' :
                        agentId === 'assessment-agent-v18' ? '4 types (TYPE-080 to TYPE-083)' : '3 types',
      });

      if (data.intelligence_triggered && data.intelligence_triggered.length > 0) {
        addIntelligenceLog('intelligence', `✅ Intelligence Activated: ${data.intelligence_triggered.join(', ')}`, {
          triggered_count: data.intelligence_triggered.length,
          processing_time_ms: data.processing_time,
          confidence: data.confidence,
        });
      } else {
        addIntelligenceLog('intelligence', '⚠️ No intelligence types triggered (check if agent received enough data)', {
          confidence: data.confidence,
        });
      }

      addIntelligenceLog('synthesis', '🔧 Synthesizing response from intelligence results', {
        synthesis_strategy: `${agentConfig.name} Agent`,
        intelligence_results_used: data.intelligence_triggered?.length || 0,
      });

      addIntelligenceLog('agent', '📤 Response generated and delivered', {
        response_length: data.agent_response.length,
        confidence: data.confidence,
        validation_score: data.validation_score,
      });

      // Add agent response to card
      const agentMessage: Message = {
        id: data.agent_message_id,
        session_id: session.id,
        agent_id: agentId,
        role: 'agent',
        content: data.agent_response,
        intelligence_triggered: data.intelligence_triggered,
        processing_time: data.processing_time,
        confidence: data.confidence,
        timestamp: new Date().toISOString(),
      };

      setAgentCards(prev => prev.map(card =>
        card.agent_id === agentId
          ? { ...card, messages: [...card.messages, agentMessage] }
          : card
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      addIntelligenceLog('system', '❌ ERROR processing message: ' + String(error));
      alert('Failed to send message. Please try again.');
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Render welcome screen
  if (!session) {
    return (
      <PageContainer>
        <AgentCardsContainer>
          <WelcomeContainer>
            <WelcomeCard>
              <WelcomeTitle>🤖 MultiAgents v2.0</WelcomeTitle>
              <WelcomeSubtitle>
                Experience our next-generation multi-agent coaching platform powered by 36 intelligence types.
                Watch in real-time as specialized AI agents work together to guide your college journey.
              </WelcomeSubtitle>
              <StartButton onClick={startSession} disabled={isLoading}>
                {isLoading ? 'Starting Session...' : 'Start Your Journey'}
              </StartButton>
            </WelcomeCard>
          </WelcomeContainer>
        </AgentCardsContainer>

        <IntelligencePanel>
          <IntelligencePanelHeader>
            <IntelligencePanelTitle>
              🔍 Intelligence Trace Logs
            </IntelligencePanelTitle>
          </IntelligencePanelHeader>
          <IntelligenceLogContainer>
            <LogEntry $level="system">
              <LogMessage>
                Waiting for session to start...
                <br /><br />
                This panel will show real-time intelligence processing once you begin your journey.
              </LogMessage>
            </LogEntry>
          </IntelligenceLogContainer>
        </IntelligencePanel>
      </PageContainer>
    );
  }

  // Render main interface with agent cards and intelligence panel
  return (
    <PageContainer>
      <AgentCardsContainer>
        <AgentCardsGrid>
          {agentCards.map(card => (
            <AgentCard key={card.agent_id} $color={card.color} $isActive={card.isActive}>
              <AgentCardHeader $color={card.color}>
                <AgentCardTitle>
                  <AgentEmoji>{card.emoji}</AgentEmoji>
                  {card.name} Agent
                </AgentCardTitle>
                <AgentStatus $color={card.color}>
                  {card.isActive && <StatusDot $color={card.color} />}
                  {card.isActive ? 'ACTIVE' : 'READY'}
                </AgentStatus>
              </AgentCardHeader>

              <AgentCardMessages>
                {card.messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '40px' }}>
                    {card.isActive ? 'Start chatting below...' : 'Agent will activate when needed'}
                  </div>
                ) : (
                  card.messages.map(msg => (
                    <div key={msg.id}>
                      <MessageBubble $role={msg.role} $color={card.color}>
                        {msg.content}
                      </MessageBubble>
                      {msg.processing_time && (
                        <MessageMeta>
                          <span>⏱️ {msg.processing_time}ms</span>
                          {msg.confidence && <span>✓ {(msg.confidence * 100).toFixed(0)}%</span>}
                          {msg.intelligence_triggered && (
                            <span>🧠 {msg.intelligence_triggered.length} types</span>
                          )}
                        </MessageMeta>
                      )}
                    </div>
                  ))
                )}
              </AgentCardMessages>

              {card.isActive && (
                <AgentCardInput>
                  <Input
                    type="text"
                    placeholder={`Message ${card.name} Agent...`}
                    value={inputValues[card.agent_id] || ''}
                    onChange={(e) => setInputValues(prev => ({ ...prev, [card.agent_id]: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(card.agent_id)}
                  />
                  <SendButton
                    $color={card.color}
                    onClick={() => sendMessage(card.agent_id)}
                    disabled={!inputValues[card.agent_id]?.trim()}
                  >
                    Send
                  </SendButton>
                </AgentCardInput>
              )}
            </AgentCard>
          ))}
        </AgentCardsGrid>
      </AgentCardsContainer>

      <IntelligencePanel>
        <IntelligencePanelHeader>
          <IntelligencePanelTitle>
            🔍 Intelligence Trace Logs
            <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.7, marginLeft: '8px' }}>
              ({intelligenceLogs.length} events)
            </span>
          </IntelligencePanelTitle>
        </IntelligencePanelHeader>

        <IntelligenceLogContainer>
          {intelligenceLogs.map(log => (
            <LogEntry key={log.id} $level={log.level}>
              <div>
                <LogTimestamp>{formatTimestamp(log.timestamp)}</LogTimestamp>
                <LogLevel $level={log.level}>[{log.level}]</LogLevel>
                <LogMessage>{log.message}</LogMessage>
                {log.details && (
                  <LogDetails>{JSON.stringify(log.details, null, 2)}</LogDetails>
                )}
              </div>
            </LogEntry>
          ))}
          <div ref={logsEndRef} />
        </IntelligenceLogContainer>
      </IntelligencePanel>
    </PageContainer>
  );
};
