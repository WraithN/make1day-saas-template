import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser, getCurrentSubscription, isSubscribed } from "@/lib/subscriptions";
import { streamChatChunks, hasAiProviderKey } from "@/lib/ai";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { consumeAiUsage } from "@/lib/ai-usage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function mockReply(message: string): string {
  return (
    `Got it — you asked: "${message.slice(0, 120)}". ` +
    `This is ShipKit's demo reply (no AI key is configured). ` +
    `Wire up OPENAI_API_KEY (or any OpenAI-compatible provider) in .env.local ` +
    `and this endpoint will stream a real model response instead.`
  );
}

export async function POST(req: Request) {
  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  const demo = isDemoMode() && demoCookie;

  // The user the quota is charged to (demo mode never spends quota).
  let quotaUserId: string | null = null;

  if (!demo) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sub = await getCurrentSubscription();
    if (!isSubscribed(sub)) {
      return NextResponse.json(
        { error: "Subscription required to use the AI feature." },
        { status: 402 },
      );
    }
    quotaUserId = user.id;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({
      message: z.string().min(1).max(2000),
      provider: z.string().min(1).max(40).optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  // Per-user daily quota. Charged once the request is known to be well formed,
  // before the model is called, so an exhausted budget never reaches the LLM.
  let quota: { limit: number; used: number; remaining: number } | null = null;
  if (quotaUserId) {
    const state = await consumeAiUsage(quotaUserId);
    quota = { limit: state.limit, used: state.used, remaining: state.remaining };
    if (!state.allowed) {
      // The UTC day bucket flips at 00:00 UTC tomorrow, not at 00:00 today.
      // Retry-After must be the real number of seconds left, otherwise clients
      // sleep a full day even when the reset is a few minutes away.
      const resetMs = Date.parse(`${state.day}T00:00:00.000Z`) + 86_400_000;
      const retryAfter = Math.max(
        1,
        Math.ceil((resetMs - Date.now()) / 1000),
      );
      return NextResponse.json(
        {
          error: `You have reached your daily AI limit (${state.limit} messages per day). It resets at 00:00 UTC.`,
          code: "ai_quota_exceeded",
          limit: state.limit,
          used: state.used,
          remaining: 0,
          resetAt: new Date(resetMs).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-AI-Quota-Limit": String(state.limit),
            "X-AI-Quota-Used": String(state.used),
            "X-AI-Quota-Remaining": "0",
            "X-AI-Quota-Reset": new Date(resetMs).toISOString(),
            "Retry-After": String(retryAfter),
          },
        },
      );
    }
  }

  const encoder = new TextEncoder();
  const messages = [
    {
      role: "system" as const,
      content:
        "You are ShipKit's demo assistant. You help founders plan and ship AI SaaS products. Be concise and concrete.",
    },
    { role: "user" as const, content: parsed.data.message },
  ];

  // A provider with no API key keeps the out-of-the-box demo reply. A provider
  // that HAS a key but then fails must never be disguised as a normal answer.
  const configured = hasAiProviderKey(parsed.data.provider);

  const stream = new ReadableStream({
    async start(controller) {
      if (!configured) {
        controller.enqueue(encoder.encode(mockReply(parsed.data.message)));
        controller.close();
        return;
      }
      try {
        for await (const chunk of streamChatChunks(parsed.data.provider, messages)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        // Log the real upstream failure server-side, but never leak provider
        // details (keys, hosts, internals) to the browser.
        logger.error("AI provider stream failed", {
          provider: parsed.data.provider ?? "(default)",
          err: (err as Error).message,
        });
        controller.enqueue(
          encoder.encode(
            "\n[AI provider error] The AI provider could not complete this request. " +
              "Check the server logs for details.",
          ),
        );
      }
      controller.close();
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
  };
  if (quota) {
    headers["X-AI-Quota-Limit"] = String(quota.limit);
    headers["X-AI-Quota-Used"] = String(quota.used);
    headers["X-AI-Quota-Remaining"] = String(quota.remaining);
  }

  return new NextResponse(stream, { headers });
}
