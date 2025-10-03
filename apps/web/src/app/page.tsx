'use client';

import { useState, useEffect } from 'react';
import { agentChat, getVitals, resolveEvidence } from '@/lib/api';

export default function ChatPage() {
  const [studentId, setStudentId] = useState('huda-2025');
  const [week, setWeek] = useState<number | undefined>(undefined);
  const [model, setModel] = useState<string | undefined>(undefined); // optional FT override
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [traceId, setTraceId] = useState<string | null>(null);

  async function send() {
    if (!input.trim() || loading) return;
    
    setLoading(true);
    const userText = input.trim();
    setInput('');
    
    // Add user message to history
    setHistory(h => [...h, { role: 'user', text: userText }]);
    
    try {
      const res = await agentChat(input, studentId, { week, llm_model: model });
      
      // res shape: { answer?, hits, chips, vitals, meta? }
      setHistory(h => [...h, {
        role: 'assistant',
        text: res.answer ?? '(facts and chips returned; see side panel)',
        chips: res.chips || [],
        vitals: res.vitals || {},
        hits: res.hits || [],
        meta: res.meta || {}
      }]);
      
      // Extract trace ID if available
      if (res.meta?.trace_id) {
        setTraceId(res.meta.trace_id);
      }
    } catch (error: any) {
      setHistory(h => [...h, {
        role: 'system',
        text: `Error: ${error.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 grid gap-4 md:grid-cols-[1fr_360px] h-screen">
      {/* Left: chat */}
      <div className="space-y-3 flex flex-col">
        <div className="flex gap-3">
          <input 
            className="border p-2 flex-1 rounded" 
            value={input} 
            onChange={e=>setInput(e.target.value)} 
            placeholder="Ask Jenny…" 
            onKeyPress={e => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button 
            className="border px-4 rounded bg-black text-white disabled:opacity-50" 
            onClick={send}
            disabled={loading || !input.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center text-sm border-b pb-3">
          <label>Student</label>
          <input 
            className="border p-1 w-40 rounded" 
            value={studentId} 
            onChange={e=>setStudentId(e.target.value)} 
          />
          <label>Week</label>
          <input 
            className="border p-1 w-24 rounded" 
            type="number" 
            value={week ?? ''} 
            onChange={e=>setWeek(e.target.value ? Number(e.target.value) : undefined)} 
            placeholder="(optional)" 
          />
          <label>Model</label>
          <input 
            className="border p-1 w-80 rounded" 
            value={model ?? ''} 
            onChange={e=>setModel(e.target.value || undefined)} 
            placeholder="(optional) ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy" 
          />
        </div>

        {/* Trace ID */}
        {traceId && (
          <div className="text-xs text-gray-600">
            Trace ID: <code className="font-mono">{traceId}</code>
          </div>
        )}

        {/* Transcript */}
        <div className="border rounded p-3 space-y-2 flex-1 overflow-y-auto">
          {history.map((m,i)=>(
            <div key={i} className={`${m.role==='user'?'font-medium':'text-gray-800'} ${m.role==='system'?'text-red-600 italic':''}`}>
              <div>{m.role==='user'?'You':m.role==='assistant'?'Jenny':'System'}: {m.text}</div>
              {m.chips?.length ? (
                <div className="mt-2 text-xs">
                  <EvidenceChips chips={m.chips} />
                  {m.hits?.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600">View search hits ({m.hits.length})</summary>
                      <div className="mt-1 space-y-1 text-[11px] bg-gray-50 p-2 rounded">
                        {m.hits.map((hit: any, idx: number) => (
                          <div key={idx}>
                            [{hit.namespace}] {hit.id} (score: {hit.score?.toFixed(3)})
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ): null}
            </div>
          ))}
          {loading && <div className="text-gray-500 italic">Jenny is thinking...</div>}
        </div>
      </div>

      {/* Right: live vitals panel */}
      <VitalsPanel studentId={studentId} />
    </div>
  );
}

function VitalsPanel({ studentId }: { studentId: string }) {
  const [facts, setFacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  async function refresh() {
    setLoading(true);
    try {
      const v = await getVitals(studentId);
      setFacts(v.facts ?? []);
    } catch (error) {
      console.error('Failed to fetch vitals:', error);
      setFacts([]);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    refresh();
  }, [studentId]);
  
  return (
    <div className="border rounded p-3 space-y-2 h-full overflow-hidden flex flex-col">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Vitals (PostgreSQL)</h3>
        <button 
          className="text-xs underline disabled:opacity-50" 
          onClick={refresh}
          disabled={loading}
        >
          {loading ? 'loading...' : 'refresh'}
        </button>
      </div>
      <div className="text-xs text-gray-600">
        Facts for {studentId}: {facts.length}
      </div>
      <ul className="text-xs space-y-1 overflow-auto flex-1">
        {facts.slice(0,50).map((f,i)=>(
          <li key={i} className="border-b pb-1">
            <div>
              <code className="font-mono text-[11px]">{f.kind}</code>: <b>{f.value}</b>
            </div>
            <div className="text-[10px] text-gray-500">
              {f.fact_date ? new Date(f.fact_date).toLocaleDateString() : 'no date'}
              {f.confidence && ` • ${f.confidence}`}
              {f.source_id && ` • ${f.source_id}`}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceChips({ chips }: { chips: any[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  async function load() {
    if (!chips?.length) return;
    setLoading(true);
    try {
      const ids = chips.map(c => c.id || c.source_id).filter(Boolean);
      if (ids.length === 0) {
        setItems([]);
        setOpen(true);
        return;
      }
      const data = await resolveEvidence(ids);
      setItems(Array.isArray(data) ? data : []);
      setOpen(true);
    } catch (error) {
      console.error('Failed to resolve evidence:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <>
      <button 
        className="underline text-blue-600 disabled:opacity-50" 
        onClick={load}
        disabled={loading}
      >
        {loading ? 'loading...' : `evidence (${chips.length})`}
      </button>
      {open && (
        <div className="mt-2 border rounded p-2 bg-gray-50">
          {items.length > 0 ? (
            items.map((s,i)=>(
              <div key={i} className="mb-1">
                <div className="font-medium text-xs">{s.title}</div>
                {s.drive_link ? (
                  <a className="text-blue-600 underline text-[11px]" href={s.drive_link} target="_blank" rel="noopener noreferrer">
                    open source
                  </a>
                ) : null}
                <div className="text-[11px] text-gray-600">{s.source_id}</div>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">
              {chips.length > 0 ? 'No evidence details available' : 'No evidence chips'}
            </div>
          )}
          <button className="text-xs underline mt-2" onClick={()=>setOpen(false)}>close</button>
        </div>
      )}
    </>
  );
}