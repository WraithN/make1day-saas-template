import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { answerQuestion } from "@/lib/rag";
import {
  getCurrentUser,
  getCurrentSubscription,
  isSubscribed,
} from "@/lib/subscriptions";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(1).max(1000),
  provider: z.string().max(60).optional(),
});

/**
 * A query runs a real LLM call, so it is limited to paying accounts:
 * demo session → signed-in user → active subscription.
 *
 * The anonymous preview/trial quota deliberately does NOT apply here (see
 * lib/paywall.ts): content and paid features are never covered by the
 * free trial, so an anonymous visitor gets 401 rather than a free pass.
 */
async function authorizeQuery(): Promise<NextResponse | null> {
  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  if (isDemoMode() && demoCookie) return null;

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Supabase is not configured → there is no user session to read.
    user = null;
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sub: Awaited<ReturnType<typeof getCurrentSubscription>> = null;
  try {
    sub = await getCurrentSubscription();
  } catch {
    sub = null;
  }
  if (!isSubscribed(sub)) {
    return NextResponse.json(
      { error: "Subscription required to use the RAG query API." },
      { status: 402 },
    );
  }

  return null;
}

/** POST /api/rag/query — retrieve context, then answer with citations. */
export async function POST(req: Request) {
  const denied = await authorizeQuery();
  if (denied) return denied;

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
