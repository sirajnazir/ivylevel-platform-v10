/**
 * v26.0 MultiAgents Tab
 *
 * Purpose: Multi-agent orchestration interface with session-based state management
 *
 * Features:
 * - Session lifecycle: Assessment → GamePlan → Execution
 * - Real-time chat with 6 specialized agents
 * - Intelligence activation traces
 * - Agent handoffs with visual animations
 *
 * Created: 2025-11-01
 * Version: v26.0
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
  intelligence_type?: string;
  processing_time?: number;
  confidence?: number;
  timestamp: string;
}

interface AgentInfo {
  name: string;
  version: string;
  color: string;
  intelligence_types: string[];
  capabilities: string[];
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  background: #f8fafc;
  padding: 24px;
  gap: 24px;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
`;

const HeaderTitle = styled.h1`
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
`;

const PhaseIndicator = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const Phase = styled.div<{ $active: boolean; $completed: boolean }>`
  flex: 1;
  padding: 12px;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.2)' : props.$completed ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.$active ? 'white' : 'transparent'};
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  opacity: ${props => props.$active ? 1 : props.$completed ? 0.7 : 0.5};
`;

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MessageBubble = styled.div<{ $role: string; $agentColor?: string }>`
  max-width: 70%;
  padding: 16px;
  border-radius: 12px;
  align-self: ${props => props.$role === 'user' ? 'flex-end' : 'flex-start'};
  background: ${props =>
    props.$role === 'user' ? '#4F46E5' :
    props.$role === 'system' ? '#f1f5f9' :
    props.$agentColor || '#10b981'};
  color: ${props => props.$role === 'system' ? '#1e293b' : 'white'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const MessageHeader = styled.div`
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const MessageContent = styled.div`
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const InputContainer = styled.div`
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const InputRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const TextInput = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  min-height: 60px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4F46E5;
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button<{ $disabled?: boolean }>`
  padding: 12px 24px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-end;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StartButton = styled.button`
  padding: 16px 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin: auto;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
  }
`;

const WelcomeCard = styled.div`
  background: white;
  padding: 48px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
  max-width: 600px;
  margin: auto;
`;

const WelcomeTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
`;

const WelcomeText = styled.p`
  margin: 0 0 32px 0;
  font-size: 16px;
  line-height: 1.6;
  color: #64748b;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ============================================================================
// Component
// ============================================================================

export const MultiAgentsTab: React.FC = () => {
  const { user } = useAuth();
  const [session, setSession] = useState<MultiAgentSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8787';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start new session
  const startSession = async () => {
    if (!user?.student_id) return;

    setIsLoading(true);
    try {
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

      const data = await response.json();

      if (response.ok) {
        setSession({
          id: data.session_id,
          student_id: user.student_id,
          session_type: 'onboarding',
          status: data.status,
          current_phase: data.current_phase,
          current_agent: data.current_agent,
          started_at: data.started_at,
        });

        // Add welcome message
        setMessages([{
          id: `welcome-${Date.now()}`,
          session_id: data.session_id,
          agent_id: 'system',
          role: 'system',
          content: data.welcome_message,
          timestamp: new Date().toISOString(),
        }]);
      } else {
        alert(`Failed to start session: ${data.message}`);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to agent
  const sendMessage = async () => {
    if (!session || !inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Add user message immediately
    const tempUserMessage: Message = {
      id: `user-${Date.now()}`,
      session_id: session.id,
      agent_id: session.current_agent,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await fetch(`${API_URL}/api/v26/agents/${session.current_agent}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'development',
        },
        body: JSON.stringify({
          session_id: session.id,
          message: userMessage,
          student_id: user?.student_id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add agent response
        const agentMessage: Message = {
          id: data.agent_message_id,
          session_id: session.id,
          agent_id: session.current_agent,
          role: 'agent',
          content: data.agent_response,
          processing_time: data.processing_time,
          confidence: data.confidence,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, agentMessage]);
      } else {
        alert(`Failed to send message: ${data.message}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key to send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get agent color based on agent ID
  const getAgentColor = (agentId: string): string => {
    if (agentId.includes('assessment')) return '#4F46E5';
    if (agentId.includes('gameplan')) return '#059669';
    if (agentId.includes('execution')) return '#DC2626';
    if (agentId.includes('awards')) return '#D97706';
    if (agentId.includes('programs')) return '#7C3AED';
    if (agentId.includes('scholarships')) return '#0891B2';
    return '#10b981';
  };

  // Render welcome screen
  if (!session) {
    return (
      <Container>
        <Header>
          <HeaderTitle>
            🤖 MultiAgents v2.0
          </HeaderTitle>
          <HeaderSubtitle>
            AI-powered coaching with 6 specialized agents using 36 intelligence types
          </HeaderSubtitle>
        </Header>

        <WelcomeCard>
          <WelcomeTitle>Welcome to MultiAgents Coaching</WelcomeTitle>
          <WelcomeText>
            Experience next-generation AI coaching powered by Jenny's proven frameworks.
            Our team of 6 specialized agents will guide you through assessment, game planning,
            and weekly execution using 36 advanced intelligence types.
            <br /><br />
            <strong>Your Journey:</strong>
            <br />1. Assessment (Phase 1-4): Comprehensive profile evaluation
            <br />2. GamePlan: Strategic roadmap creation
            <br />3. Week 1 Execution: Action planning with 168-hour framework
          </WelcomeText>
          <StartButton onClick={startSession} disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : 'Start Your Journey →'}
          </StartButton>
        </WelcomeCard>
      </Container>
    );
  }

  // Render chat interface
  return (
    <Container>
      <Header>
        <HeaderTitle>
          🤖 MultiAgents v2.0
          <span style={{ fontSize: '14px', fontWeight: 400, opacity: 0.8 }}>
            Session: {session.id.slice(0, 8)}...
          </span>
        </HeaderTitle>
        <HeaderSubtitle>
          {session.current_agent.replace('-', ' ').replace('v18', '').replace('v20', '').toUpperCase()} | {session.status.toUpperCase()}
        </HeaderSubtitle>

        <PhaseIndicator>
          <Phase $active={session.current_phase === 'assessment'} $completed={false}>
            📊 Assessment
          </Phase>
          <Phase $active={session.current_phase === 'gameplan'} $completed={false}>
            🎯 GamePlan
          </Phase>
          <Phase $active={session.current_phase === 'execution'} $completed={false}>
            🚀 Execution
          </Phase>
        </PhaseIndicator>
      </Header>

      <ChatArea>
        <MessagesContainer>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              $role={message.role}
              $agentColor={message.role === 'agent' ? getAgentColor(message.agent_id) : undefined}
            >
              <MessageHeader>
                <span>
                  {message.role === 'user' ? 'You' :
                   message.role === 'system' ? 'System' :
                   message.agent_id.replace('-agent-v18', '').replace('-agent-v20', '').toUpperCase()}
                </span>
                {message.processing_time && (
                  <span>{(message.processing_time / 1000).toFixed(2)}s</span>
                )}
              </MessageHeader>
              <MessageContent>{message.content}</MessageContent>
            </MessageBubble>
          ))}
          <div ref={messagesEndRef} />
        </MessagesContainer>

        <InputContainer>
          <InputRow>
            <TextInput
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              disabled={isSending || session.status !== 'in_progress'}
            />
            <SendButton
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isSending || session.status !== 'in_progress'}
            >
              {isSending ? <LoadingSpinner /> : 'Send'}
            </SendButton>
          </InputRow>
        </InputContainer>
      </ChatArea>
    </Container>
  );
};
