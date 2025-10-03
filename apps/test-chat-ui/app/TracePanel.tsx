'use client';

import React, { useState } from 'react';

type TraceEvent = {
  id: string;
  trace_id: string;
  sequence: number;
  component: string;
  operation: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  api_provider?: string;
  api_method?: string;
  api_request?: any;
  api_response?: any;
  api_error?: string;
  metadata?: any;
  created_at: string;
};

type TraceData = {
  trace_id: string;
  message: string;
  intent?: string;
  duration_ms?: number;
  events: any;
  model?: string;
  pipeline?: string;
};

export default function TracePanel({
  traceId,
  trace,
}: {
  traceId: string;
  trace: TraceData | null;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (!trace) {
    return (
      <div className="w-full h-full border rounded-xl p-3 overflow-auto">
        <div className="text-sm text-slate-500">No trace data available</div>
      </div>
    );
  }

  const events = Array.isArray(trace.events) ? trace.events : [];

  const toggle = (sequence: number) => setExpanded(prev => ({ ...prev, [sequence]: !prev[sequence] }));

  const badge = (component: string) => {
    const color: Record<string,string> = {
      orchestrator: 'bg-blue-100 text-blue-700',
      enum_resolver: 'bg-green-100 text-green-700',
      utfa_resolver: 'bg-blue-100 text-blue-700',
      retriever: 'bg-indigo-100 text-indigo-700',
      retrieval: 'bg-cyan-100 text-cyan-700',
      reranker: 'bg-amber-100 text-amber-700',
      facts: 'bg-emerald-100 text-emerald-700',
      composer: 'bg-purple-100 text-purple-700',
      hybrid_search: 'bg-teal-100 text-teal-700',
      moderation: 'bg-red-100 text-red-700',
      embedder: 'bg-pink-100 text-pink-700',
    };
    return color[component] ?? 'bg-slate-100 text-slate-700';
  };

  const providerBadge = (provider?: string) => {
    if (!provider) return null;
    const color: Record<string,string> = {
      openai: 'bg-green-100 text-green-700',
      pinecone: 'bg-orange-100 text-orange-700',
      cohere: 'bg-yellow-100 text-yellow-700',
      postgres: 'bg-blue-100 text-blue-700',
    };
    return color[provider] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="w-full h-full border rounded-xl p-3 overflow-auto">
      <div className="mb-3">
        <div className="text-sm text-slate-500">Trace ID</div>
        <div className="font-mono text-xs break-all">{traceId}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-slate-500">Message:</span> {trace.message?.substring(0, 50)}...</div>
          <div><span className="text-slate-500">Intent:</span> {trace.intent || '—'}</div>
          <div><span className="text-slate-500">Total:</span> {trace.duration_ms ? `${trace.duration_ms} ms` : 'In progress'}</div>
          <div><span className="text-slate-500">Events:</span> {events.length}</div>
        </div>
        {trace.pipeline && (
          <div className="mt-2 flex gap-2 items-center">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              trace.pipeline === 'sql-enum' ? 'bg-green-100 text-green-800' :
              trace.pipeline === 'utfa' ? 'bg-blue-100 text-blue-800' :
              trace.pipeline === 'rag' ? 'bg-amber-100 text-amber-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {trace.pipeline === 'sql-enum' ? '✅ Facts-First SQL (NO RAG)' :
               trace.pipeline === 'utfa' ? '✅ UTFA Temporal Facts' :
               trace.pipeline === 'rag' ? 'RAG + LLM' :
               trace.pipeline}
            </span>
            <span className="text-xs text-slate-600">Model: {trace.model || 'unknown'}</span>
          </div>
        )}
      </div>

      <ol className="space-y-2">
        {events.map((e: TraceEvent) => (
          <li key={e.sequence} className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded ${badge(e.component)}`}>{e.component}</span>
                {e.api_provider && (
                  <span className={`px-2 py-0.5 text-xs rounded ${providerBadge(e.api_provider)}`}>{e.api_provider}</span>
                )}
                <span className="text-xs text-slate-500">{new Date(e.start_time).toLocaleTimeString()}</span>
              </div>
              <div className="text-xs text-slate-600">
                {e.operation} {typeof e.duration_ms === 'number' ? `· ${e.duration_ms} ms` : ''}
              </div>
            </div>

            {e.api_error && (
              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                Error: {e.api_error}
              </div>
            )}

            <div className="mt-2">
              <button
                onClick={() => toggle(e.sequence)}
                className="text-xs underline text-slate-700 hover:text-slate-900"
              >
                {expanded[e.sequence] ? 'Hide details' : 'Show details'}
              </button>
              {expanded[e.sequence] && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {e.api_request && (
                    <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-64">
                      <div className="font-semibold mb-1">Request</div>
                      {JSON.stringify(e.api_request, null, 2)}
                    </pre>
                  )}
                  {e.api_response && (
                    <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-64">
                      <div className="font-semibold mb-1">Response</div>
                      {JSON.stringify(e.api_response, null, 2)}
                    </pre>
                  )}
                  {e.metadata && (
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-64 md:col-span-2">
                      <div className="font-semibold mb-1">Metadata</div>
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}