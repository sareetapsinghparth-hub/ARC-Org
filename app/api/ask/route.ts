import { NextResponse } from "next/server";

const backendUrl = (process.env.REASONLENS_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export async function POST(request: Request) {
  let payload: { question?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Please send a valid JSON request." }, { status: 400 });
  }

  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (!question) {
    return NextResponse.json({ detail: "Enter a question to get started." }, { status: 400 });
  }

  try {
    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, top_k: 5 }),
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof body.detail === "string" ? body.detail : "The ReasonLens backend could not answer this question.";
      return NextResponse.json({ detail }, { status: response.status });
    }
    return NextResponse.json(body);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { detail: timedOut ? "The answer took too long. Please try again." : "Could not reach the ReasonLens backend. Start the FastAPI service and try again." },
      { status: timedOut ? 504 : 503 },
    );
  }
}
