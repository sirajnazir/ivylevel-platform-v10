"use client";

import type { RunResult } from "@/lib/testlab/schema";

interface TraceViewProps {
  run: RunResult;
}

export function TraceView({ run }: TraceViewProps) {
  const t = run.debug.trace;

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-900">Trace Timeline</h4>

      <ol className="space-y-2">
        <TraceStep
          number={1}
          label="Normalize"
          value={t?.normalize ?? "n/a"}
        />

        <TraceStep
          number={2}
          label="Lexicon Tags"
          value={run.debug.tags.length > 0 ? run.debug.tags.join(", ") : "none"}
        />

        <TraceStep
          number={3}
          label="Pre-router"
          value={t?.preRouter?.decision ?? "n/a"}
        />

        <TraceStep
          number={4}
          label="Router Decision"
          value={
            run.debug.router?.decision
              ? `${run.debug.router.decision.route} (conf: ${run.debug.router.decision.confidence})`
              : "n/a"
          }
        />

        <TraceStep
          number={5}
          label="Source Call"
          value={run.source}
        />

        <TraceStep
          number={6}
          label="Guards Applied"
          value={`warmth: ${run.debug.tone?.warmth ? "✅" : "—"} / action: ${run.debug.tone?.action ? "✅" : "—"}`}
        />

        {run.debug.sql && (
          <TraceStep
            number={7}
            label="SQL Rows"
            value={`${run.debug.sql.rows_count ?? 0} rows`}
          />
        )}

        {run.debug.provenance.length > 0 && (
          <TraceStep
            number={8}
            label="Provenance"
            value={`${run.debug.provenance.length} chips`}
          />
        )}
      </ol>
    </div>
  );
}

function TraceStep({ number, label, value }: { number: number; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3 p-2 bg-gray-50 rounded">
      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-600 font-mono break-all">{value}</div>
      </div>
    </li>
  );
}
