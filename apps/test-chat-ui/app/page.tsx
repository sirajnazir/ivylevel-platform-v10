'use client';

/**
 * Unified Chat UI (v2.0)
 * Single interface for both fact-based SQL and KB-based RAG queries
 * Routes through unified /api/chat endpoint with ensemble intent classification
 */

import { useState } from 'react';

type Evidence = {
  rank: number;
  score?: number;
  namespace: string;
  chip_id: string;
  type?: string;
  week?: string;
  phase?: string;
  content?: string;
  metadata?: any;
};

type Message = {
  role: 'user' | 'assistant';
  text: string;
  evidence?: Evidence[];
  chips?: any[];
  facts?: any[];
  source?: 'sql' | 'kb' | 'hybrid';
  intent?: {
    intents: string[];
    tags: string[];
    confidence: number;
    source: string;
  };
  routing?: {
    decision: string;
    execution_mode: string;
  };
  meta?: {
    topScore?: number;
    lowConfidence?: boolean;
    evidenceCount?: number;
  };
};

const NAMESPACE_LABELS: Record<string, string> = {
  'KBv6_2025-10-06_v1.0': 'Sessions+Exec (924)',
  'KBv6_iMessage_2025-10-07_v1.0': 'iMessage (40)',
  'KBv6_Assessment_2025-10-07_v1.0': 'Assessment+GamePlan (9)'
};

export default function UnifiedChatPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('huda-2025');
  const [week, setWeek] = useState(0);
  const [showDebug, setShowDebug] = useState(true);

  async function send() {
    if (!input.trim() || loading) return;

    const userText = input;
    setHistory(h => [...h, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          student_id: studentId,
          week,
          context: {}
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      // Transform hits to evidence format
      const transformedHits = (data.hits || []).map((hit: any, idx: number) => ({
        rank: hit.rank || idx + 1,
        score: hit.score,
        namespace: hit.namespace,
        chip_id: hit.chip_id,
        type: hit.type,
        week: hit.week,
        phase: hit.phase,
        content: hit.content,
        metadata: hit.metadata
      }));

      setHistory(h => [...h, {
        role: 'assistant',
        text: data.answer,
        evidence: transformedHits,
        chips: data.chips || [],
        facts: data.facts || [],
        source: data.source,
        intent: data.intent,
        routing: data.routing,
        meta: {
          topScore: data.hits?.[0]?.score,
          evidenceCount: data.hits?.length,
          // Only show low confidence warning for KB-based queries
          lowConfidence: data.source === 'kb' && (data.hits?.[0]?.score || 0) < 0.40
        }
      }]);

    } catch (e: any) {
      setHistory(h => [...h, {
        role: 'assistant',
        text: `❌ Error: ${e.message}`
      }]);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Jenny • Unified Chat <span className="text-sm font-normal text-gray-500">(v2.0)</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            SQL Facts + KB RAG • Ensemble Intent Classification • Universal Orchestrator
          </p>
        </header>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                style={{ width: 140 }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Week</label>
              <input
                type="number"
                value={week}
                onChange={e => setWeek(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                style={{ width: 100 }}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={e => setShowDebug(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Show Debug Panels</span>
              </label>
            </div>
          </div>
        </div>

        {/* Chat History */}
        <div className="bg-white rounded-lg shadow p-6 mb-4 space-y-4 max-h-[600px] overflow-y-auto">
          {history.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Ask Jenny anything!</p>
              <p className="text-sm mt-2">
                Try: "What awards did I win?" or "Show me the 168 framework"
              </p>
            </div>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-50 ml-12'
                  : 'bg-gray-50 mr-12'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                <div>
                  {msg.role === 'user' ? 'You' : 'Jenny'}
                  {msg.meta && msg.meta.topScore !== undefined && (
                    <span className="ml-2">
                      Score: {msg.meta.topScore.toFixed(3)}
                      {msg.meta.lowConfidence && <span className="text-yellow-600 ml-1">⚠️ Low confidence</span>}
                    </span>
                  )}
                </div>
                {msg.source && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {msg.source === 'sql' ? '🗄️ SQL' : msg.source === 'kb' ? '🔍 KB' : '🔀 Hybrid'}
                  </span>
                )}
              </div>

              {/* Low confidence banner */}
              {msg.role === 'assistant' && msg.meta?.lowConfidence && (
                <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="flex items-start">
                    <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                    <div className="text-xs">
                      <div className="font-semibold text-yellow-800">Low Confidence Match</div>
                      <div className="text-yellow-700 mt-1">
                        Top score: {msg.meta.topScore?.toFixed(2) || 'N/A'} (threshold: 0.40)
                      </div>
                      <div className="text-yellow-600 mt-1">
                        The evidence may not be directly relevant. Consider refining your query.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message text */}
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Intent & Routing Debug */}
              {showDebug && msg.intent && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 bg-blue-50 p-2 rounded">
                    🧠 Intent Classification & Routing
                  </summary>
                  <div className="mt-2 p-3 bg-blue-50 rounded text-xs space-y-2">
                    <div>
                      <span className="font-semibold">Primary Intent:</span>{' '}
                      <code className="bg-white px-2 py-1 rounded">
                        {msg.intent.intents[0] || 'none'}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Confidence:</span>{' '}
                      <code className="bg-white px-2 py-1 rounded">
                        {msg.intent.confidence.toFixed(2)} ({msg.intent.source})
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Tags:</span>{' '}
                      <code className="bg-white px-2 py-1 rounded">
                        [{msg.intent.tags.join(', ')}]
                      </code>
                    </div>
                    {msg.routing && (
                      <div>
                        <span className="font-semibold">Routing:</span>{' '}
                        <code className="bg-white px-2 py-1 rounded">
                          {msg.routing.decision} → {msg.routing.execution_mode}
                        </code>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Evidence Panel (KB hits) */}
              {showDebug && msg.evidence && msg.evidence.length > 0 && (
                <details className="mt-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    📚 Evidence ({msg.evidence.length} KB hits)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {msg.evidence.map((e, j) => (
                      <div key={j} className="border border-gray-200 rounded p-3 text-xs">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-mono font-bold text-blue-600">
                              [{e.rank}] {e.chip_id}
                            </div>
                            <div className="text-gray-600 mt-1">
                              <span className="font-medium">Namespace:</span>{' '}
                              {NAMESPACE_LABELS[e.namespace] || e.namespace}
                            </div>
                            <div className="text-gray-600">
                              <span className="font-medium">Type:</span> {e.type} |{' '}
                              <span className="font-medium">Week:</span> {e.week || 'N/A'} |{' '}
                              <span className="font-medium">Phase:</span> {e.phase || 'N/A'}
                            </div>
                            <div className="text-gray-600">
                              <span className="font-medium">Score:</span> {e.score?.toFixed(4) || 'N/A'}
                            </div>
                            {e.content && (
                              <div className="mt-2 text-gray-700 bg-gray-50 p-2 rounded">
                                {e.content.substring(0, 300)}
                                {e.content.length > 300 && '…'}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(`[${e.chip_id} @ ${e.namespace}]`)}
                            className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            title="Copy citation"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Facts Panel (SQL results) */}
              {showDebug && msg.facts && msg.facts.length > 0 && (
                <details className="mt-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    🗄️ Facts ({msg.facts.length} SQL results)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {msg.facts.map((fact, j) => (
                      <div key={j} className="border border-gray-200 rounded p-3 text-xs">
                        <div className="font-mono font-bold text-green-600">
                          {fact.kind || fact.type}
                        </div>
                        <div className="text-gray-700 mt-1">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(fact, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Chips Panel */}
              {showDebug && msg.chips && msg.chips.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    🔗 Referenced Chips ({msg.chips.length})
                  </summary>
                  <div className="mt-2 text-xs">
                    <ul className="list-disc list-inside space-y-1">
                      {msg.chips.map((chip: any, j) => (
                        <li key={j} className="text-gray-600">
                          <code className="bg-gray-100 px-1 py-0.5 rounded">
                            {typeof chip === 'string' ? chip : chip.chip_id || chip.id}
                          </code>
                          {chip.score && <span className="ml-2">score: {chip.score.toFixed(3)}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>

        {/* Input Box */}
        <div className="bg-white rounded-lg shadow p-4">
          <textarea
            placeholder="Ask Jenny... (Shift+Enter for new line, Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
            rows={3}
          />
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Student: {studentId} • Week: {week}
            </div>
            <button
              onClick={send}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-4 text-xs text-center text-gray-500">
          <p>Unified Pipeline: GPT-5 Intent → Universal Orchestrator → SQL | KB | Hybrid</p>
          <p className="mt-1">3 KBv6 Namespaces (973 vectors) • PostgreSQL Facts • Ensemble Classification</p>
        </div>
      </div>
    </div>
  );
}
