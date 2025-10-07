'use client';

/**
 * KB Retrieval Test UI (v1.2)
 * Comprehensive testing interface for KBv6 federated search
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
  meta?: {
    topScore?: number;
    lowConfidence?: boolean;
    evidenceCount?: number;
    noHits?: boolean;
  };
};

const ALL_NAMESPACES = [
  'KBv6_2025-10-06_v1.0',           // Sessions+Exec
  'KBv6_iMessage_2025-10-07_v1.0',  // iMessage
  'KBv6_Assessment_2025-10-07_v1.0' // Assessment+GamePlan
];

const NAMESPACE_LABELS: Record<string, string> = {
  'KBv6_2025-10-06_v1.0': 'Sessions+Exec (924)',
  'KBv6_iMessage_2025-10-07_v1.0': 'iMessage (40)',
  'KBv6_Assessment_2025-10-07_v1.0': 'Assessment+GamePlan (9)'
};

export default function KBTestPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>(ALL_NAMESPACES);
  const [topK, setTopK] = useState(6);
  const [showDebug, setShowDebug] = useState(true);
  const [filters, setFilters] = useState<Record<string, any>>({});

  async function send() {
    if (!input.trim() || loading) return;

    const userText = input;
    setHistory(h => [...h, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/kb-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userText,
          namespaces: selectedNamespaces,
          topK,
          filters: Object.keys(filters).length > 0 ? filters : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      setHistory(h => [...h, {
        role: 'assistant',
        text: data.answer,
        evidence: data.evidence || [],
        meta: data.meta
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

  function toggleNamespace(ns: string) {
    setSelectedNamespaces(prev =>
      prev.includes(ns)
        ? prev.filter(n => n !== ns)
        : [...prev, ns]
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-lg shadow p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            KB Retrieval Test UI <span className="text-sm font-normal text-gray-500">(v1.2)</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            KBv6 Federated Search · 973 vectors · 4 families
          </p>
        </header>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Namespaces
            </label>
            <div className="space-y-2">
              {ALL_NAMESPACES.map(ns => (
                <label key={ns} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedNamespaces.includes(ns)}
                    onChange={() => toggleNamespace(ns)}
                    className="mr-2"
                  />
                  <span className="text-sm">{NAMESPACE_LABELS[ns] || ns}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top-K Results
              </label>
              <input
                type="number"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value) || 6)}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(e) => setShowDebug(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Show Debug Panel</span>
              </label>
            </div>
          </div>
        </div>

        {/* Chat History */}
        <div className="bg-white rounded-lg shadow p-6 mb-4 space-y-4 max-h-[600px] overflow-y-auto">
          {history.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Try a prompt from KB_TEST_SUITE.md</p>
              <p className="text-sm mt-2">Example: "What is the 168-hour framework?"</p>
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
              <div className="text-xs text-gray-500 mb-1">
                {msg.role === 'user' ? 'You' : 'Jenny'}
                {msg.meta && (
                  <span className="ml-2">
                    {msg.meta.noHits && <span className="text-red-600">⚠️ No hits</span>}
                    {msg.meta.lowConfidence && <span className="text-yellow-600">⚠️ Low confidence</span>}
                    {msg.meta.topScore !== undefined && (
                      <span className="ml-2">Top score: {msg.meta.topScore.toFixed(3)}</span>
                    )}
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Evidence Debug Panel */}
              {showDebug && msg.evidence && msg.evidence.length > 0 && (
                <details className="mt-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Evidence ({msg.evidence.length} hits)
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
                              <span className="font-medium">Namespace:</span> {NAMESPACE_LABELS[e.namespace] || e.namespace}
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
            </div>
          ))}

          {loading && (
            <div className="text-center text-gray-500 py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-sm mt-2">Retrieving evidence + generating answer...</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Enter your query... (Shift+Enter for new line, Enter to send)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
            rows={3}
            disabled={loading}
          />
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Selected: {selectedNamespaces.length} namespace(s) · Top-{topK} results
            </div>
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

        {/* Quick Test Prompts */}
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Quick Test Prompts (click to expand)
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              <button
                onClick={() => setInput('What is the 168-hour framework?')}
                className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded"
              >
                ✓ 168-hour framework (should find W001-FRAMEWORK-168HOUR in Sessions)
              </button>
              <button
                onClick={() => setInput('I need a thank-you note for a recommender teacher—give the template.')}
                className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded"
              >
                ✓ Thank you template (should find Message_Template_Chip in iMessage)
              </button>
              <button
                onClick={() => setInput('Run the initial assessment on a student like Huda. What are the top 3 gaps and why?')}
                className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded"
              >
                ✓ Initial assessment (should find ASSESS-INSIGHT-001 in Assessment)
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
