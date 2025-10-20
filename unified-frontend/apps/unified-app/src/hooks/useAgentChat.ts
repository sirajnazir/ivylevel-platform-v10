/**
 * React Hook for Agent Chat
 * Manages chat state and interactions with all 9 agents
 */

import { useState, useCallback } from 'react';
import { agentClient, ChatMessage } from '../services/agentClient';

export interface UseAgentChatOptions {
  studentId: string;
  sessionId?: string;
  onError?: (error: Error) => void;
}

export function useAgentChat({ studentId, sessionId: initialSessionId, onError }: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);

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
    [studentId, sessionId, onError]
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
  };
}
