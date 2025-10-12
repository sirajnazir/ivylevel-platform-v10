"use client";

import { useState } from "react";
import type { TestCase } from "@/lib/testlab/schema";
import factsSuite from "@/lib/testlab/suites/facts.json";
import kbSuite from "@/lib/testlab/suites/kb.json";
import eqSuite from "@/lib/testlab/suites/eq.json";

interface ScenarioBuilderProps {
  onRunSingle: (test: TestCase) => void;
  onRunSuite: (suiteId: string, label: string, category: string, tests: TestCase[]) => void;
  running: boolean;
}

export function ScenarioBuilder({ onRunSingle, onRunSuite, running }: ScenarioBuilderProps) {
  const [category, setCategory] = useState<"facts" | "kb" | "eq">("facts");
  const [prompt, setPrompt] = useState("");
  const [studentId, setStudentId] = useState("huda-2025");
  const [intentOverride, setIntentOverride] = useState("");
  const [selectedSuite, setSelectedSuite] = useState<"facts" | "kb" | "eq" | null>(null);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  const handleRunSingle = () => {
    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }

    const test: TestCase = {
      id: `manual-${Date.now()}`,
      label: prompt.slice(0, 50),
      category,
      prompt,
      studentId,
      intentOverride: intentOverride || undefined
    };

    onRunSingle(test);
  };

  const handleRunSuite = () => {
    if (!selectedSuite) {
      alert("Please select a suite");
      return;
    }

    const suiteData = selectedSuite === "facts" ? factsSuite : selectedSuite === "kb" ? kbSuite : eqSuite;
    const testsToRun = selectedTests.size > 0
      ? suiteData.tests.filter(t => selectedTests.has(t.id))
      : suiteData.tests;

    if (testsToRun.length === 0) {
      alert("No tests selected");
      return;
    }

    onRunSuite(suiteData.id, suiteData.label, suiteData.category, testsToRun as TestCase[]);
  };

  const handleSelectSuite = (suite: "facts" | "kb" | "eq") => {
    setSelectedSuite(suite);
    setSelectedTests(new Set());
  };

  const handleToggleTest = (testId: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const selectedSuiteData = selectedSuite === "facts" ? factsSuite : selectedSuite === "kb" ? kbSuite : selectedSuite === "eq" ? eqSuite : null;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Scenario Builder</h2>

      {/* Single Test Mode */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700">Single Test</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={running}
          >
            <option value="facts">Facts (SQL)</option>
            <option value="kb">KB/Indexing</option>
            <option value="eq">EQ/Tone</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            rows={3}
            placeholder="Enter test prompt..."
            disabled={running}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={running}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Intent Override (optional)
          </label>
          <input
            type="text"
            value={intentOverride}
            onChange={(e) => setIntentOverride(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="e.g., academics.vitals.trend"
            disabled={running}
          />
        </div>

        <button
          onClick={handleRunSingle}
          disabled={running || !prompt.trim()}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {running ? "Running..." : "Run Single Test"}
        </button>
      </div>

      <div className="border-t pt-6">
        {/* Suite Mode */}
        <h3 className="font-medium text-gray-700 mb-4">Test Suite</h3>

        <div className="space-y-2 mb-4">
          <button
            onClick={() => handleSelectSuite("facts")}
            className={`w-full text-left px-4 py-2 rounded-md border ${
              selectedSuite === "facts"
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            disabled={running}
          >
            Facts Suite (10 tests)
          </button>

          <button
            onClick={() => handleSelectSuite("kb")}
            className={`w-full text-left px-4 py-2 rounded-md border ${
              selectedSuite === "kb"
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            disabled={running}
          >
            KB Suite (8 tests)
          </button>

          <button
            onClick={() => handleSelectSuite("eq")}
            className={`w-full text-left px-4 py-2 rounded-md border ${
              selectedSuite === "eq"
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            disabled={running}
          >
            EQ Suite (10 tests)
          </button>
        </div>

        {selectedSuiteData && (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Select tests ({selectedTests.size} selected)
              </span>
              <button
                onClick={() =>
                  setSelectedTests(
                    selectedTests.size === selectedSuiteData.tests.length
                      ? new Set()
                      : new Set(selectedSuiteData.tests.map(t => t.id))
                  )
                }
                className="text-xs text-blue-600 hover:text-blue-700"
                disabled={running}
              >
                {selectedTests.size === selectedSuiteData.tests.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {selectedSuiteData.tests.map((test: any) => (
              <label key={test.id} className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedTests.has(test.id)}
                  onChange={() => handleToggleTest(test.id)}
                  className="mt-1"
                  disabled={running}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{test.label}</div>
                  <div className="text-xs text-gray-500">{test.prompt}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={handleRunSuite}
          disabled={running || !selectedSuite}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {running ? "Running Suite..." : `Run Suite (${selectedTests.size > 0 ? selectedTests.size : selectedSuiteData?.tests.length ?? 0} tests)`}
        </button>
      </div>
    </div>
  );
}
