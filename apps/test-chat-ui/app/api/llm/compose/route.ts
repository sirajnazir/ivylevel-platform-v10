import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    const { model, messages, temperature, traceId } = await req.json();

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: temperature ?? 0.6
    });

    const text = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      text,
      model,
      usage: completion.usage,
      traceId
    });
  } catch (e: any) {
    console.error("LLM compose error:", e);
    return NextResponse.json(
      { error: e.message || String(e) },
      { status: 500 }
    );
  }
}
