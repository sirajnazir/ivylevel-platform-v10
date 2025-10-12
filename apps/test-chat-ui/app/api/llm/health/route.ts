import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { model } = await req.json();
  try {
    // Optionally call OpenAI with a 1-token echo; here we just return ok=true
    return NextResponse.json({ ok: true, model });
  } catch (e) {
    return NextResponse.json({ ok: false, model, error: String(e) }, { status: 500 });
  }
}
