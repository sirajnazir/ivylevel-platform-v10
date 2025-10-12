'use client';

/**
 * Comprehensive Test Suite UI
 * 73 battle-tested prompts with manual buttons and automated sequential testing
 */

import { useState, useRef, useEffect } from 'react';
import { TEST_PROMPTS, TEST_CATEGORIES, type TestPrompt } from '@/lib/testPrompts';

type TestResult = {
  prompt: TestPrompt;
  response: any;
  timestamp: string;
  duration: number;
  passed?: boolean;
  notes?: string;
};

export default function TestSuitePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [studentId, setStudentId] = useState('huda-2025');
  const [week, setWeek] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRunProgress, setAutoRunProgress] = useState(0);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  const filteredPrompts = selectedCategory === 'all'
    ? TEST_PROMPTS
    : TEST_PROMPTS.filter(p => p.category === selectedCategory);

  // Auto-scroll to bottom when new results arrive
  useEffect(() => {
    if (autoRunning && resultsEndRef.current) {
      resultsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [testResults.size, autoRunning]);

  async function runTest(prompt: TestPrompt) {
    setCurrentTest(prompt.id);
    setLoading(true);

    const startTime = Date.now();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt.prompt,
          student_id: studentId,
          week,
          context: {}
        })
      });

      const data = await res.json();
      const duration = Date.now() - startTime;

      // Evaluate pass/fail based on criteria
      const passed = evaluateResult(prompt, data);

      const result: TestResult = {
        prompt,
        response: data,
        timestamp: new Date().toISOString(),
        duration,
        passed,
        notes: generateNotes(prompt, data)
      };

      setTestResults(prev => new Map(prev).set(prompt.id, result));

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        prompt,
        response: { error: error.message },
        timestamp: new Date().toISOString(),
        duration,
        passed: false,
        notes: `Error: ${error.message}`
      };

      setTestResults(prev => new Map(prev).set(prompt.id, result));
      return result;
    } finally {
      setLoading(false);
      setCurrentTest(null);
    }
  }

  function evaluateResult(prompt: TestPrompt, response: any): boolean {
    // Check if response matches expected route
    const actualRoute = response.source;
    const routeMatches = actualRoute === prompt.expectedRoute;

    // Check if intent matches (approximate - check if it contains expected)
    const intentMatches = response.intent?.intents?.[0]?.includes(prompt.expectedIntent.split('.')[0]) ?? false;

    // Check for required citations if KB query
    let citationsPresent = true;
    if (prompt.mustCite && prompt.mustCite.length > 0) {
      const answerText = response.answer || '';
      const chipIds = response.chips?.map((c: any) => c.chip_id || c.id || c.text).join(' ') || '';
      const allText = answerText + ' ' + chipIds;

      citationsPresent = prompt.mustCite.some(cite =>
        allText.includes(cite) || response.hits?.some((h: any) => h.chip_id?.includes(cite))
      );
    }

    // Check for low confidence issues
    const hasLowConfidence = response.meta?.lowConfidence ?? false;

    return routeMatches && (!hasLowConfidence || prompt.expectedRoute !== 'sql');
  }

  function generateNotes(prompt: TestPrompt, response: any): string {
    const notes: string[] = [];

    const actualRoute = response.source;
    if (actualRoute !== prompt.expectedRoute) {
      notes.push(`Route mismatch: expected ${prompt.expectedRoute}, got ${actualRoute}`);
    }

    const actualIntent = response.intent?.intents?.[0] || 'unknown';
    if (!actualIntent.includes(prompt.expectedIntent.split('.')[0])) {
      notes.push(`Intent mismatch: expected ${prompt.expectedIntent}, got ${actualIntent}`);
    }

    if (prompt.mustCite && prompt.mustCite.length > 0) {
      const missingCites = prompt.mustCite.filter(cite => {
        const answerText = response.answer || '';
        const chipIds = response.chips?.map((c: any) => c.chip_id || c.id || c.text).join(' ') || '';
        const allText = answerText + ' ' + chipIds;
        return !allText.includes(cite) && !response.hits?.some((h: any) => h.chip_id?.includes(cite));
      });

      if (missingCites.length > 0) {
        notes.push(`Missing citations: ${missingCites.join(', ')}`);
      }
    }

    if (response.meta?.lowConfidence && prompt.expectedRoute === 'sql') {
      notes.push('Unexpected low confidence warning on SQL query');
    }

    const hitCount = response.hits?.length || response.facts?.length || 0;
    notes.push(`${hitCount} results returned`);

    if (notes.length === 1) {
      return '✅ All checks passed';
    }

    return notes.join(' | ');
  }

  async function runAllTests() {
    setAutoRunning(true);
    setAutoRunProgress(0);
    setTestResults(new Map());

    const promptsToRun = filteredPrompts;

    for (let i = 0; i < promptsToRun.length; i++) {
      await runTest(promptsToRun[i]);
      setAutoRunProgress(((i + 1) / promptsToRun.length) * 100);

      // Small delay between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setAutoRunning(false);

    // Generate summary report
    downloadReport();
  }

  function downloadReport() {
    const results = Array.from(testResults.values());
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    const report = {
      timestamp: new Date().toISOString(),
      student_id: studentId,
      week,
      summary: {
        total,
        passed,
        failed: total - passed,
        passRate: ((passed / total) * 100).toFixed(1) + '%'
      },
      results: results.map(r => ({
        id: r.prompt.id,
        category: r.prompt.category,
        prompt: r.prompt.prompt,
        expectedRoute: r.prompt.expectedRoute,
        expectedIntent: r.prompt.expectedIntent,
        actualRoute: r.response.source,
        actualIntent: r.response.intent?.intents?.[0],
        passed: r.passed,
        duration: r.duration,
        notes: r.notes,
        confidence: r.response.intent?.confidence,
        hitCount: r.response.hits?.length || r.response.facts?.length || 0,
        topScore: r.response.hits?.[0]?.score,
        chips: r.response.chips?.map((c: any) => c.chip_id || c.id || c.text),
        trace: {
          routing: r.response.routing,
          intent: r.response.intent,
          factsTrace: r.response.factsTrace,
          retrievalTrace: r.response.retrievalTrace
        }
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  function clearResults() {
    setTestResults(new Map());
    setAutoRunProgress(0);
  }

  function toggleExpandResult(id: string) {
    setExpandedResult(expandedResult === id ? null : id);
  }

  const passedCount = Array.from(testResults.values()).filter(r => r.passed).length;
  const totalRun = testResults.size;
  const passRate = totalRun > 0 ? ((passedCount / totalRun) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Test Suite <span className="text-sm font-normal text-gray-500">(73 Battle-Tested Prompts)</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            SQL • KB • Hybrid • Clarifiers • Safety • Edge Cases
          </p>
        </header>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category Filter</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories ({TEST_PROMPTS.length})</option>
                {TEST_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat} ({TEST_PROMPTS.filter(p => p.category === cat).length})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Week</label>
              <input
                type="number"
                value={week}
                onChange={e => setWeek(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={runAllTests}
                disabled={autoRunning || loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {autoRunning ? `Running... ${Math.round(autoRunProgress)}%` : `Run All (${filteredPrompts.length})`}
              </button>
              <button
                onClick={clearResults}
                disabled={autoRunning}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {autoRunning && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${autoRunProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {totalRun > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-2xl font-bold text-blue-600">{totalRun}</div>
                <div className="text-xs text-gray-600">Total Run</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                <div className="text-xs text-gray-600">Passed</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-2xl font-bold text-red-600">{totalRun - passedCount}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-2xl font-bold text-purple-600">{passRate}%</div>
                <div className="text-xs text-gray-600">Pass Rate</div>
              </div>
            </div>
          )}
        </div>

        {/* Test Prompts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Left: Prompt Buttons */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Test Prompts</h2>
            <div className="max-h-[600px] overflow-y-auto space-y-2">
              {filteredPrompts.map(prompt => {
                const result = testResults.get(prompt.id);
                const isRunning = currentTest === prompt.id;

                return (
                  <div key={prompt.id} className="border rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{prompt.id}</span>
                          {result && (
                            <span className={`text-xs px-2 py-1 rounded ${result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {result.passed ? '✅ Pass' : '❌ Fail'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{prompt.category}</div>
                        <div className="text-sm mt-1 font-medium">{prompt.prompt}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Expected: {prompt.expectedRoute} • {prompt.expectedIntent}
                        </div>
                      </div>
                      <button
                        onClick={() => runTest(prompt)}
                        disabled={loading || autoRunning}
                        className={`ml-2 px-3 py-1 rounded text-xs font-medium ${
                          isRunning
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isRunning ? 'Running...' : 'Test'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Results */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Results</h2>
            <div className="max-h-[600px] overflow-y-auto space-y-3">
              {Array.from(testResults.values()).reverse().map(result => (
                <div key={result.prompt.id} className={`border rounded p-3 ${result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-white px-2 py-1 rounded">{result.prompt.id}</span>
                        <span className="text-xs text-gray-500">{result.duration}ms</span>
                      </div>
                      <div className="text-sm font-medium mt-1">{result.prompt.prompt}</div>
                      <div className="text-xs mt-1">
                        <span className="font-medium">Route:</span> {result.response.source || 'N/A'} •{' '}
                        <span className="font-medium">Intent:</span> {result.response.intent?.intents?.[0] || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{result.notes}</div>
                    </div>
                    <button
                      onClick={() => toggleExpandResult(result.prompt.id)}
                      className="ml-2 px-2 py-1 bg-white rounded text-xs hover:bg-gray-100"
                    >
                      {expandedResult === result.prompt.id ? '▼' : '▶'}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedResult === result.prompt.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      {/* Answer */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Answer:</div>
                        <div className="text-xs bg-white p-2 rounded max-h-40 overflow-y-auto">
                          {result.response.answer || result.response.error || 'No answer'}
                        </div>
                      </div>

                      {/* Intent & Routing */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs font-semibold mb-1">Intent:</div>
                          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.response.intent, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs font-semibold mb-1">Routing:</div>
                          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.response.routing, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Evidence/Facts */}
                      {result.response.hits && result.response.hits.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1">KB Hits ({result.response.hits.length}):</div>
                          <div className="text-xs bg-white p-2 rounded max-h-40 overflow-y-auto">
                            {result.response.hits.map((hit: any, i: number) => (
                              <div key={i} className="mb-1">
                                [{i + 1}] {hit.chip_id} (score: {hit.score?.toFixed(3)}) - {hit.type}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.response.facts && result.response.facts.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1">SQL Facts ({result.response.facts.length}):</div>
                          <div className="text-xs bg-white p-2 rounded max-h-40 overflow-y-auto">
                            <pre>{JSON.stringify(result.response.facts.slice(0, 3), null, 2)}</pre>
                            {result.response.facts.length > 3 && (
                              <div className="text-gray-500 mt-1">... and {result.response.facts.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Chips */}
                      {result.response.chips && result.response.chips.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1">Referenced Chips:</div>
                          <div className="text-xs bg-white p-2 rounded">
                            {result.response.chips.map((chip: any, i: number) => (
                              <span key={i} className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                                {chip.chip_id || chip.id || chip.text || chip.kind}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={resultsEndRef} />
            </div>
          </div>
        </div>

        {/* Export Button */}
        {totalRun > 0 && (
          <div className="text-center">
            <button
              onClick={downloadReport}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              📥 Download Full Test Report (JSON)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
