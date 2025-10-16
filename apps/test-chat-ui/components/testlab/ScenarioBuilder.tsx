"use client";

import { useState } from "react";
import type { TestCase } from "@/lib/testlab/schema";
// v4.0: Latest comprehensive test suites (v11.3.2 - jenny_v9_eq)
import cat1v4 from "@/lib/testlab/suites/cat1-facts-v4.json";
import cat2v4 from "@/lib/testlab/suites/cat2-kb-v4.json";
import cat3v4 from "@/lib/testlab/suites/cat3-eq-v4.json";

interface ScenarioBuilderProps {
  onRunSingle: (test: TestCase) => void;
  onRunSuite: (suiteId: string, label: string, category: string, tests: TestCase[]) => void;
  running: boolean;
}

type SuiteType = "cat1-facts-v4" | "cat2-kb-v4" | "cat3-eq-v4";

export function ScenarioBuilder({ onRunSingle, onRunSuite, running }: ScenarioBuilderProps) {
  const [category, setCategory] = useState<"facts" | "kb" | "eq">("facts");
  const [prompt, setPrompt] = useState("");
  const [studentId, setStudentId] = useState("huda-2025");
  const [intentOverride, setIntentOverride] = useState("");
  const [selectedSuite, setSelectedSuite] = useState<SuiteType | null>(null);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  // v4.0: Suite registry (v11.3.2 - jenny_v9_eq deployment)
  const suiteRegistry = {
    "cat1-facts-v4": cat1v4,
    "cat2-kb-v4": cat2v4,
    "cat3-eq-v4": cat3v4
  };

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

    const suiteData = suiteRegistry[selectedSuite];
    const testsToRun = selectedTests.size > 0
      ? suiteData.tests.filter(t => selectedTests.has(t.id))
      : suiteData.tests;

    if (testsToRun.length === 0) {
      alert("No tests selected");
      return;
    }

    onRunSuite(suiteData.id, suiteData.label, suiteData.category, testsToRun as TestCase[]);
  };

  const handleSelectSuite = (suite: SuiteType) => {
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

  const selectedSuiteData = selectedSuite ? suiteRegistry[selectedSuite] : null;

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
            onClick={() => handleSelectSuite("cat1-facts-v4")}
            className={`w-full text-left px-4 py-3 rounded-md border-2 ${
              selectedSuite === "cat1-facts-v4"
                ? "bg-purple-50 border-purple-600 text-purple-900"
                : "bg-white border-purple-300 text-gray-700 hover:bg-purple-50 hover:border-purple-400"
            }`}
            disabled={running}
          >
            <div className="font-semibold">🔷 CAT-1: Facts/SQL v4.0 (30 tests)</div>
            <div className="text-xs mt-1 opacity-75">Universal Enumeration Coverage | UTFA Temporal Resolution</div>
          </button>

          <button
            onClick={() => handleSelectSuite("cat2-kb-v4")}
            className={`w-full text-left px-4 py-3 rounded-md border-2 ${
              selectedSuite === "cat2-kb-v4"
                ? "bg-blue-50 border-blue-600 text-blue-900"
                : "bg-white border-blue-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400"
            }`}
            disabled={running}
          >
            <div className="font-semibold">🔷 CAT-2: KB/RAG v4.0 (25 tests)</div>
            <div className="text-xs mt-1 opacity-75">KBv6 Vector Retrieval | 3 Namespaces | Hybrid SQL+RAG</div>
          </button>

          <button
            onClick={() => handleSelectSuite("cat3-eq-v4")}
            className={`w-full text-left px-4 py-3 rounded-md border-2 ${
              selectedSuite === "cat3-eq-v4"
                ? "bg-green-50 border-green-600 text-green-900"
                : "bg-white border-green-300 text-gray-700 hover:bg-green-50 hover:border-green-400"
            }`}
            disabled={running}
          >
            <div className="font-semibold">⭐ CAT-3: EQ/LLM v4.0 (35 tests) [jenny_v9_eq]</div>
            <div className="text-xs mt-1 opacity-75">Fine-Tuned 2025-10-13 | 0% JSON Artifacts | 90%+ Pass Target</div>
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
