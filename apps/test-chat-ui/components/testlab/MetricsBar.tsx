"use client";

import type { RunResult } from "@/lib/testlab/schema";

interface MetricsBarProps {
  run: RunResult;
}

export function MetricsBar({ run }: MetricsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
      <div className="flex flex-col">
        <span className="text-gray-600 text-xs">Model</span>
        <span className="font-medium">{run.modelBadge ?? "—"}</span>
      </div>

      <div className="flex flex-col">
        <span className="text-gray-600 text-xs">Source</span>
        <span className="font-medium uppercase">{run.source}</span>
      </div>

      <div className="flex flex-col">
        <span className="text-gray-600 text-xs">Latency</span>
        <span className="font-medium">{run.metrics.latency.total_ms}ms</span>
      </div>

      <div className="flex flex-col">
        <span className="text-gray-600 text-xs">Warmth</span>
        <span>{run.debug.tone?.warmth ? "✅" : "—"}</span>
      </div>

      <div className="flex flex-col">
        <span className="text-gray-600 text-xs">Action</span>
        <span>{run.debug.tone?.action ? "✅" : "—"}</span>
      </div>

      <div className="flex flex-col">
        <span className="text-gray-600 text-xs">Meta</span>
        <span>{run.debug.metaLeak ? "⚠️" : "✅"}</span>
      </div>
    </div>
  );
}
