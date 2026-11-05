import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser, getCurrentSubscription, isSubscribed } from "@/lib/subscriptions";
import { streamChat } from "@/lib/ai";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";

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

  const encoder = new TextEncoder();
  let text: string;
  try {
    const messages = [
      {
        role: "system" as const,
        content:
          "You are ShipKit's demo assistant. You help founders plan and ship AI SaaS products. Be concise and concrete.",
      },
      { role: "user" as const, content: parsed.data.message },
    ];
    text = await streamChat(messages, parsed.data.provider);
  } catch {
    // No AI key configured (or provider error): return a friendly mock reply
    // so the dashboard demo still works in preview / demo mode.
    text = mockReply(parsed.data.message);
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
