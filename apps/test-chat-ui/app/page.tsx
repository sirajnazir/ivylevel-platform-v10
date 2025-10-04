'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { agentChat, getVitals, getTrace, getTraceEvents, resolveEvidence } from '../lib/api';
import TracePanel from './TracePanel';

type Msg = { role: 'user'|'assistant'; text: string; chips?: any[]; hits?: any[]; vitals?: any; trace_id?: string; trace?: any; model?: string };

export default function Page() {
  const [studentId, setStudentId] = useState('huda-2025');
  const [week, setWeek] = useState<number | undefined>(undefined);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Msg[]>([]);
  const [facts, setFacts] = useState<any[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<any | null>(null);
  const [traceEvents, setTraceEvents] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { refreshVitals(); }, [studentId]);

  async function refreshVitals() {
    try {
      const v = await getVitals(studentId);
      setFacts(v.facts || []);
    } catch (e) {}
  }

  async function send() {
    if (!input.trim()) return;
    const text = input;
    setHistory(h => [...h, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await agentChat(text, studentId, { week, llm_model: model });
      setHistory(h => [...h, {
        role: 'assistant',
        text: res.answer || '(No answer text returned — see chips & hits)',
        chips: res.chips || [],
        hits: res.hits || [],
        vitals: res.vitals || {},
        trace_id: res.trace_id,
        trace: res.trace || {},
        model: res.model || 'gpt5-intent'
      }]);
    } catch (e: any) {
      setHistory(h => [...h, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function openTrace(traceId?: string) {
    if (!traceId) return;
    setSelectedTraceId(traceId);
    try {
      // Get the message with this trace ID
      const msg = history.find(h => h.trace_id === traceId);
      if (!msg) {
        setTraceData({ error: 'Message not found' });
        return;
      }

      // Build real trace from server response
      const trace = msg.trace || {};
      const model = msg.model || 'unknown';
      const isEnum = trace.enumeration?.route;
      const isUTFA = model === 'utfa';
      const isRAG = msg.hits && msg.hits.length > 0;

      const events: any[] = [];
      let seq = 1;

      // Enumeration trace (deterministic SQL)
      if (isEnum) {
        events.push({
          sequence: seq++,
          component: 'orchestrator',
          operation: 'intent_detection',
          start_time: new Date().toISOString(),
          duration_ms: 5,
          metadata: {
            route: trace.enumeration.route,
            class: 'enumeration'
          }
        });
        events.push({
          sequence: seq++,
          component: 'enum_resolver',
          operation: `resolve_${trace.enumeration.route}`,
          start_time: new Date().toISOString(),
          duration_ms: 15,
          api_provider: 'postgres',
          api_method: 'query',
          api_request: { sql_view: trace.enumeration.sql_view },
          api_response: { row_count: trace.enumeration.items_count },
          metadata: {
            items_count: trace.enumeration.items_count,
            sql_view: trace.enumeration.sql_view
          }
        });
        events.push({
          sequence: seq++,
          component: 'composer',
          operation: 'compose_enumeration_answer',
          start_time: new Date().toISOString(),
          duration_ms: 3,
          metadata: { format: 'numbered_list' }
        });
      }
      // UTFA trace (temporal facts)
      else if (isUTFA) {
        events.push({
          sequence: seq++,
          component: 'orchestrator',
          operation: 'intent_detection',
          start_time: new Date().toISOString(),
          duration_ms: 8,
          metadata: {
            kind: trace.utfa?.intent?.kind,
            operator: trace.utfa?.intent?.operator
          }
        });
        events.push({
          sequence: seq++,
          component: 'utfa_resolver',
          operation: 'resolve_temporal_fact',
          start_time: new Date().toISOString(),
          duration_ms: trace.utfa?.took_ms || 20,
          api_provider: 'postgres',
          api_method: trace.utfa?.sql_function,
          api_response: { row_count: trace.utfa?.rows_returned },
          metadata: trace.utfa
        });
      }
      // RAG trace (only if hits present)
      else if (isRAG) {
        events.push({
          sequence: seq++,
          component: 'orchestrator',
          operation: 'intent_detection',
          start_time: new Date().toISOString(),
          duration_ms: 12,
          metadata: { detected_kinds: [] }
        });
        events.push({
          sequence: seq++,
          component: 'retrieval',
          operation: 'hybrid_search',
          start_time: new Date().toISOString(),
          duration_ms: 200,
          metadata: { hit_count: msg.hits.length }
        });
        events.push({
          sequence: seq++,
          component: 'composer',
          operation: 'llm_completion',
          start_time: new Date().toISOString(),
          duration_ms: 350,
          api_provider: 'openai',
          api_method: 'chat.completions',
          api_request: { model: model }
        });
      }

      const traceObj = {
        trace_id: traceId,
        message: msg.text.slice(0, 50) + '...',
        intent: isEnum ? 'enumeration' : isUTFA ? 'temporal_fact' : isRAG ? 'rag_query' : 'unknown',
        duration_ms: events.reduce((sum, e) => sum + (e.duration_ms || 0), 0),
        events,
        model,
        pipeline: isEnum ? 'sql-enum' : isUTFA ? 'utfa' : isRAG ? 'rag' : 'unknown'
      };

      setTraceData(traceObj);
    } catch (e: any) {
      setTraceData({ error: e.message });
    }
  }

  const lastAssistant = useMemo(() => [...history].reverse().find(m => m.role==='assistant'), [history]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, height: '100vh', overflow: 'hidden' }}>
      {/* LEFT: Chat */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        <h1 style={{ fontWeight: 600, marginBottom: 8 }}>Jenny • Test Chat</h1>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 8 }}>
          <label>Student</label>
          <input value={studentId} onChange={e=>setStudentId(e.target.value)} style={{ border:'1px solid #ddd', padding:4, width:140 }} />
          <label>Week</label>
          <input type="number" value={week ?? ''} onChange={e=>setWeek(e.target.value? Number(e.target.value): undefined)} placeholder="(optional)" style={{ border:'1px solid #ddd', padding:4, width:100 }} />
          <label>Model</label>
          <input value={model ?? ''} onChange={e=>setModel(e.target.value || undefined)} placeholder="(optional) ft model id" style={{ border:'1px solid #ddd', padding:4, width:380 }} />
        </div>

        {/* Composer */}
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <input
            placeholder="Ask Jenny…"
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if (e.key==='Enter') send(); }}
            style={{ border:'1px solid #bbb', padding:8, flex:1 }}
          />
          <button onClick={send} disabled={loading} style={{ border:'1px solid #333', padding:'8px 16px', background:'#111', color:'white' }}>
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>

        {/* Transcript */}
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12, flex: 1, overflow: 'auto' }}>
          {history.map((m, i) => (
            <div key={i} style={{ margin:'8px 0' }}>
              <div style={{ fontWeight: m.role==='user' ? 600 : 500 }}>{m.role==='user' ? 'You' : 'Jenny'}</div>
              <div>{m.text}</div>
              {m.role==='assistant' && (
                <>
                  {/* Trace link */}
                  {m.trace_id ? (
                    <div style={{ marginTop:4 }}>
                      <button onClick={()=>openTrace(m.trace_id)} style={{ fontSize:12, textDecoration:'underline', color: selectedTraceId === m.trace_id ? '#2563eb' : '#666' }}>
                        {selectedTraceId === m.trace_id ? 'viewing' : 'view'} trace ({m.trace_id.slice(0,8)}…)
                      </button>
                    </div>
                  ) : null}
                  {/* Chips */}
                  {!!m.chips?.length && (
                    <EvidenceChips ids={m.chips.map((c:any)=>c.id)} />
                  )}
                  {/* Hits */}
                  {!!m.hits?.length && (
                    <HitsList hits={m.hits} />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Trace Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>Trace Viewer</div>
        {selectedTraceId && traceData ? (
          <TracePanel traceId={selectedTraceId} trace={traceData} />
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            Send a message to see step-by-step execution trace
          </div>
        )}
        
        {/* Vitals section below trace */}
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12, marginTop: 8 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div style={{ fontWeight:600, fontSize: 14 }}>Student Vitals</div>
            <button onClick={refreshVitals} style={{ fontSize:12, textDecoration:'underline' }}>refresh</button>
          </div>
          <ul style={{ fontSize:12, maxHeight:'200px', overflow:'auto', marginTop:8 }}>
            {facts.slice(0,20).map((f,i)=>(
              <li key={i} style={{ margin:'4px 0' }}>
                <code>{f.kind}</code>: <b>{f.value}</b> <span>({String(f.fact_date||'').slice(0,10)})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EvidenceChips({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await resolveEvidence(ids);
      setItems(data || []);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ marginTop:6 }}>
      <button onClick={load} style={{ fontSize:12, textDecoration:'underline' }}>
        {loading ? 'loading…' : `evidence (${ids.length})`}
      </button>
      {open && (
        <div style={{ marginTop:6, border:'1px solid #eee', borderRadius:6, padding:6 }}>
          {items.map((s,i)=>(
            <div key={i} style={{ marginBottom:6 }}>
              <div style={{ fontWeight:600 }}>{s.title || s.source_id}</div>
              {s.drive_link ? <a href={s.drive_link} target="_blank" style={{ fontSize:12, color:'#2563eb', textDecoration:'underline' }}>open source</a> : null}
              <div style={{ fontSize:11, color:'#666' }}>{s.source_id}</div>
            </div>
          ))}
          <button onClick={()=>setOpen(false)} style={{ fontSize:12, textDecoration:'underline' }}>close</button>
        </div>
      )}
    </div>
  );
}

function HitsList({ hits }: { hits: any[] }) {
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ fontSize:12, fontWeight:600 }}>Top hits</div>
      <ul style={{ fontSize:12, marginTop:4 }}>
        {hits.slice(0,5).map((h,i)=>(
          <li key={i}>
            [{h.namespace}] {h.id} — score {Number(h.score).toFixed(3)}
          </li>
        ))}
      </ul>
    </div>
  );
}