/**
 * AI Chat Component - Integrates with all 9 Agents
 * Automatic agent routing based on intent
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useAuth } from '../../hooks/useAuth';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #FF4A23 0%, #9333ea 100%);
  color: white;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderSubtitle = styled.p`
  margin: 8px 0 0 0;
  font-size: 14px;
  opacity: 0.9;
`;

const V152Toggle = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.$active ? '#FF4A23' : 'white'};
  border: 1px solid ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.9);
    color: #FF4A23;
  }
`;

// const AssessmentButton = styled.button` // Temporarily disabled - v15.3 routes not ready
//   padding: 8px 16px;
//   background: linear-gradient(135deg, #10b981 0%, #059669 100%);
//   color: white;
//   border: none;
//   border-radius: 6px;
//   font-size: 13px;
//   font-weight: 600;
//   cursor: pointer;
//   transition: all 0.2s;
//   margin-left: 8px;
//
//   &:hover:not(:disabled) {
//     transform: translateY(-1px);
//     box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
//   }
//
//   &:disabled {
//     opacity: 0.5;
//     cursor: not-allowed;
//   }
// `;

const QualityBadge = styled.div<{ $score: number }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${props => props.$score >= 8 ? '#10b981' : props.$score >= 7 ? '#f59e0b' : '#ef4444'};
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 6px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fafafa;
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;

  h3 {
    font-size: 24px;
    color: #333;
    margin-bottom: 16px;
  }

  p {
    font-size: 16px;
    margin-bottom: 24px;
  }

  ul {
    text-align: left;
    display: inline-block;
    list-style: none;
    padding: 0;

    li {
      padding: 8px 0;
      font-size: 14px;

      &:before {
        content: '✓ ';
        color: #FF4A23;
        font-weight: bold;
        margin-right: 8px;
      }
    }
  }
`;

const Message = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${props => props.$isUser ? '#FF4A23' : 'white'};
  color: ${props => props.$isUser ? 'white' : '#333'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const Timestamp = styled.div<{ $isUser: boolean }>`
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
  color: ${props => props.$isUser ? 'white' : '#666'};
`;

const LoadingIndicator = styled.div`
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 80px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #FF4A23;
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }
    &:nth-child(2) {
      animation-delay: -0.16s;
    }
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;

const InputContainer = styled.div`
  padding: 20px;
  background: white;
  border-top: 1px solid #e5e7eb;
`;

const ModeButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${props => props.$active ? '#FF4A23' : '#d1d5db'};
  background: ${props => props.$active ? '#FFF5F2' : 'white'};
  color: ${props => props.$active ? '#FF4A23' : '#666'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #FF4A23;
    background: #FFF5F2;
    color: #FF4A23;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InputForm = styled.form`
  display: flex;
  gap: 12px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #FF4A23;
    box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  padding: 12px 24px;
  background: #FF4A23;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #e03e1a;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const getAgentName = (agentId: string | null): string => {
  if (!agentId) return 'Jenny - AI Coach';

  const names: Record<string, string> = {
    'gameplan-agent': 'Jenny - GamePlan Coach',
    'extracurriculars-agent': 'Jenny - Activities Coach',
    'awards-agent': 'Jenny - Awards Coach',
    'summer-programs-agent': 'Jenny - Summer Programs Coach',
    'college-list-agent': 'Jenny - College List Coach',
    'essay-agent': 'Jenny - Essay Coach',
    'admissions-agent': 'Jenny - Admissions Coach',
    'weekly-execution-agent': 'Jenny - Weekly Execution Coach',
    'scholarship-agent': 'Jenny - Scholarship Coach',
  };

  return names[agentId] || 'Jenny - AI Coach';
};

type AssessmentMode = 'normal' | 'interactive' | 'simulated';

export function AIChat() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('normal');
  const [useV152, setUseV152] = useState(true); // v15.2 enabled by default
  // const [assessmentRunning, setAssessmentRunning] = useState(false); // Temporarily disabled - v15.3 routes not ready
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use actual logged-in user's student ID from backend auth
  // Backend auth (/api/auth/login) returns student_id which is mapped to user.studentId
  const studentId = user?.studentId || user?.id || 'huda-2025';

  const { messages, loading, currentAgent, sendMessage, v152Metadata } = useAgentChat({
    studentId,
    useV152,
    studentContext: {
      archetype: 'STEM_innovator',
      grade: 12,
      burnout_level: 5,
      recent_topics: [], // Will be populated dynamically after messages load
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    await sendMessage(input);
    setInput('');
  };

  const handleModeClick = async (mode: 'interactive' | 'simulated') => {
    setAssessmentMode(mode);

    // Send mode-specific request
    const message = mode === 'interactive'
      ? 'Start Interactive Assessment'
      : 'Start Simulated Assessment';

    await sendMessage(message);
  };

  // const handleV153Assessment = async () => { // Temporarily disabled - v15.3 routes not ready
  //   if (assessmentRunning) return;
  //
  //   setAssessmentRunning(true);
  //
  //   try {
  //     console.log(`[v15.3] Starting assessment for student: ${studentId}`);
  //
  //     const response = await fetch('http://localhost:3004/api/v15.3/assessment', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         student_id: studentId,
  //         assessment_trigger: 'manual',
  //       }),
  //     });
  //
  //     const result = await response.json();
  //
  //     if (result.success) {
  //       console.log(`[v15.3] ✅ Assessment complete!`, result.data);
  //       alert(`Assessment Complete!\n\nPhases: ${result.data.phase_results.length}/4\nLayers: ${result.data.total_layers_analyzed}\nDoc ID: ${result.data.assessment_doc_id}\n\nCheck console for full results.`);
  //     } else {
  //       console.error(`[v15.3] ❌ Assessment failed:`, result.error);
  //       alert(`Assessment Failed: ${result.error}`);
  //     }
  //   } catch (error) {
  //     console.error(`[v15.3] Request error:`, error);
  //     alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //   } finally {
  //     setAssessmentRunning(false);
  //   }
  // };

  return (
    <ChatContainer>
      <ChatHeader>
        <HeaderTitle>
          <span>{getAgentName(currentAgent)}</span>
          <div>
            <V152Toggle $active={useV152} onClick={() => setUseV152(!useV152)}>
              {useV152 ? '⚡ v15.2 Active' : 'v14.0 Legacy'}
            </V152Toggle>
            {/* <AssessmentButton onClick={handleV153Assessment} disabled={assessmentRunning || loading}>
              {assessmentRunning ? '🔄 Running...' : '✨ v15.3 Assessment'}
            </AssessmentButton> */}
          </div>
        </HeaderTitle>
        <HeaderSubtitle>
          {useV152 ? 'Multi-Agent with LangChain LCEL + Quality Gates' : 'Powered by Agent Framework v1.0 • 9 Specialized AI Agents'}
          {useV152 && v152Metadata.reflection_quality && (
            <QualityBadge $score={v152Metadata.reflection_quality}>
              ⭐ Quality: {v152Metadata.reflection_quality.toFixed(1)}/10
            </QualityBadge>
          )}
          {useV152 && v152Metadata.confidence && (
            <span style={{ marginLeft: '8px', opacity: 0.8 }}>
              • Confidence: {(v152Metadata.confidence * 100).toFixed(0)}%
            </span>
          )}
          {useV152 && v152Metadata.processing_time_ms && (
            <span style={{ marginLeft: '8px', opacity: 0.8 }}>
              • {(v152Metadata.processing_time_ms / 1000).toFixed(1)}s
            </span>
          )}
        </HeaderSubtitle>
      </ChatHeader>

      <MessagesContainer>
        {messages.length === 0 && (
          <WelcomeMessage>
            <h3>👋 Hi! I'm Jenny, your AI college coach</h3>
            <p>I have 9 specialized agents ready to help you. Ask me about:</p>
            <ul>
              <li>Your game plan & college strategy</li>
              <li>Extracurriculars & activities</li>
              <li>Awards & achievements</li>
              <li>Summer programs</li>
              <li>College applications</li>
              <li>Essay feedback & examples</li>
              <li>Weekly progress & tasks</li>
              <li>Scholarships & financial aid</li>
            </ul>
          </WelcomeMessage>
        )}

        {messages.map((msg, idx) => (
          <Message key={idx} $isUser={msg.role === 'user'}>
            <div>
              <MessageBubble $isUser={msg.role === 'user'}>
                {msg.content}
              </MessageBubble>
              {msg.timestamp && (
                <Timestamp $isUser={msg.role === 'user'}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Timestamp>
              )}
            </div>
          </Message>
        ))}

        {loading && (
          <Message $isUser={false}>
            <LoadingIndicator>
              <span></span>
              <span></span>
              <span></span>
            </LoadingIndicator>
          </Message>
        )}

        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        {/* Assessment Mode Buttons - Available for all students */}
        <ModeButtonsContainer>
          <ModeButton
            $active={assessmentMode === 'interactive'}
            onClick={() => handleModeClick('interactive')}
            disabled={loading}
          >
            🎯 Interactive Assessment
          </ModeButton>
          <ModeButton
            $active={assessmentMode === 'simulated'}
            onClick={() => handleModeClick('simulated')}
            disabled={loading}
          >
            ⚡ Simulated Assessment
          </ModeButton>
        </ModeButtonsContainer>

        <InputForm onSubmit={handleSubmit}>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading}
          />
          <SendButton type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </SendButton>
        </InputForm>
      </InputContainer>
    </ChatContainer>
  );
}
