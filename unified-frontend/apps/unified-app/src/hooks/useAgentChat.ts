/**
 * React Hook for Agent Chat
 * Manages chat state and interactions with all 9 agents
 * v15.2: Supports both v14.0 (legacy) and v15.2 (LangChain LCEL orchestration)
 */

import { useState, useCallback } from 'react';
import { agentClient, ChatMessage } from '../services/agentClient';
import { v152Client } from '../services/v152Client';

export interface UseAgentChatOptions {
  studentId: string;
  sessionId?: string;
  onError?: (error: Error) => void;
  useV152?: boolean; // Enable v15.2 Framework Integration
  studentContext?: {
    archetype: string;
    grade: number;
    burnout_level: number;
    recent_topics?: string[];
  };
}

export function useAgentChat({
  studentId,
  sessionId: initialSessionId,
  onError,
  useV152 = false,
  studentContext
}: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [v152Metadata, setV152Metadata] = useState<{
    intent?: string;
    confidence?: number;
    reflection_quality?: number;
    processing_time_ms?: number;
  }>({});

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      setLoading(true);

      // Add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        if (useV152) {
          // v15.2 Framework Integration (LangChain LCEL)
          const currentSessionId = sessionId || `v152-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          const v152Response = await v152Client.chat({
            student_id: studentId,
            session_id: currentSessionId,
            query: message,
            student_context: studentContext ? {
              student_id: studentId,
              ...studentContext
            } : {
              student_id: studentId,
              archetype: 'balanced',
              grade: 11,
              burnout_level: 5,
              recent_topics: []
            }
          });

          // Add assistant response
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: v152Response.data.response,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Update session ID if new session
          if (!sessionId) {
            setSessionId(currentSessionId);
          }

          // Track v15.2 metadata
          setV152Metadata({
            intent: v152Response.data.intent,
            confidence: v152Response.data.confidence,
            reflection_quality: v152Response.data.reflection_quality,
            processing_time_ms: v152Response.data.processing_time_ms,
          });

          setCurrentAgent(`v15.2 (Intent: ${v152Response.data.intent})`);

          return {
            answer: v152Response.data.response,
            session_id: currentSessionId,
            agent_used: `v15.2-${v152Response.data.intent}`,
          };
        } else {
          // v14.0 Legacy Multi-Agent
          const response = await agentClient.chat({
            student_id: studentId,
            message,
            session_id: sessionId,
          });

          // Add assistant response
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.answer,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Update session ID if new session
          if (!sessionId && response.session_id) {
            setSessionId(response.session_id);
          }

          // Track current agent
          setCurrentAgent(response.agent_used);

          return response;
        }
      } catch (error: any) {
        console.error('Chat error:', error);
        if (onError) {
          onError(error);
        }

        // Add error message
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [studentId, sessionId, onError, useV152, studentContext]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    setCurrentAgent(null);
  }, []);

  return {
    messages,
    sessionId,
    loading,
    currentAgent,
    sendMessage,
    clearMessages,
    v152Metadata, // v15.2 quality metrics
  };
}
