"use client";

import { useState } from "react";
import type { SuiteResult, TestRunResponse } from "@/lib/testlab/schema";

interface TraceExporterProps {
  suiteResult: SuiteResult | null;
  singleResult: TestRunResponse | null;
  mode: "suite" | "single";
}

export function TraceExporter({ suiteResult, singleResult, mode }: TraceExporterProps) {
  const [format, setFormat] = useState<"json" | "csv">("json");

  const exportJSON = () => {
    const data = mode === "suite" ? suiteResult : singleResult;
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-lab-${mode}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!suiteResult && !singleResult) return;

    const tests = mode === "suite" ? suiteResult!.tests : [singleResult!];

    // CSV Headers (comprehensive trace fields)
    const headers = [
      "Test ID",
      "Label",
      "Category",
      "Prompt",
      "Answer",
      "Source",
      "Model Badge",
      "Scaffold",
      "Router Decision",
      "Router Confidence",
      "SQL Query",
      "SQL Rows",
      "Provenance Count",
      "Meta Leak",
      "Warmth",
      "Action",
      "Total Latency (ms)",
      "Router Latency (ms)",
      "Source Latency (ms)",
      "Guard Latency (ms)",
      "P95 Latency (ms)",
      "Gate Pass Count",
      "Gate Warn Count",
      "Gate Fail Count",
      "Trace: Normalize",
      "Trace: PreRouter",
      "Trace: Lexicon Tags",
      "Trace: Router Decision",
      "Trace: Source Call",
      "Trace: Guards Applied"
    ];

    // Build CSV rows
    const rows = tests.map((testResult) => {
      const { test, run, gates } = testResult;

      const passCount = gates.filter(g => g.verdict === "pass").length;
      const warnCount = gates.filter(g => g.verdict === "warn").length;
      const failCount = gates.filter(g => g.verdict === "fail").length;

      return [
        test.id,
        test.label,
        test.category,
        `"${test.prompt.replace(/"/g, '""')}"`, // Escape quotes
        `"${run.answer.replace(/"/g, '""')}"`,
        run.source,
        run.modelBadge || "N/A",
        run.scaffold || "N/A",
        run.debug.router?.decision?.route || "N/A",
        run.debug.router?.decision?.confidence || "N/A",
        `"${(run.debug.sql?.query || "N/A").replace(/"/g, '""')}"`,
        run.debug.sql?.rows_count || "N/A",
        run.debug.provenance.length,
        run.debug.metaLeak ? "TRUE" : "FALSE",
        run.debug.tone.warmth ? "TRUE" : "FALSE",
        run.debug.tone.action ? "TRUE" : "FALSE",
        run.metrics.latency.total_ms,
        run.metrics.latency.router_ms || "N/A",
        run.metrics.latency.source_ms || "N/A",
        run.metrics.latency.guard_ms || "N/A",
        run.metrics.latency.p95_ms || "N/A",
        passCount,
        warnCount,
        failCount,
        run.debug.trace?.normalize || "N/A",
        run.debug.trace?.preRouter?.decision || "N/A",
        `"${(run.debug.trace?.lexiconTags || []).join("; ")}"`,
        run.debug.trace?.routerDecision || "N/A",
        run.debug.trace?.sourceCall || "N/A",
        `"${(run.debug.trace?.guardsApplied || []).join("; ")}"`,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-lab-${mode}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (format === "json") {
      exportJSON();
    } else {
      exportCSV();
    }
  };

  const hasData = mode === "suite" ? !!suiteResult : !!singleResult;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="font-medium text-gray-700">Export Deep Trace</h3>

      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="json"
            checked={format === "json"}
            onChange={(e) => setFormat(e.target.value as "json")}
            className="text-blue-600"
          />
          <span className="text-sm text-gray-700">JSON (Full Trace)</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="csv"
            checked={format === "csv"}
            onChange={(e) => setFormat(e.target.value as "csv")}
            className="text-blue-600"
          />
          <span className="text-sm text-gray-700">CSV (Tabular)</span>
        </label>
      </div>

      <button
        onClick={handleExport}
        disabled={!hasData}
        className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
      >
        {hasData
          ? `Export as ${format.toUpperCase()} (${mode === "suite" ? suiteResult!.tests.length + " tests" : "1 test"})`
          : "No data to export"}
      </button>

      {hasData && (
        <p className="text-xs text-gray-500">
          {format === "json"
            ? "Full trace data including debug info, metrics, gates, and provenance"
            : "Comprehensive CSV with 30+ trace fields for analysis"}
        </p>
      )}
    </div>
  );
}
