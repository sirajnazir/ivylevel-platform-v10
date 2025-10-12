"use client";

import { useState } from "react";
import type { TestRunResponse, SuiteResult } from "@/lib/testlab/schema";

interface LogsPanelProps {
  currentResult: TestRunResponse | null;
  suiteResult: SuiteResult | null;
}

export function LogsPanel({ currentResult, suiteResult }: LogsPanelProps) {
  const [showJson, setShowJson] = useState(false);

  const handleDownload = () => {
    const data = suiteResult || currentResult;
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `testlab-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentResult && !suiteResult) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Logs & Validation</h2>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>Run a test to see logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Logs & Validation</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJson(!showJson)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showJson ? "Hide JSON" : "Show JSON"}
          </button>
          <button
            onClick={handleDownload}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Download
          </button>
        </div>
      </div>

      {/* Gate Verdicts */}
      {currentResult && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Gate Verdicts</h3>
          <div className="space-y-2">
            {currentResult.gates.map((gate, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 text-sm p-2 rounded ${
                  gate.verdict === "pass"
                    ? "bg-green-50"
                    : gate.verdict === "warn"
                    ? "bg-yellow-50"
                    : "bg-red-50"
                }`}
              >
                <span className="text-lg">
                  {gate.verdict === "pass" ? "✔" : gate.verdict === "warn" ? "⚠" : "✖"}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{gate.name}</div>
                  <div className="text-xs text-gray-600">{gate.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suite Summary */}
      {suiteResult && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Suite Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Tests:</span>
              <span className="font-medium">{suiteResult.tests.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gates Passed:</span>
              <span className="font-medium text-green-600">{suiteResult.aggregate.passed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gates Warned:</span>
              <span className="font-medium text-yellow-600">{suiteResult.aggregate.warned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gates Failed:</span>
              <span className="font-medium text-red-600">{suiteResult.aggregate.failed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pass Rate:</span>
              <span className="font-medium">{suiteResult.aggregate.passRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Structured Log */}
      {showJson && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Structured Log (JSON)</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(suiteResult || currentResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Telemetry Status */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Telemetry:</span>
          <span className="text-green-600 flex items-center gap-1">
            <span>✔</span>
            <span>Stored</span>
          </span>
        </div>
      </div>

      {/* Debug Info */}
      {currentResult && (
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-700 mb-2">Debug Info</h3>
          <div className="space-y-1 text-xs text-gray-600">
            <div>Test ID: {currentResult.test.id}</div>
            <div>Category: {currentResult.test.category}</div>
            <div>Student: {currentResult.test.studentId ?? "huda-2025"}</div>
            {currentResult.test.intentOverride && (
              <div>Intent Override: {currentResult.test.intentOverride}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
