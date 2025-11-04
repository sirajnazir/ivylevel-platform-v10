'use client';

import { useState, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface HandoverPackage {
  handover_id: string;
  from_agent: string;
  to_agent: string;
  collected_facts: any;
  assessment_summary?: string;
}

export default function GamePlanTestPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [handoverPackage, setHandoverPackage] = useState<HandoverPackage | null>(null);
  const [error, setError] = useState<string>('');

  // Mock handover package - simulates what Assessment Agent would provide
  const mockHandoverPackage = {
    handover_id: `a2a_test_${Date.now()}`,
    from_agent: 'assessment-agent-v18',
    to_agent: 'gameplan-agent',
    collected_facts: {
      grade: 10,
      high_school: 'MHHS',
      target_major: 'CS, DataScience, Game Development, Interactive Media',
      interests: ['CS', 'Game Development', 'Math', 'Filming'],
      current_activities: ['Educational Game to teach AI ethics', 'Game and Video Club founder'],
      personality_type: 'shy',
      target_schools: ['Ivy+', 'Top CS programs'],
      leadership_roles: ['Founder of Game and Video Club'],
      unique_narrative: 'Self-taught game developer empowering young girls through educational games'
    },
    assessment_summary: 'Student shows strong passion for CS and game development with unique angle of empowering young girls. Has overcome barriers (shyness, lack of school resources) through self-teaching since middle school. Founded Game and Video Club. Targets top CS programs.'
  };

  const startHandoverTest = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Create session
      const sessionResponse = await fetch('http://localhost:8787/api/v26/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key'
        },
        body: JSON.stringify({
          student_id: 'huda-2025',
          session_type: 'onboarding'
        })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      setSessionId(sessionData.session_id);

      // Step 2: Simulate handover by directly calling GamePlan agent with handover package
      setHandoverPackage(mockHandoverPackage);

      setMessages([{
        role: 'system',
        content: `✅ Session created: ${sessionData.session_id}\n\n🔄 Simulating A2A Handover from Assessment Agent → GamePlan Agent\n\n📦 Handover Package:\n${JSON.stringify(mockHandoverPackage.collected_facts, null, 2)}`,
        timestamp: new Date().toISOString()
      }]);

      // Step 3: Initialize GamePlan agent with handover
      const gamePlanResponse = await fetch('http://localhost:8787/api/v26/agents/gameplan-agent/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key'
        },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          student_id: 'huda-2025',
          message: '__HANDOVER_INIT__', // Special message to trigger handover initialization
          handover_package: mockHandoverPackage
        })
      });

      if (!gamePlanResponse.ok) {
        throw new Error(`Failed to initialize GamePlan: ${gamePlanResponse.statusText}`);
      }

      const gamePlanData = await gamePlanResponse.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: gamePlanData.agent_response || gamePlanData.response,
        timestamp: new Date().toISOString(),
        metadata: gamePlanData.metadata
      }]);

    } catch (err: any) {
      setError(err.message);
      console.error('Handover test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8787/api/v26/agents/gameplan-agent/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key'
        },
        body: JSON.stringify({
          session_id: sessionId,
          student_id: 'huda-2025',
          message: inputMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.agent_response || data.response,
        timestamp: new Date().toISOString(),
        metadata: data.metadata
      }]);

    } catch (err: any) {
      setError(err.message);
      console.error('Message error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎯 GamePlan Agent Handover Test
          </h1>
          <p className="text-gray-600">
            Test A2A handover from Assessment Agent → GamePlan Agent with v29.0 HandoverValidator
          </p>

          {sessionId && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Session ID:</strong> {sessionId}
              </p>
            </div>
          )}
        </div>

        {/* Control Panel */}
        {!sessionId && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Start Handover Test
            </h2>
            <p className="text-gray-600 mb-4">
              This will create a session and simulate an A2A handover with pre-collected assessment data.
            </p>

            <div className="bg-gray-50 rounded p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Mock Assessment Data:</h3>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(mockHandoverPackage.collected_facts, null, 2)}
              </pre>
            </div>

            <button
              onClick={startHandoverTest}
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Initializing...' : '🚀 Start Handover Test'}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Handover Package Display */}
        {handoverPackage && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📦 Handover Package
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-700">From:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                  {handoverPackage.from_agent}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded">
                  {handoverPackage.to_agent}
                </span>
              </div>

              {handoverPackage.assessment_summary && (
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Summary:</strong> {handoverPackage.assessment_summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Display */}
        {messages.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              💬 Conversation
            </h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-indigo-50 ml-12'
                      : msg.role === 'system'
                      ? 'bg-gray-50'
                      : 'bg-green-50 mr-12'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">
                      {msg.role === 'user' ? '👤 You' : msg.role === 'system' ? '⚙️ System' : '🤖 GamePlan Agent'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                    {msg.content}
                  </pre>
                  {msg.metadata && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Show metadata
                      </summary>
                      <pre className="text-xs text-gray-600 mt-2 overflow-x-auto">
                        {JSON.stringify(msg.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        {sessionId && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type your message to GamePlan Agent..."
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>

            <button
              onClick={() => {
                setSessionId('');
                setMessages([]);
                setHandoverPackage(null);
                setError('');
              }}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              🔄 Reset & Start New Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
