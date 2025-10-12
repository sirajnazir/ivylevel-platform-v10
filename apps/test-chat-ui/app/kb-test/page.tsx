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
  debug?: {
    matched_tags: string[];
    applied_priors: Record<string, any>;
    scaffold_id?: string;
    top1_score: number;
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          student_id: 'huda-2025', // Default student for testing
          week: 0,
          context: {
            namespaces: selectedNamespaces,
            topK,
            filters: Object.keys(filters).length > 0 ? filters : undefined
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      // Transform response to match UI expectations
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
        meta: {
          topScore: data.hits?.[0]?.score,
          evidenceCount: data.hits?.length,
          lowConfidence: (data.hits?.[0]?.score || 0) < 0.40,
          noHits: !data.hits?.length
        },
        debug: {
          matched_tags: data.intent?.tags || [],
          applied_priors: {},
          scaffold_id: data.routing?.execution_mode,
          top1_score: data.hits?.[0]?.score || 0
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

              {/* Confidence Banner */}
              {msg.role === 'assistant' && msg.meta?.lowConfidence && (
                <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="flex items-start">
                    <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                    <div className="text-xs">
                      <div className="font-semibold text-yellow-800">Low Confidence Match</div>
                      <div className="text-yellow-700 mt-1">Top score: {msg.meta.topScore?.toFixed(2) || 'N/A'} (threshold: 0.40)</div>
                      <div className="text-yellow-600 mt-1">The evidence may not be directly relevant. Consider refining your query.</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Scaffold Routing Debug Panel */}
              {showDebug && msg.debug && (
                <details className="mt-4 mb-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 bg-blue-50 p-2 rounded">
                    🧭 Scaffold Routing Debug
                  </summary>
                  <div className="mt-2 p-3 bg-blue-50 rounded text-xs space-y-2">
                    <div>
                      <span className="font-semibold">Matched Tags:</span>{' '}
                      {msg.debug.matched_tags.length > 0 ? (
                        <code className="bg-white px-2 py-1 rounded">
                          [{msg.debug.matched_tags.join(', ')}]
                        </code>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold">Scaffold Selected:</span>{' '}
                      <code className="bg-white px-2 py-1 rounded">
                        {msg.debug.scaffold_id || 'type_aware_fallback'}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Top-1 Score:</span>{' '}
                      <code className="bg-white px-2 py-1 rounded">
                        {msg.debug.top1_score.toFixed(4)}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Applied Priors:</span>
                      <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(msg.debug.applied_priors, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

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

        {/* Comprehensive Test Prompts */}
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Test Prompts - 28 Total (click to expand)
            </summary>
            <div className="mt-2 space-y-1 text-xs max-h-96 overflow-y-auto">
              {/* Assessment & GamePlan (A1-A4) */}
              <div className="font-semibold text-purple-700 mt-2">A) Assessment & GamePlan</div>
              <button onClick={() => setInput('Run the initial assessment on a student like Huda. What are the top 3 gaps and why?')} className="block w-full text-left px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded text-xs">A1. Initial assessment → ASSESS-INSIGHT-001</button>
              <button onClick={() => setInput('Explain the Film + CS → Digital Storyteller synthesis and how it drives school list strategy.')} className="block w-full text-left px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded text-xs">A2. Identity synthesis → ASSESS-STRATEGY-001</button>
              <button onClick={() => setInput('Show the Challenge Question pattern with one example and what it unlocked.')} className="block w-full text-left px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded text-xs">A3. Challenge Question → ASSESS-SILVER-001</button>
              <button onClick={() => setInput('What are the first-month outputs promised in the GamePlan (awards, programs, metrics)?')} className="block w-full text-left px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded text-xs">A4. GamePlan outputs → GAMEPLAN-RESULT-001</button>

              {/* Weekly Sessions (B5-B7) */}
              <div className="font-semibold text-green-700 mt-2">B) Weekly Sessions</div>
              <button onClick={() => setInput('Walk me through the Naviance scattergram tactic and how to interpret it.')} className="block w-full text-left px-2 py-1 bg-green-50 hover:bg-green-100 rounded text-xs">B5. Naviance → W005-TACTIC-001</button>
              <button onClick={() => setInput("What's the teacher gift strategy and when do we use it?")} className="block w-full text-left px-2 py-1 bg-green-50 hover:bg-green-100 rounded text-xs">B6. Teacher gifts → W030-W040 TRUST</button>
              <button onClick={() => setInput('Why did we pivot from LaunchX and what did we do instead?')} className="block w-full text-left px-2 py-1 bg-green-50 hover:bg-green-100 rounded text-xs">B7. LaunchX pivot → W001-W003 STRATEGY</button>

              {/* Execution Frameworks (C8-C10) */}
              <div className="font-semibold text-blue-700 mt-2">C) Execution Frameworks</div>
              <button onClick={() => setInput('List the canonical frameworks we use across weeks and when to deploy each.')} className="block w-full text-left px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs">C8. Canonical frameworks → W000 FRAMEWORK</button>
              <button onClick={() => setInput('Give me the EC validation proof rubric we use before promotion.')} className="block w-full text-left px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs">C9. EC validation → ECValidationProof</button>
              <button onClick={() => setInput('How do we calculate portfolio balance between academics, ECs, and outputs?')} className="block w-full text-left px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs">C10. Portfolio balance → FRAMEWORK</button>

              {/* iMessage (D11-D13) */}
              <div className="font-semibold text-indigo-700 mt-2">D) iMessage Micro-Interactions</div>
              <button onClick={() => setInput('I need a thank-you note for a recommender teacher—give the template.')} className="block w-full text-left px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded text-xs">D11. Thank you template → Message_Template_Chip</button>
              <button onClick={() => setInput('Parent is pushing back about time—how do we de-escalate in chat?')} className="block w-full text-left px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded text-xs">D12. Parent pushback → Escalation_Pattern_Chip</button>
              <button onClick={() => setInput("We're 72 hours before deadline and stuck—what's the micro-tactic?")} className="block w-full text-left px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded text-xs">D13. Deadline crunch → Micro_Tactic_Chip</button>

              {/* Cross-Namespace (E14-E16) */}
              <div className="font-semibold text-orange-700 mt-2">E) Cross-Namespace Federated</div>
              <button onClick={() => setInput('Summarize the 168-hour framework and how we adapted it in week 1.')} className="block w-full text-left px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded text-xs">E14. 168-hour → W001-FRAMEWORK-168HOUR</button>
              <button onClick={() => setInput('What proof artifacts did we require for the Small Business Stories project?')} className="block w-full text-left px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded text-xs">E15. Proof artifacts → W001 RESULT/TACTIC</button>
              <button onClick={() => setInput('What do we tell students about not rejecting yourself before applying?')} className="block w-full text-left px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded text-xs">E16. Self-rejection → TRUST/INSIGHT chips</button>

              {/* What-Ifs (F17-F18) */}
              <div className="font-semibold text-red-700 mt-2">F) What-If Prioritization</div>
              <button onClick={() => setInput('If I increase SAT from 1430→1530 and ship 2 films, what\'s the next best action?')} className="block w-full text-left px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-xs">F17. SAT + films priority → STRATEGY/INSIGHT</button>
              <button onClick={() => setInput("What's the exact acceptance rate for Stanford from her school?")} className="block w-full text-left px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-xs">F18. School stats (guardrail test)</button>

              {/* Guardrails (G19-G20) */}
              <div className="font-semibold text-gray-700 mt-2">G) Guardrails</div>
              <button onClick={() => setInput('What is quantum entanglement?')} className="block w-full text-left px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded text-xs">G19. Off-topic → Low confidence block</button>
              <button onClick={() => setInput('Help me write my Stanford essay.')} className="block w-full text-left px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded text-xs">G20. Essay writing (out of scope)</button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
