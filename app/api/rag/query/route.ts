import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(1).max(1000),
  provider: z.string().max(60).optional(),
});

/** POST /api/rag/query — retrieve context, then answer with citations. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a question." }, { status: 400 });
  }
  try {
    const result = await answerQuestion(
      parsed.data.question,
      parsed.data.provider,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("rag query failed", err);
    return NextResponse.json(
      { error: "RAG query failed" },
      { status: 500 },
    );
  }
}
