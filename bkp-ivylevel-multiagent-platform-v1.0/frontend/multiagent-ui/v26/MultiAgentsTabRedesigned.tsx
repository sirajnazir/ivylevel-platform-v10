/**
 * v35.0 MultiAgents Tab - ResponseBubbles Integration
 *
 * Features:
 * - 2-column responsive card layout (2 cards per row on desktop, 1 on mobile)
 * - Real-time intelligence logging panel showing behind-the-scenes processing
 * - Detailed flow tracing aligned with MULTIAGENT_INTELLIGENCE_FLOW_MASTER_SPEC
 * - v31.4: LangGraph orchestration with state management & memory persistence
 * - v35.0: Integrated ResponseBubbles for faster student interaction (60min → 15-20min)
 *
 * Created: 2025-11-01
 * Updated: 2025-11-06 (v35.0 ResponseBubbles integration)
 * Version: v35.0
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../hooks/useAuth';
import { ResponseBubbles } from './ResponseBubbles';

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
  suggested_responses?: string[]; // v29.5: Quick reply bubbles
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
  status: 'ready' | 'active' | 'handed_off' | 'delegating';  // v30.1.2: Added delegating status
  handoverInfo?: {  // v28.0: Store handover metadata
    handedTo: string;
    handoverId: string;
    timestamp: Date;
  };
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

const AgentCard = styled.div<{ $color: string; $isActive: boolean; $status: 'ready' | 'active' | 'handed_off' | 'delegating' }>`
  background: ${props => props.$status === 'handed_off' ? '#fafafa' : 'white'};
  border-radius: 12px;
  border: ${props => {
    if (props.$status === 'handed_off') return '1px dashed #cbd5e1';
    return props.$isActive ? `2px solid ${props.$color}` : '2px solid #e2e8f0';
  }};
  box-shadow: ${props => {
    if (props.$status === 'handed_off') return '0 2px 4px rgba(0,0,0,0.03)';
    return props.$isActive ? `0 4px 12px ${props.$color}33` : '0 2px 4px rgba(0,0,0,0.05)';
  }};
  opacity: ${props => props.$status === 'handed_off' ? 0.6 : 1};
  display: flex;
  flex-direction: column;
  height: 400px;
  transition: all 0.3s ease;

  /* v30.1.2: Greyscale filter for inactive agents */
  filter: ${props => {
    if (props.$status === 'handed_off') return 'grayscale(80%)';
    if (props.$status === 'ready' && !props.$isActive) return 'grayscale(60%)';
    return 'none';
  }};

  /* v30.1.2: Transform for active agents */
  transform: ${props => props.$isActive ? 'scale(1.02)' : 'scale(1)'};

  &:hover {
    box-shadow: ${props => props.$status === 'handed_off' ? '0 2px 4px rgba(0,0,0,0.03)' : '0 6px 16px rgba(0,0,0,0.1)'};
    /* Remove greyscale on hover for better interaction feedback */
    filter: ${props => props.$status === 'handed_off' ? 'grayscale(60%)' : 'none'};
  }

  /* v28.0: Transition animation when handover occurs */
  &.agent-card-transition {
    animation: agentTransition 2s ease;
  }

  /* v30.1.2: Delegation animation (pulsing effect) */
  &.agent-card-delegating {
    animation: agentDelegating 1.5s ease-in-out infinite;
  }

  @keyframes agentTransition {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); box-shadow: 0 8px 16px rgba(76, 175, 80, 0.4); }
    100% { transform: scale(1.02); }
  }

  @keyframes agentDelegating {
    0%, 100% {
      border-color: ${props => props.$color};
      box-shadow: 0 4px 12px ${props => props.$color}33;
    }
    50% {
      border-color: #fbbf24;
      box-shadow: 0 4px 16px rgba(251, 191, 36, 0.5);
    }
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

const AgentStatus = styled.div<{ $color: string; $status?: 'ready' | 'active' | 'handed_off' | 'delegating' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${props => {
    if (props.$status === 'handed_off') return '#666';
    if (props.$status === 'delegating') return '#f59e0b';  // v30.1.2: Orange for delegating
    return props.$color;
  }};
  font-weight: 600;
  background: ${props => {
    if (props.$status === 'handed_off') return '#e0e0e0';
    if (props.$status === 'delegating') return '#fef3c7';  // v30.1.2: Yellow background for delegating
    return 'transparent';
  }};
  padding: ${props => (props.$status === 'handed_off' || props.$status === 'delegating') ? '4px 8px' : '0'};
  border-radius: 4px;
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

// v28.0: Handover indicator
const HandoverIndicator = styled.div`
  margin: 12px 16px;
  padding: 10px 12px;
  background: #fff3cd;
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  font-size: 12px;
  color: #856404;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HandoverIcon = styled.span`
  font-size: 16px;
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

// v35.0: Version Banner
const VersionBanner = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 24px;
  text-align: center;
  font-weight: 700;
  font-size: 15px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.2);
  letter-spacing: 0.3px;

  span {
    display: inline-block;
    margin-right: 8px;
    font-size: 18px;
  }
`;

// v29.5: Quick Reply Bubbles Styles
const QuickRepliesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const QuickReplyBubble = styled.button`
  padding: 10px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 2px solid #cbd5e1;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    border-color: #4F46E5;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  &:active {
    transform: translateY(0px);
  }
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

// v34.1: Delegation UI Components
const DelegationContainer = styled.div`
  margin: 16px 0;
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #fbbf24;
  border-radius: 12px;
  animation: pulseGlow 2s ease-in-out infinite;

  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
    50% { box-shadow: 0 0 20px 5px rgba(251, 191, 36, 0.6); }
  }
`;

const DelegationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const DelegationIcon = styled.div`
  font-size: 24px;
  animation: rotate 3s linear infinite;

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const DelegationTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #92400e;
`;

const DelegationBadge = styled.span`
  margin-left: auto;
  padding: 4px 12px;
  background: #fbbf24;
  color: #78350f;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SpecialistCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
`;

const SpecialistCard = styled.div<{ $hasError?: boolean }>`
  background: white;
  padding: 14px;
  border-radius: 10px;
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#22c55e'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  animation: slideInUp 0.5s ease-out;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SpecialistHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const SpecialistName = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SpecialistBadge = styled.span<{ $type: 'success' | 'error' }>`
  padding: 3px 8px;
  background: ${props => props.$type === 'success' ? '#22c55e' : '#ef4444'};
  color: white;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
`;

const SpecialistResponse = styled.div`
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
`;

const IntelligenceBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
`;

const IntelligenceBadge = styled.span`
  padding: 4px 8px;
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  color: white;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
`;

const DelegationSummary = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  font-size: 13px;
  color: #78350f;
  display: flex;
  align-items: center;
  gap: 8px;
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

  // v35.0: Response bubbles state
  const [showBubbles, setShowBubbles] = useState<Record<string, boolean>>({});
  const [lastMessageWithBubbles, setLastMessageWithBubbles] = useState<Record<string, string | null>>({});

  // Use relative URLs - Vite proxy will forward /api/v26 to agent-framework backend
  const API_URL = '';

  // v36.2: Component load confirmation
  console.log('[v36.2 CONVERSATION INTELLIGENCE] MultiAgentsTabRedesigned component loaded! 🧠 Infinite loop prevention enabled');

  // Agent configurations
  const AGENT_CONFIGS = {
    'assessment-agent-v18': { name: 'Assessment', emoji: '📊', color: '#4F46E5' },
    'gameplan-agent-v18': { name: 'GamePlan', emoji: '🎯', color: '#059669' },
    'execution-agent-v20': { name: 'Execution', emoji: '🚀', color: '#DC2626' },
    'awards-agent-v18': { name: 'Awards', emoji: '🏆', color: '#D97706' },
    'extracurriculars-agent-v18': { name: 'Extracurriculars', emoji: '🎭', color: '#7C3AED' }, // v30.2: Renamed from Programs
    'scholarships-agent-v21': { name: 'Scholarships', emoji: '💰', color: '#0891B2' },
  };

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [intelligenceLogs]);

  // v35.0: Show bubbles when agent sends message with suggestions
  useEffect(() => {
    agentCards.forEach((card) => {
      if (card.messages.length > 0) {
        const lastMessage = card.messages[card.messages.length - 1];
        if (
          lastMessage.role === 'agent' &&
          lastMessage.suggested_responses &&
          lastMessage.suggested_responses.length > 0
        ) {
          setShowBubbles(prev => ({ ...prev, [card.agent_id]: true }));
          setLastMessageWithBubbles(prev => ({ ...prev, [card.agent_id]: lastMessage.id }));
        }
      }
    });
  }, [agentCards]);

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
      real_student_id: user.student_id,
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

      // Log v26 context with clone student mapping
      if (data.v26_context) {
        addIntelligenceLog('system', '🔀 V26 Student Mapping Applied', {
          real_student_id: data.v26_context.real_student_id,
          clone_student_id: data.v26_context.clone_student_id,
          is_clone_student: data.v26_context.is_clone_student,
        });
      }

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
        status: agent_id === data.current_agent ? 'active' : 'ready',  // v28.0: Initial status
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

  /**
   * v35.0: Handle click on response bubble
   */
  const handleBubbleClick = (agentId: string, response: string) => {
    // Set the response in the input field
    setInputValues(prev => ({ ...prev, [agentId]: response }));
    // Hide bubbles immediately
    setShowBubbles(prev => ({ ...prev, [agentId]: false }));
    // Send the message
    sendMessage(agentId);
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
      // Capture current agent state BEFORE processing for comparison
      const currentCard = agentCards.find(c => c.agent_id === agentId);
      const previousDataFieldsCount = currentCard?.messages
        .slice()
        .reverse()
        .find(m => m.role === 'agent' && (m as any).metadata?.data_collected_so_far)?.
        metadata?.data_collected_so_far ?
        Object.keys((currentCard.messages.slice().reverse().find(m => m.role === 'agent' && (m as any).metadata?.data_collected_so_far) as any).metadata.data_collected_so_far)
          .filter(k => !['item_id', 'item_type', 'subtype', 'title', 'state', 'substate', 'status'].includes(k)).length : 0;

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

      // Log collected data from metadata (not facts_used which is for intelligence processing)
      const currentDataFieldsCount = data.metadata?.data_collected_so_far ?
        Object.keys(data.metadata.data_collected_so_far).filter(k => !['item_id', 'item_type', 'subtype', 'title', 'state', 'substate', 'status'].includes(k)).length :
        0;

      const newFieldsExtracted = currentDataFieldsCount - previousDataFieldsCount;
      const isFirstMessage = previousDataFieldsCount === 0 && currentDataFieldsCount > 0;

      // Log with clear BEFORE → AFTER semantics
      if (isFirstMessage) {
        addIntelligenceLog('fact', '📚 Facts collected from conversation', {
          clone_student_id: data.v26_context?.clone_student_id || session.student_id,
          total_fields_collected: currentDataFieldsCount,
          collected_data: data.metadata.data_collected_so_far,
          extraction_status: 'First data extracted'
        });
      } else if (newFieldsExtracted > 0) {
        addIntelligenceLog('fact', '📚 Facts updated - New data extracted', {
          clone_student_id: data.v26_context?.clone_student_id || session.student_id,
          previous_fields: previousDataFieldsCount,
          current_fields: currentDataFieldsCount,
          new_fields_added: newFieldsExtracted,
          collected_data: data.metadata.data_collected_so_far,
          extraction_status: `+${newFieldsExtracted} new field(s)`
        });
      } else if (currentDataFieldsCount > 0) {
        addIntelligenceLog('fact', '📚 Facts loaded - No new data this message', {
          clone_student_id: data.v26_context?.clone_student_id || session.student_id,
          total_fields: currentDataFieldsCount,
          collected_data: data.metadata.data_collected_so_far,
          extraction_status: 'Existing data maintained'
        });
      } else {
        addIntelligenceLog('fact', '📚 No facts collected yet', {
          clone_student_id: data.v26_context?.clone_student_id || session.student_id,
          total_fields: 0,
          collected_data: 'Empty (new onboarding)',
          extraction_status: 'Awaiting student data'
        });
      }

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

      // v31.1: Display LangGraph collaboration events
      if (data.metadata?.collaboration_events) {
        data.metadata.collaboration_events.forEach((event: any) => {
          addIntelligenceLog('system', event.message, {
            event_type: event.event,
            timestamp: event.timestamp,
            ...event.details
          });
        });
      }

      // v31.1: Display orchestration info
      if (data.metadata?.orchestration === 'langgraph' || data.metadata?.orchestration === 'langgraph_collaboration') {
        addIntelligenceLog('system', '🔀 LangGraph Orchestration Active', {
          version: data.metadata.version,
          mode: data.metadata.collaboration_mode || 'simple_routing',
          agents_executed: data.metadata.agents_executed,
          workflow_step: data.metadata.workflow_step
        });
      }

      // v30.1.5: Determine which agent card should receive the message
      // If handover occurred, message goes to NEW agent, not original agent
      const messageTargetAgent = data.a2a_handover?.handover_complete
        ? data.a2a_handover.to_agent
        : agentId;

      // Add agent response to card
      const agentMessage: Message = {
        id: data.agent_message_id,
        session_id: session.id,
        agent_id: messageTargetAgent, // v30.1.5: Use target agent ID
        role: 'agent',
        content: data.agent_response,
        intelligence_triggered: data.intelligence_triggered,
        processing_time: data.processing_time,
        confidence: data.confidence,
        timestamp: new Date().toISOString(),
        suggested_responses: data.metadata?.suggested_responses, // v29.5: Quick reply bubbles
      };

      setAgentCards(prev => prev.map(card =>
        card.agent_id === messageTargetAgent // v30.1.5: Add to target agent's card
          ? { ...card, messages: [...card.messages, agentMessage] }
          : card
      ));

      // v30.2: Check for delegation (GamePlan → Specialists)
      if (data.metadata?.delegation_started && data.metadata?.delegated_to) {
        console.log('[FRONTEND_DELEGATION] 🔀 Delegation detected!', {
          from: agentId,
          delegated_to: data.metadata.delegated_to,
        });

        addIntelligenceLog('system', '🔀 Agent Delegation Started', {
          delegating_agent: agentId,
          specialist_agents: data.metadata.delegated_to,
        });

        // Mark delegating agent as "delegating" status
        setAgentCards(prev => prev.map(card => {
          if (card.agent_id === agentId) {
            return { ...card, status: 'delegating', isActive: false };
          }
          // Mark specialist agents as active
          if (data.metadata.delegated_to.includes(card.agent_id)) {
            return { ...card, status: 'active', isActive: true };
          }
          return card;
        }));
      }

      // v34.1: Check for delegation complete with specialist findings
      if (data.metadata?.delegation_complete && data.metadata?.specialist_findings) {
        console.log('[FRONTEND_DELEGATION] ✅ Delegation complete with findings!', {
          agent: agentId,
          specialists: Object.keys(data.metadata.specialist_findings),
          findings_count: Object.keys(data.metadata.specialist_findings).length
        });

        addIntelligenceLog('synthesis', '🎯 Specialist Findings Synthesized', {
          synthesizing_agent: agentId,
          specialists_consulted: Object.keys(data.metadata.specialist_findings),
          findings_count: Object.keys(data.metadata.specialist_findings).length
        });

        // Mark all specialist agents as ready
        setAgentCards(prev => prev.map(card => {
          // Specialists back to ready state
          if (Object.keys(data.metadata.specialist_findings).includes(card.agent_id)) {
            return { ...card, status: 'ready', isActive: false };
          }
          // Delegating agent stays active to show synthesis
          if (card.agent_id === agentId) {
            return { ...card, status: 'active', isActive: true };
          }
          return card;
        }));
      }

      // v28.0: Check for A2A handover
      if (data.a2a_handover && data.a2a_handover.handover_complete) {
        console.log('[FRONTEND_A2A] 🔄 Handover detected!', {
          from: data.a2a_handover.from_agent,
          to: data.a2a_handover.to_agent,
          handover_id: data.a2a_handover.handover_id
        });

        // Log handover event
        addIntelligenceLog('system', '🔄 A2A Agent Handover', {
          from_agent: data.a2a_handover.from_agent,
          to_agent: data.a2a_handover.to_agent,
          handover_id: data.a2a_handover.handover_id,
          new_phase: data.a2a_handover.new_phase
        });

        // Update agent cards: mark old agent as handed_off, new agent as active
        setAgentCards(prev => prev.map(card => {
          // Mark previous agent as handed off
          if (card.agent_id === data.a2a_handover.from_agent) {
            return {
              ...card,
              isActive: false,
              status: 'handed_off',
              handoverInfo: {
                handedTo: data.a2a_handover.to_agent,
                handoverId: data.a2a_handover.handover_id,
                timestamp: new Date()
              }
            };
          }

          // Mark new agent as active
          if (card.agent_id === data.a2a_handover.to_agent) {
            return {
              ...card,
              isActive: true,
              status: 'active'
            };
          }

          return card;
        }));

        // Trigger transition animation on new active agent
        setTimeout(() => {
          const newAgentCard = document.querySelector(`[data-agent-id="${data.a2a_handover.to_agent}"]`);
          if (newAgentCard) {
            newAgentCard.classList.add('agent-card-transition');
            newAgentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            setTimeout(() => {
              newAgentCard.classList.remove('agent-card-transition');
            }, 2000);
          }
        }, 100);
      }

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
      <VersionBanner>
        <span>🧠</span>
        v36.2 - Universal Conversation Intelligence (PREVENTS INFINITE LOOPS!)
      </VersionBanner>

      <AgentCardsContainer>
        <AgentCardsGrid>
          {agentCards.map(card => (
            <AgentCard
              key={card.agent_id}
              $color={card.color}
              $isActive={card.isActive}
              $status={card.status}
              data-agent-id={card.agent_id}
            >
              <AgentCardHeader $color={card.color}>
                <AgentCardTitle>
                  <AgentEmoji>{card.emoji}</AgentEmoji>
                  {card.name} Agent
                </AgentCardTitle>
                <AgentStatus $color={card.color} $status={card.status}>
                  {(card.status === 'active' || card.status === 'delegating') && <StatusDot $color={card.status === 'delegating' ? '#f59e0b' : card.color} />}
                  {card.status === 'active' ? 'ACTIVE' :
                   card.status === 'delegating' ? 'DELEGATING' :
                   card.status === 'handed_off' ? 'HANDED OFF' : 'READY'}
                </AgentStatus>
              </AgentCardHeader>

              {/* v28.0: Show handover indicator if handed off */}
              {card.status === 'handed_off' && card.handoverInfo && (
                <HandoverIndicator>
                  <HandoverIcon>↓</HandoverIcon>
                  <span>Handed over to {AGENT_CONFIGS[card.handoverInfo.handedTo as keyof typeof AGENT_CONFIGS]?.name || 'next'} Agent</span>
                </HandoverIndicator>
              )}

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

                      {/* v35.0: Response Bubbles with improved UX */}
                      {msg.role === 'agent' &&
                       msg.suggested_responses &&
                       msg.suggested_responses.length > 0 &&
                       msg.id === lastMessageWithBubbles[card.agent_id] && (
                        <ResponseBubbles
                          suggestions={msg.suggested_responses}
                          onBubbleClick={(response) => handleBubbleClick(card.agent_id, response)}
                          isVisible={showBubbles[card.agent_id] || false}
                          messageId={msg.id}
                        />
                      )}

                      {/* v34.1: Delegation Findings Visualization */}
                      {msg.role === 'agent' && msg.metadata?.delegation_complete && msg.metadata?.specialist_findings && (
                        <DelegationContainer>
                          <DelegationHeader>
                            <DelegationIcon>🎯</DelegationIcon>
                            <DelegationTitle>Specialist Consultation Results</DelegationTitle>
                            <DelegationBadge>
                              {Object.keys(msg.metadata.specialist_findings).length} Specialists
                            </DelegationBadge>
                          </DelegationHeader>

                          <SpecialistCardsGrid>
                            {Object.entries(msg.metadata.specialist_findings).map(([agentId, finding]: [string, any]) => (
                              <SpecialistCard key={agentId} $hasError={!!finding.error}>
                                <SpecialistHeader>
                                  <SpecialistName>
                                    {agentId === 'awards-agent-v18' && '🏆 Awards'}
                                    {agentId === 'extracurriculars-agent-v18' && '🎭 Activities'}
                                    {agentId === 'summer-programs-agent-v18' && '☀️ Programs'}
                                    {agentId === 'scholarships-agent' && '💰 Scholarships'}
                                  </SpecialistName>
                                  <SpecialistBadge $type={finding.error ? 'error' : 'success'}>
                                    {finding.error ? 'Error' : 'Success'}
                                  </SpecialistBadge>
                                </SpecialistHeader>

                                {finding.error ? (
                                  <SpecialistResponse style={{ color: '#ef4444' }}>
                                    ❌ {finding.error}
                                  </SpecialistResponse>
                                ) : (
                                  <>
                                    <SpecialistResponse>
                                      {finding.response || 'No response'}
                                    </SpecialistResponse>
                                    {finding.intelligence_triggered && finding.intelligence_triggered.length > 0 && (
                                      <IntelligenceBadges>
                                        {finding.intelligence_triggered.map((intel: string, idx: number) => (
                                          <IntelligenceBadge key={idx}>{intel}</IntelligenceBadge>
                                        ))}
                                      </IntelligenceBadges>
                                    )}
                                  </>
                                )}
                              </SpecialistCard>
                            ))}
                          </SpecialistCardsGrid>

                          <DelegationSummary>
                            <span>✨</span>
                            <span>
                              <strong>{card.name}</strong> synthesized insights from{' '}
                              {Object.keys(msg.metadata.specialist_findings).length} specialist{Object.keys(msg.metadata.specialist_findings).length > 1 ? 's' : ''}{' '}
                              to create your personalized plan
                            </span>
                          </DelegationSummary>
                        </DelegationContainer>
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
                    onChange={(e) => {
                      setInputValues(prev => ({ ...prev, [card.agent_id]: e.target.value }));
                      // v35.0: Hide bubbles when user starts typing
                      if (e.target.value.length > 0 && showBubbles[card.agent_id]) {
                        setShowBubbles(prev => ({ ...prev, [card.agent_id]: false }));
                      }
                    }}
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
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#8b5cf6',
              marginLeft: '12px',
              padding: '2px 8px',
              background: '#ede9fe',
              borderRadius: '4px'
            }}>
              v36.2 Conversation Intelligence
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
