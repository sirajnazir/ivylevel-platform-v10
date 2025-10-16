"use client";

import { useState } from "react";
import { ScenarioBuilder } from "@/components/testlab/ScenarioBuilder";
import { LiveResults } from "@/components/testlab/LiveResults";
import { LogsPanel } from "@/components/testlab/LogsPanel";
import { TraceExporter } from "@/components/testlab/TraceExporter";
import type { TestCase, TestRunResponse, SuiteResult } from "@/lib/testlab/schema";

export default function TestLabPage() {
  const [currentTest, setCurrentTest] = useState<TestCase | null>(null);
  const [currentResult, setCurrentResult] = useState<TestRunResponse | null>(null);
  const [suiteResult, setSuiteResult] = useState<SuiteResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunSingle = async (test: TestCase) => {
    setRunning(true);
    setCurrentTest(test);
    setCurrentResult(null);
    setSuiteResult(null);

    try {
      const resp = await fetch("/api/testlab/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test })
      });

      if (!resp.ok) {
        throw new Error(`Test failed: ${resp.status}`);
      }

      const result = await resp.json();
      setCurrentResult(result);
    } catch (error: any) {
      console.error("Test run error:", error);
      alert(`Test failed: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleRunSuite = async (suiteId: string, label: string, category: string, tests: TestCase[]) => {
    setRunning(true);
    setCurrentResult(null);
    setSuiteResult(null);

    try {
      const resp = await fetch("/api/testlab/suite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          suiteId,
          label,
          category,
          tests,
          parallel: false
        })
      });

      if (!resp.ok) {
        throw new Error(`Suite failed: ${resp.status}`);
      }

      const result = await resp.json();
      setSuiteResult(result);
    } catch (error: any) {
      console.error("Suite run error:", error);
      alert(`Suite failed: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-green-50 p-6 rounded-lg border-2 border-purple-200">
          <h1 className="text-4xl font-bold text-gray-900">Jenny Test Lab v4.0</h1>
          <p className="text-gray-700 mt-2 text-lg font-medium">
            Comprehensive testing for CAT-1 (Facts/SQL), CAT-2 (KB/RAG), and CAT-3 (EQ/LLM)
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-sm text-green-700 font-semibold">
              ⭐ v11.3.2: jenny_v9_eq Fine-Tuned Model (Deployed 2025-10-13)
            </p>
            <p className="text-xs text-gray-600">
              90 Total Tests: 30 CAT-1 (SQL) + 25 CAT-2 (KB/RAG) + 35 CAT-3 (jenny_v9_eq)
            </p>
            <p className="text-xs text-gray-600">
              Features: Deep trace inspection | Downloadable logs | JSON artifact detection | Warmth/Action validation
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Scenario Builder */}
          <div className="lg:col-span-1">
            <ScenarioBuilder
              onRunSingle={handleRunSingle}
              onRunSuite={handleRunSuite}
              running={running}
            />
          </div>

          {/* Center: Live Results */}
          <div className="lg:col-span-1">
            <LiveResults
              currentResult={currentResult}
              suiteResult={suiteResult}
              running={running}
            />
          </div>

          {/* Right: Logs & Validation */}
          <div className="lg:col-span-1 space-y-6">
            <LogsPanel
              currentResult={currentResult}
              suiteResult={suiteResult}
            />

            {/* Export Section */}
            <TraceExporter
              suiteResult={suiteResult}
              singleResult={currentResult}
              mode={suiteResult ? "suite" : "single"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
