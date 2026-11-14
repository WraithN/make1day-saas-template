import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser, getCurrentSubscription, isSubscribed } from "@/lib/subscriptions";
import { streamChatChunks, hasAiProviderKey } from "@/lib/ai";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { consumeAiUsage, getAiUsageToday } from "@/lib/ai-usage";
import { screenPrompt, blocked as isBlocked } from "@/lib/moderation";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function mockReply(message: string): string {
  return (
    `Got it — you asked: "${message.slice(0, 120)}". ` +
    `This is make1day.dev's demo reply (no AI key is configured). ` +
    `Wire up OPENAI_API_KEY (or any OpenAI-compatible provider) in .env.local ` +
    `and this endpoint will stream a real model response instead.`
  );
}

export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "ai",
    limit: 60,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  const demo = isDemoMode() && demoCookie;

  // The user the quota is charged to. Demo mode is a zero-config preview and is
  // intentionally NOT quota-limited (the daily-message tests assert this): a
  // demo must always respond. The per-IP rate limit in guardApiWrite still
  // applies, so it is not an open relay. Real, signed-in users are charged.
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

  // Creem Moderation API (mandatory for generation merchants): screen the
  // user-controlled prompt BEFORE quota, queueing or any model call. deny and
  // flag both block; transport failures fail closed with a retryable 503.
  try {
    const screen = await screenPrompt(
      parsed.data.message,
      `ai:${quotaUserId ?? "anon"}`,
    );
    if (isBlocked(screen)) {
      return NextResponse.json(
        {
          error:
            screen.decision === "deny" ? "prompt_rejected" : "prompt_flagged",
          message:
            "This request violates our Acceptable Use Policy (/acceptable-use). Please revise it.",
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "moderation_unavailable" },
      { status: 503 },
    );
  }

  // Per-user daily quota. A well-formed request first hits a READ-ONLY
  // pre-check, so an exhausted budget never reaches the LLM. The unit itself
  // is consumed only once the provider has actually produced output - a
  // gateway that fails on the first byte must not cost the user a message.
  let quota: { limit: number; used: number; remaining: number } | null = null;
  if (quotaUserId) {
    const today = await getAiUsageToday(quotaUserId);
    quota = { limit: today.limit, used: today.used, remaining: today.remaining };
    if (today.remaining <= 0) {
      // The UTC day bucket flips at 00:00 UTC tomorrow, not at 00:00 today.
      // Retry-After must be the real number of seconds left, otherwise clients
      // sleep a full day even when the reset is a few minutes away.
      const resetMs = Date.parse(`${today.day}T00:00:00.000Z`) + 86_400_000;
      const retryAfter = Math.max(
        1,
        Math.ceil((resetMs - Date.now()) / 1000),
      );
      return NextResponse.json(
        {
          error: `You have reached your daily AI limit (${today.limit} messages per day). It resets at 00:00 UTC.`,
          code: "ai_quota_exceeded",
          limit: today.limit,
          used: today.used,
          remaining: 0,
          resetAt: new Date(resetMs).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-AI-Quota-Limit": String(today.limit),
            "X-AI-Quota-Used": String(today.used),
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
        "You are make1day.dev's demo assistant. You help founders plan and ship AI SaaS products. Be concise and concrete.",
    },
    { role: "user" as const, content: parsed.data.message },
  ];

  // A provider with no API key keeps the out-of-the-box demo reply. A provider
  // that HAS a key but then fails must never be disguised as a normal answer:
  // the stream is NDJSON (one JSON event per line), so the client can tell a
  // clean completion from a provider failure and a mid-stream cutoff apart -
  // a bare 200 + prose "error text" in the answer is the worst version.
  const configured = hasAiProviderKey(parsed.data.provider);
  let quotaCharged = false;
  const chargeOnce = async () => {
    if (quotaCharged || !quotaUserId) return;
    quotaCharged = true;
    try {
      // Atomic here too: if a concurrent request grabbed the last slot after
      // our read-only pre-check, let this request finish anyway rather than
      // kill output the user can already see.
      await consumeAiUsage(quotaUserId);
    } catch (err) {
      logger.warn("ai quota charge failed", { err: (err as Error).message });
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      if (!configured) {
        await chargeOnce();
        send({ type: "start" });
        send({ type: "token", text: mockReply(parsed.data.message) });
        send({ type: "done" });
        controller.close();
        return;
      }
      try {
        send({ type: "start" });
        for await (const chunk of streamChatChunks(parsed.data.provider, messages)) {
          await chargeOnce(); // charged from the first real token onward
          send({ type: "token", text: chunk });
        }
        send({ type: "done" });
      } catch (err) {
        // Log the real upstream failure server-side, but never leak provider
        // details (keys, hosts, internals) to the browser. No token reached
        // the client yet => nothing was charged (chargeOnce is a no-op).
        logger.error("AI provider stream failed", {
          provider: parsed.data.provider ?? "(default)",
          err: (err as Error).message,
        });
        send({
          type: "error",
          code: "provider_failed",
          message: "The AI provider could not complete this request.",
        });
      }
      controller.close();
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "X-AI-Protocol": "ndjson-events-v1",
  };
  if (quota) {
    headers["X-AI-Quota-Limit"] = String(quota.limit);
    headers["X-AI-Quota-Used"] = String(quota.used);
    headers["X-AI-Quota-Remaining"] = String(quota.remaining);
  }

  return new NextResponse(stream, { headers });
}
