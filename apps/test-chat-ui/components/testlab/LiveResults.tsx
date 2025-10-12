"use client";

import type { TestRunResponse, SuiteResult } from "@/lib/testlab/schema";
import { MetricsBar } from "./MetricsBar";
import { TraceView } from "./TraceView";

interface LiveResultsProps {
  currentResult: TestRunResponse | null;
  suiteResult: SuiteResult | null;
  running: boolean;
}

export function LiveResults({ currentResult, suiteResult, running }: LiveResultsProps) {
  if (running && !currentResult && !suiteResult) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Running test...</p>
          </div>
        </div>
      </div>
    );
  }

  if (suiteResult) {
    return (
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Suite Results</h2>

        {/* Suite Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{suiteResult.aggregate.passed}</div>
            <div className="text-sm text-green-600">Passed</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{suiteResult.aggregate.warned}</div>
            <div className="text-sm text-yellow-600">Warned</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{suiteResult.aggregate.failed}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{suiteResult.aggregate.passRate.toFixed(1)}%</div>
            <div className="text-sm text-blue-600">Pass Rate</div>
          </div>
        </div>

        {/* Latency */}
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Latency</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-gray-600">p50:</span>{" "}
              <span className="font-medium">{suiteResult.aggregate.latency.p50}ms</span>
            </div>
            <div>
              <span className="text-gray-600">p95:</span>{" "}
              <span className="font-medium">{suiteResult.aggregate.latency.p95}ms</span>
            </div>
            <div>
              <span className="text-gray-600">max:</span>{" "}
              <span className="font-medium">{suiteResult.aggregate.latency.max}ms</span>
            </div>
          </div>
        </div>

        {/* Scorecard */}
        <div>
          <h3 className="font-medium text-gray-700 mb-2">PRD Scorecard</h3>
          <div className="space-y-2">
            <ScoreItem label="Proof Presence" score={suiteResult.scorecard.proofPresence} />
            <ScoreItem label="Tone Warmth" score={suiteResult.scorecard.toneWarmth} />
            <ScoreItem label="Tone Action" score={suiteResult.scorecard.toneAction} />
            <ScoreItem label="No Meta-Leak" score={suiteResult.scorecard.noMetaLeak} />
            <ScoreItem label="Source Correctness" score={suiteResult.scorecard.sourceCorrectness} />
          </div>
        </div>

        {/* Model Mix */}
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Model Mix</h3>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-600">Adapter:</span>{" "}
              <span className="font-medium">{suiteResult.aggregate.modelMix.adapter}</span>
            </div>
            <div>
              <span className="text-gray-600">Base:</span>{" "}
              <span className="font-medium">{suiteResult.aggregate.modelMix.base}</span>
            </div>
          </div>
        </div>

        {/* Individual Results */}
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Individual Tests</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {suiteResult.tests.map((test, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-sm">{test.test.label}</div>
                  <div className="text-xs">
                    {test.gates.filter(g => g.verdict === "pass").length}/{test.gates.length} gates
                  </div>
                </div>
                <div className="text-xs text-gray-600">{test.run.metrics.latency.total_ms}ms</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentResult) {
    return (
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Live Results</h2>

        <MetricsBar run={currentResult.run} />

        <div>
          <h3 className="font-medium text-gray-700 mb-2">Answer</h3>
          <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
            {currentResult.run.answer}
          </div>
        </div>

        <TraceView run={currentResult.run} />

        {/* Gates */}
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Gates</h3>
          <div className="space-y-2">
            {currentResult.gates.map((gate, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  gate.verdict === "pass"
                    ? "bg-green-50 border-green-200"
                    : gate.verdict === "warn"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{gate.name}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      gate.verdict === "pass"
                        ? "bg-green-100 text-green-700"
                        : gate.verdict === "warn"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {gate.verdict}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">{gate.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Run a test to see results</p>
      </div>
    </div>
  );
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-32 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              score >= 90 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-sm font-medium w-12 text-right">{score.toFixed(0)}%</span>
      </div>
    </div>
  );
}
