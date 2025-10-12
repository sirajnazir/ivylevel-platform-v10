"use client";

import { useState } from "react";

/**
 * Jenny Thin UI v1.2 - Chat + Trace + Export
 *
 * Single-file UI for testing v10.5.2 unified pipeline:
 * - Category 1 (Facts-First SQL) - ENHANCED with full v10.5.2 coverage
 * - Category 2 (KB/RAG Coaching)
 * - Category 3 (Fine-Tuned LLM/EQ)
 * - Humanizer v2.1 integration
 *
 * Features:
 * - Clean chat interface hitting /agent/chat/gpt5
 * - Toggleable trace panel showing route, model, humanizer flags, KB hits
 * - Per-turn trace export (JSON download)
 * - Session-wide trace export (all turns)
 * - Quick-pick chips for testing all 3 categories
 * - v10.5.2: Comprehensive Cat-1 prompts (IvyScore, College List, GamePlan, SAT, etc.)
 */

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  trace?: TraceData;
}

interface TraceData {
  route?: string;
  model?: string;
  modelBadge?: string;
  traceId?: string;
  latency?: number;
  humanizer?: {
    applied?: {
      warmth?: boolean;
      action?: boolean;
      personal_ref?: boolean;
      proof_presenter?: boolean;
      safety_scrub?: boolean;
    };
    plan?: {
      phrase_source?: "eq" | "fallback";
      cadence?: string;
    };
  };
  hits?: Array<{
    text: string;
    source: string;
    score: number;
  }>;
  vitals?: any;
  facts?: string;
  rawDebug?: any;
}

interface ExportEnvelope {
  request: {
    endpoint: string;
    body: any;
    headers: Record<string, string>;
  };
  response: {
    answer: string;
    hits?: any[];
    vitals?: any;
    route?: string;
    humanizer?: any;
    model?: string;
    trace_id?: string;
    rawDebug?: any;
  };
  timings: {
    start: string;
    end: string;
    duration_ms: number;
  };
  env: {
    userAgent: string;
    origin: string;
    uiVersion: string;
  };
  ui_notes: {
    route?: string;
    model?: string;
    badge?: string;
    humanizer_warmth?: boolean;
    humanizer_action?: boolean;
    humanizer_proof?: boolean;
    humanizer_scrub?: boolean;
    humanizer_source?: string;
    hits_count?: number;
  };
}

// ============================================================================
// Test Prompts (Quick-Pick Chips)
// v10.5.2: Enhanced Cat-1 with full coverage of restored fact types
// ============================================================================

const TEST_PROMPTS = {
  // Category 1: Facts-First SQL (v10.5.2 Complete Coverage)
  cat1: {
    // Awards
    awards: [
      "What awards did I win?",
      "Show me my initial awards list",
      "What's my final awards list?",
      "Did I win any national awards?",
    ],
    // IvyScore & Readiness
    ivyscore: [
      "What's my IvyScore?",
      "Show me my readiness score",
      "What are my top priorities?",
      "Am I ready for top colleges?",
    ],
    // College List & Decisions
    college: [
      "Show me my college list",
      "Which colleges did I apply to?",
      "What schools am I considering?",
      "Which college am I attending?",
      "Did I get into MIT?",
      "Show me my reach schools",
    ],
    // GamePlan & Timeline
    gameplan: [
      "What's my game plan?",
      "Show me my college timeline",
      "What are my upcoming deadlines?",
      "What should I work on next?",
    ],
    // Academics (GPA, Transcript, Courses)
    academics: [
      "What's my latest GPA?",
      "Show me my transcript",
      "What courses am I taking?",
      "What's my current GPA?",
      "Show me my final transcript",
    ],
    // Activities & ECs
    activities: [
      "Show me my final activities list",
      "What extracurriculars do I have?",
      "What activities did I do?",
      "Show me my initial ECs",
    ],
    // Testing (SAT/ACT)
    testing: [
      "What was my first SAT score?",
      "Show me my SAT trajectory",
      "What are my test scores?",
      "Did my SAT improve over time?",
    ],
    // Summer Programs
    programs: [
      "What summer programs did I apply to?",
      "Show me my program decisions",
      "Which programs did I get into?",
      "What's my final programs list?",
    ],
  },

  // Category 2: KB/RAG Coaching (Strategy & Knowledge)
  cat2: [
    "Tell me about the rejection bridge technique",
    "How do I build a spike?",
    "What's the 168-hour framework?",
    "Explain the evidence ledger approach",
    "How do I write a compelling personal statement?",
    "What makes a strong Why Us essay?",
  ],

  // Category 3: Fine-Tuned LLM/EQ (Emotional Support)
  cat3: [
    "I got rejected from Stanford and feel really behind",
    "I'm struggling with time management this week",
    "I'm worried my ECs aren't impressive enough",
    "How do I stay motivated during app season?",
    "I feel overwhelmed with deadlines",
    "I'm anxious about my college decisions",
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export default function JennyThinUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [studentId, setStudentId] = useState("huda-2025");
  const [endpoint, setEndpoint] = useState("/agent/chat/gpt5");
  const [showTrace, setShowTrace] = useState(true);
  const [loading, setLoading] = useState(false);

  // Send message to backend
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const startTime = Date.now();

    try {
      const res = await fetch(`http://localhost:8787${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          student_id: studentId,
        }),
      });

      const endTime = Date.now();
      const data = await res.json();

      const trace: TraceData = {
        route: data.debug?.route || data.intent?.category,
        model: data.model || data.debug?.model,
        modelBadge: data.debug?.model?.includes("ft:") ? "FT" : "GPT",
        traceId: data.trace_id || data.debug?.trace_id,
        latency: endTime - startTime,
        humanizer: data.debug?.humanizer,
        hits: data.hits || data.debug?.hits,
        vitals: data.vitals || data.debug?.vitals,
        facts: data.debug?.facts || data.debug?.sqlBlock,
        rawDebug: data.debug,
      };

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || data.response || "No response",
        timestamp: new Date(),
        trace,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Export single trace as JSON
  const exportTrace = (msg: Message) => {
    if (!msg.trace) return;

    const envelope: ExportEnvelope = {
      request: {
        endpoint,
        body: {
          message: messages.find((m) => m.role === "user" && m.timestamp < msg.timestamp)?.content,
          student_id: studentId,
        },
        headers: { "Content-Type": "application/json" },
      },
      response: {
        answer: msg.content,
        hits: msg.trace.hits,
        vitals: msg.trace.vitals,
        route: msg.trace.route,
        humanizer: msg.trace.humanizer,
        model: msg.trace.model,
        trace_id: msg.trace.traceId,
        rawDebug: msg.trace.rawDebug,
      },
      timings: {
        start: msg.timestamp.toISOString(),
        end: new Date(msg.timestamp.getTime() + (msg.trace.latency || 0)).toISOString(),
        duration_ms: msg.trace.latency || 0,
      },
      env: {
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        uiVersion: "v1.2",
      },
      ui_notes: {
        route: msg.trace.route,
        model: msg.trace.model,
        badge: msg.trace.modelBadge,
        humanizer_warmth: msg.trace.humanizer?.applied?.warmth,
        humanizer_action: msg.trace.humanizer?.applied?.action,
        humanizer_proof: msg.trace.humanizer?.applied?.proof_presenter,
        humanizer_scrub: msg.trace.humanizer?.applied?.safety_scrub,
        humanizer_source: msg.trace.humanizer?.plan?.phrase_source,
        hits_count: msg.trace.hits?.length || 0,
      },
    };

    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jenny-trace-${msg.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export full session as JSON
  const exportSession = () => {
    const session = {
      session_id: `session-${Date.now()}`,
      student_id: studentId,
      endpoint,
      ui_version: "v1.2",
      turns: messages
        .filter((m) => m.role === "assistant" && m.trace)
        .map((msg) => {
          const userMsg = messages.find((m) => m.role === "user" && m.timestamp < msg.timestamp);
          return {
            user_message: userMsg?.content,
            assistant_message: msg.content,
            trace: msg.trace,
            timestamp: msg.timestamp.toISOString(),
          };
        }),
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jenny-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel: Chat */}
      <div className="flex flex-col w-2/3 border-r border-gray-200">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-2xl font-bold text-gray-900">Jenny Thin UI v1.2</h1>
          <p className="text-sm text-gray-600">Chat + Trace + Export • v10.5.2 Complete Cat-1 Coverage</p>

          {/* Config */}
          <div className="flex gap-4 mt-3">
            <div className="flex-1">
              <label className="text-xs text-gray-600">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-600">Endpoint</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => setShowTrace(!showTrace)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                {showTrace ? "Hide" : "Show"} Trace
              </button>
              <button
                onClick={exportSession}
                disabled={messages.length === 0}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Export Session
              </button>
            </div>
          </div>

          {/* Quick-Pick Chips - v10.5.2 Enhanced Cat-1 Coverage */}
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
            {/* Category 1: Facts-First SQL (Expanded) */}
            <div>
              <span className="text-xs font-bold text-purple-900">
                Cat-1 (SQL Facts) - v10.5.2 Complete Coverage:
              </span>
              <div className="mt-2 space-y-2">
                {/* Awards */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">Awards:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.awards.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* IvyScore & Readiness */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">IvyScore:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.ivyscore.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* College List */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">College List:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.college.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* GamePlan */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">GamePlan:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.gameplan.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Academics */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">Academics:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.academics.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activities */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">Activities:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.activities.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Testing */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">Testing (SAT):</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.testing.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summer Programs */}
                <div>
                  <span className="text-xs font-semibold text-purple-700">Programs:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TEST_PROMPTS.cat1.programs.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs hover:bg-purple-100 disabled:opacity-50"
                      >
                        {prompt.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Category 2: KB/RAG */}
            <div>
              <span className="text-xs font-bold text-blue-900">Cat-2 (KB/RAG):</span>
              <div className="flex gap-2 mt-1 flex-wrap">
                {TEST_PROMPTS.cat2.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 disabled:opacity-50"
                  >
                    {prompt.slice(0, 25)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Category 3: FT/EQ */}
            <div>
              <span className="text-xs font-bold text-green-900">Cat-3 (FT/EQ):</span>
              <div className="flex gap-2 mt-1 flex-wrap">
                {TEST_PROMPTS.cat3.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200 disabled:opacity-50"
                  >
                    {prompt.slice(0, 25)}...
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg font-semibold">Welcome to Jenny v10.5.2</p>
              <p className="text-sm mt-2">
                Click a quick-pick chip above or type a message to test the unified pipeline.
              </p>
              <p className="text-xs mt-3 text-purple-600 font-semibold">
                ✨ NEW: Complete Cat-1 coverage (Awards, IvyScore, College List, GamePlan, SAT, etc.)
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                {msg.role === "assistant" && msg.trace && (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex gap-2 items-center text-xs text-gray-600">
                    <span className="font-mono bg-gray-100 px-1 rounded">
                      {msg.trace.route}
                    </span>
                    <span className="font-mono bg-gray-100 px-1 rounded">
                      {msg.trace.modelBadge}
                    </span>
                    <span className="font-mono bg-gray-100 px-1 rounded">
                      {msg.trace.latency}ms
                    </span>
                    <button
                      onClick={() => exportTrace(msg)}
                      className="ml-auto px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Export Trace
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="text-sm text-gray-600">Jenny is thinking...</div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel: Trace */}
      {showTrace && (
        <div className="w-1/3 bg-white overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Pipeline Trace</h2>
            <p className="text-xs text-gray-600">Real-time debug info for last response</p>
          </div>

          {messages.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              No messages yet. Send a message to see trace data.
            </div>
          ) : (
            (() => {
              const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
              if (!lastAssistant?.trace) {
                return (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    No trace data available.
                  </div>
                );
              }

              const trace = lastAssistant.trace;

              return (
                <div className="p-4 space-y-4 text-sm">
                  {/* Route & Model */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Pipeline Info</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Route:</span>
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {trace.route || "unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {trace.model?.slice(0, 30) || "unknown"}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Badge:</span>
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {trace.modelBadge}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trace ID:</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {trace.traceId || "none"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Latency:</span>
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {trace.latency}ms
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Humanizer v2.1 */}
                  {trace.humanizer && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Humanizer v2.1</h3>
                      <div className="space-y-1">
                        <div className="flex gap-2 flex-wrap">
                          {trace.humanizer.applied?.warmth && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                              warmth
                            </span>
                          )}
                          {trace.humanizer.applied?.action && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                              action
                            </span>
                          )}
                          {trace.humanizer.applied?.proof_presenter && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                              proof
                            </span>
                          )}
                          {trace.humanizer.applied?.safety_scrub && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                              scrub
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-gray-600">Phrase Source:</span>
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {trace.humanizer.plan?.phrase_source || "fallback"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cadence:</span>
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {trace.humanizer.plan?.cadence || "standard"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KB Hits */}
                  {trace.hits && trace.hits.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        KB Hits ({trace.hits.length})
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {trace.hits.map((hit, i) => (
                          <div key={i} className="bg-gray-50 p-2 rounded border border-gray-200">
                            <div className="text-xs text-gray-600 mb-1">
                              <span className="font-semibold">{hit.source}</span> • score:{" "}
                              {hit.score?.toFixed(3)}
                            </div>
                            <div className="text-xs text-gray-800 line-clamp-3">{hit.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Facts Block (Cat-1) */}
                  {trace.facts && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Facts (Cat-1)</h3>
                      <pre className="bg-gray-50 p-2 rounded border border-gray-200 text-xs overflow-x-auto">
                        {trace.facts}
                      </pre>
                    </div>
                  )}

                  {/* Vitals */}
                  {trace.vitals && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Vitals</h3>
                      <pre className="bg-gray-50 p-2 rounded border border-gray-200 text-xs overflow-x-auto max-h-48">
                        {JSON.stringify(trace.vitals, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Raw Debug */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Raw Debug JSON</h3>
                    <pre className="bg-gray-50 p-2 rounded border border-gray-200 text-xs overflow-x-auto max-h-96">
                      {JSON.stringify(trace.rawDebug, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
