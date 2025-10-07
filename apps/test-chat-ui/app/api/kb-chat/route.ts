/**
 * KB-powered Chat API Route (v1.2)
 * Retrieves evidence from Pinecone and generates LLM response with citations
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { retrieve, truncate, type Evidence } from "@/lib/retrieval";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userMessage,
      filters,
      namespaces,
      topK = 6,
    } = body;

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    console.log(`\n[KB Chat] New query: "${userMessage}"`);

    // 1) Retrieve evidence from KB
    const evidence = await retrieve({
      query: userMessage,
      filters,
      namespaces,
      topK,
    });

    // 2) Safety rails: check retrieval quality
    const topScore = evidence[0]?.score ?? 0;
    const lowConfidence = topScore < 0.40;
    const noHits = evidence.length === 0;

    console.log(`[KB Chat] Evidence count: ${evidence.length}, top score: ${topScore.toFixed(3)}`);

    if (noHits) {
      return NextResponse.json({
        answer: "⚠️ **No grounded evidence found.** I can provide general advice, but I recommend:\n" +
                "• Verify the query is related to coaching sessions, frameworks, or micro-interactions.\n" +
                "• Try refining keywords or filters (e.g., phase, week, chip type).\n\n" +
                "What would you like to know more specifically?",
        evidence: [],
        meta: { noHits: true, topScore: 0 },
      });
    }

    // 3) Build context for LLM
    const evidenceContext = evidence
      .map(
        (e) =>
          `[#${e.rank}] **${e.chip_id}** (${e.namespace}, ${e.type}, W${e.week || "?"}, ${e.phase || "?"}) :: ${truncate(e.content || "", 450)}`
      )
      .join("\n\n");

    // 4) Compose prompt with citations
    const systemPrompt = `You are Jenny (digital twin). Use "proof-over-prose" methodology:
- **Always cite chips** with [chip_id] and namespace when referencing specific evidence.
- If confidence is low (score < 0.40), add a disclaimer and ask a clarifying question.
- **Never invent facts**; label inferences as hypotheses.
- Be concise, actionable, and empathetic.
- Use markdown formatting for readability.`;

    const userPrompt = `User query: "${userMessage}"

${lowConfidence ? "⚠️ **Low-confidence match detected.** Treat evidence as tentative. Ask clarifying questions.\n\n" : ""}Top evidence (cite chip_id in your answer):
${evidenceContext}

Instructions:
- Answer the user's question using the evidence above.
- Cite relevant chips with [chip_id @ namespace].
- If evidence is incomplete, suggest refinements or clarifying questions.
- Keep the answer under 400 words.`;

    // 5) Generate LLM response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const answer = completion.choices[0].message.content || "No response generated.";

    console.log(`[KB Chat] Response generated (${answer.length} chars)`);

    // 6) Log for QA
    logQueryForQA({
      query: userMessage,
      namespaces: evidence.map(e => e.namespace),
      filters,
      top1_chip: evidence[0]?.chip_id,
      top1_score: topScore,
      evidence_count: evidence.length,
    });

    return NextResponse.json({
      answer,
      evidence,
      meta: {
        topScore,
        lowConfidence,
        evidenceCount: evidence.length,
      },
    });

  } catch (error: any) {
    console.error("[KB Chat] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Log queries for QA analysis
 */
function logQueryForQA(data: {
  query: string;
  namespaces: string[];
  filters?: any;
  top1_chip?: string;
  top1_score: number;
  evidence_count: number;
}) {
  // In production, send to logging service (e.g., Datadog, CloudWatch)
  console.log(`[QA Log]`, JSON.stringify(data));
}
