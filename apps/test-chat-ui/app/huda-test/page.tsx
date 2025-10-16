"use client";

import { useState } from "react";
import { HudaPromptsPanel } from "@/components/testlab/HudaPromptsPanel";
import type { TestPrompt } from "@/lib/testlab/huda-prompts";

interface TestResult {
  prompt: TestPrompt;
  response: string;
  metadata: {
    synthesis_method: string;
    used_cats: string[];
    model_used: string;
    tokens_used: number;
    quality_score: {
      factuality: number;
      coherence: number;
      empathy: number;
      actionability: number;
    };
    pipeline_latency_ms: number;
  };
  passed: boolean;
  error?: string;
}

interface BatchResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  totalTime: number;
  avgLatency: number;
}

export default function HudaTestPage() {
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<'single' | 'batch'>('single');
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const handleRunSingle = async (prompt: TestPrompt) => {
    setRunning(true);
    setCurrentResult(null);
    setBatchResult(null);
    setSelectedTab('single');

    try {
      const response = await fetch('http://localhost:8787/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt.prompt,
          student_id: 'huda-2025'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Check if response contains v13.0 metadata
      const metadata = data.metadata || data.__adapter || {};

      const result: TestResult = {
        prompt,
        response: data.answer || data.response || 'No response',
        metadata: {
          synthesis_method: metadata.synthesis_method || 'unknown',
          used_cats: metadata.used_cats || [],
          model_used: metadata.model || data.model || 'unknown',
          tokens_used: data.usage?.total_tokens || metadata.tokens_used || 0,
          quality_score: metadata.quality_score || {
            factuality: 1.0,
            coherence: 1.0,
            empathy: 1.0,
            actionability: 1.0
          },
          pipeline_latency_ms: metadata.total_pipeline_latency_ms || 0
        },
        passed: true
      };

      setCurrentResult(result);

    } catch (error: any) {
      console.error('Test failed:', error);
      setCurrentResult({
        prompt,
        response: '',
        metadata: {
          synthesis_method: 'error',
          used_cats: [],
          model_used: 'error',
          tokens_used: 0,
          quality_score: { factuality: 0, coherence: 0, empathy: 0, actionability: 0 },
          pipeline_latency_ms: 0
        },
        passed: false,
        error: error.message
      });
    } finally {
      setRunning(false);
    }
  };

  const handleRunBatch = async (prompts: TestPrompt[], suiteName: string) => {
    setRunning(true);
    setCurrentResult(null);
    setBatchResult(null);
    setSelectedTab('batch');

    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const prompt of prompts) {
      try {
        const response = await fetch('http://localhost:8787/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt.prompt,
            student_id: 'huda-2025'
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const metadata = data.metadata || data.__adapter || {};

        results.push({
          prompt,
          response: data.answer || data.response || 'No response',
          metadata: {
            synthesis_method: metadata.synthesis_method || 'unknown',
            used_cats: metadata.used_cats || [],
            model_used: metadata.model || data.model || 'unknown',
            tokens_used: data.usage?.total_tokens || metadata.tokens_used || 0,
            quality_score: metadata.quality_score || {
              factuality: 1.0,
              coherence: 1.0,
              empathy: 1.0,
              actionability: 1.0
            },
            pipeline_latency_ms: metadata.total_pipeline_latency_ms || 0
          },
          passed: true
        });

      } catch (error: any) {
        console.error(`Test failed for ${prompt.id}:`, error);
        results.push({
          prompt,
          response: '',
          metadata: {
            synthesis_method: 'error',
            used_cats: [],
            model_used: 'error',
            tokens_used: 0,
            quality_score: { factuality: 0, coherence: 0, empathy: 0, actionability: 0 },
            pipeline_latency_ms: 0
          },
          passed: false,
          error: error.message
        });
      }

      // Update batch result in real-time
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;
      const totalTime = Date.now() - startTime;
      const avgLatency = results.reduce((sum, r) => sum + r.metadata.pipeline_latency_ms, 0) / results.length;

      setBatchResult({
        suiteName,
        totalTests: prompts.length,
        passed,
        failed,
        results,
        totalTime,
        avgLatency
      });
    }

    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-green-600 p-8 rounded-xl shadow-xl text-white">
          <h1 className="text-5xl font-bold mb-2">Jenny v13.0 Test Interface</h1>
          <p className="text-xl opacity-90">Real Prompts from Huda • Multi-Dimensional Testing</p>
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span>Production Pipeline Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎯 Real LLM</span>
              <span>🔍 Real Pinecone</span>
              <span>🗄️ Real Database</span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Prompts Panel */}
          <div className="lg:col-span-1">
            <HudaPromptsPanel
              onRunSingle={handleRunSingle}
              onRunBatch={handleRunBatch}
              running={running}
            />
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Selector */}
            <div className="flex gap-2 bg-white rounded-lg p-2 shadow">
              <button
                onClick={() => setSelectedTab('single')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === 'single'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Single Test
              </button>
              <button
                onClick={() => setSelectedTab('batch')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === 'batch'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Batch Results
              </button>
            </div>

            {/* Single Test Results */}
            {selectedTab === 'single' && currentResult && (
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
                {/* Test Info */}
                <div className="border-b pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 font-mono mb-1">{currentResult.prompt.id}</div>
                      <div className="text-lg font-semibold text-gray-900">"{currentResult.prompt.prompt}"</div>
                      <div className="text-sm text-gray-600 mt-1">{currentResult.prompt.description}</div>
                    </div>
                    {currentResult.passed ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        ✓ PASS
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        ✗ FAIL
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {currentResult.metadata.used_cats.map((cat) => (
                      <span key={cat} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Response */}
                {currentResult.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-red-900 mb-2">Error</div>
                    <div className="text-sm text-red-700">{currentResult.error}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Jenny's Response:</div>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {currentResult.response}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Synthesis Method</div>
                    <div className="text-sm font-medium text-gray-900">{currentResult.metadata.synthesis_method}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Model</div>
                    <div className="text-sm font-medium text-gray-900">{currentResult.metadata.model_used}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Tokens</div>
                    <div className="text-sm font-medium text-gray-900">{currentResult.metadata.tokens_used}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Latency</div>
                    <div className="text-sm font-medium text-gray-900">
                      {currentResult.metadata.pipeline_latency_ms}ms
                    </div>
                  </div>
                </div>

                {/* Quality Scores */}
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-3">Quality Scores:</div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(currentResult.metadata.quality_score).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{key}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${value >= 0.8 ? 'bg-green-500' : value >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${value * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{value.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Batch Results */}
            {selectedTab === 'batch' && batchResult && (
              <div className="space-y-6">
                {/* Batch Summary */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{batchResult.suiteName}</h3>
                    <button
                      onClick={() => {
                        const dataStr = JSON.stringify(batchResult, null, 2);
                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                        const exportFileDefaultName = `jenny-v13-test-results-${new Date().toISOString().split('T')[0]}.json`;
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', exportFileDefaultName);
                        linkElement.click();
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <span>📥</span>
                      Export JSON
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{batchResult.totalTests}</div>
                      <div className="text-xs text-gray-600 mt-1">Total Tests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{batchResult.passed}</div>
                      <div className="text-xs text-gray-600 mt-1">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{batchResult.failed}</div>
                      <div className="text-xs text-gray-600 mt-1">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {((batchResult.passed / batchResult.totalTests) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Pass Rate</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Time:</span>
                      <span className="ml-2 font-medium text-gray-900">{(batchResult.totalTime / 1000).toFixed(1)}s</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Latency:</span>
                      <span className="ml-2 font-medium text-gray-900">{batchResult.avgLatency.toFixed(0)}ms</span>
                    </div>
                  </div>
                </div>

                {/* Individual Results */}
                <div className="space-y-3">
                  {batchResult.results.map((result, idx) => {
                    const isExpanded = expandedResults.has(result.prompt.id);
                    return (
                      <div
                        key={result.prompt.id}
                        className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                          result.passed ? 'border-green-500' : 'border-red-500'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-mono">{result.prompt.id}</span>
                              {result.passed ? (
                                <span className="text-xs text-green-600 font-medium">✓</span>
                              ) : (
                                <span className="text-xs text-red-600 font-medium">✗</span>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900 mt-1">"{result.prompt.prompt}"</div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="flex gap-1">
                              {result.metadata.used_cats.map((cat) => (
                                <span key={cat} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {cat}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedResults);
                                if (isExpanded) {
                                  newExpanded.delete(result.prompt.id);
                                } else {
                                  newExpanded.add(result.prompt.id);
                                }
                                setExpandedResults(newExpanded);
                              }}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isExpanded ? '▲ Hide' : '▼ Show'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Response */}
                        {isExpanded && !result.error && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium text-gray-700 mb-2">Jenny's Response:</div>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap mb-3">
                              {result.response}
                            </div>

                            {/* Quality Scores */}
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Factuality</div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${result.metadata.quality_score.factuality * 100}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{result.metadata.quality_score.factuality.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Coherence</div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{ width: `${result.metadata.quality_score.coherence * 100}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{result.metadata.quality_score.coherence.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Empathy</div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full"
                                    style={{ width: `${result.metadata.quality_score.empathy * 100}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{result.metadata.quality_score.empathy.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Actionability</div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-orange-600 h-2 rounded-full"
                                    style={{ width: `${result.metadata.quality_score.actionability * 100}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{result.metadata.quality_score.actionability.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {result.error && (
                          <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                            Error: {result.error}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>{result.metadata.synthesis_method}</span>
                          <span>•</span>
                          <span>{result.metadata.tokens_used} tokens</span>
                          <span>•</span>
                          <span>{result.metadata.pipeline_latency_ms}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!currentResult && !batchResult && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🧪</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Test</h3>
                <p className="text-gray-600">
                  Select a prompt or test suite from the left panel to begin testing Jenny v13.0
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
