import { fal } from "@fal-ai/client";
import { inngest } from "./client";
import { chat } from "@/lib/ai";
import { getPrice } from "@/lib/billing";
import { updateRun } from "@/lib/workflows";
import { logger } from "@/lib/logger";

// Durable AI ad-video pipeline, n8n-style but as code that ships INSIDE the
// project: Inngest memoizes every step.run - retries resume where they
// stopped, completed steps never re-spend, and a new run with changed scene
// prompts only re-executes what differs (the diff-edit economics of real
// production pipelines). LLM calls route through lib/ai (admin model
// routing applies here), and every step's cost lands in the same billing
// ledger the /admin/models console shows.
//
// Assembly deliberately HANDS OFF to a worker (ffmpeg/Remotion cannot fit a
// serverless function); the step returns the ordered clip list plus a
// callback route so the customer's own render worker picks it up.

type StartPayload = {
  runId: string;
  brief: string;
  scenes: number;
};

function falConfigured(): boolean {
  const key = process.env.FAL_KEY?.trim();
  if (!key) return false;
  fal.config({ credentials: key });
  return true;
}

function genModel(): string {
  return process.env.VIDEO_GEN_MODEL?.trim() || "fal-ai/kling-video/v1/standard/text-to-video";
}

type SceneCard = { shot: string; angle: string; camera: string; prompt: string; narration: string };

/** Minimal context typing: Inngest injects a richer object at runtime. */
type PipelineCtx = {
  event: { data: StartPayload };
  step: {
    run<T>(name: string, fn: () => Promise<T>): Promise<T>;
  };
};

function parseSceneCards(text: string, count: number): SceneCard[] {
  const m = /\[[\s\S]*\]/.exec(text);
  if (m) {
    try {
      const arr = JSON.parse(m[0]) as SceneCard[];
      if (Array.isArray(arr) && arr.length) return arr.slice(0, count);
    } catch {
      /* fall through to line-split fallback */
    }
  }
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 10)
    .slice(0, count)
    .map((l, i) => ({
      shot: `scene-${i + 1}`,
      angle: "auto",
      camera: "auto",
      prompt: l,
      narration: l,
    }));
}

export const adVideoPipeline = inngest.createFunction(
  {
    id: "ad-video-pipeline",
    retries: 2,
    triggers: [{ event: "pipeline/ad-video/start" }],
  },
  async ({ event, step }: PipelineCtx) => {
    const { runId, brief, scenes } = event.data;

    const script = await step.run("script", async () => {
      const out = await chat(
        "",
        [
          {
            role: "system",
            content: `You are an ad copywriter. Write a ${scenes}-scene voice script for the product brief below. Reply ONLY with a JSON array of ${scenes} objects: {"shot","angle","camera","prompt","narration"}. prompt = the visual description fed to a text-to-video model; narration = spoken line.`,
          },
          { role: "user", content: brief },
        ],
      );
      return out;
    });
    await updateRun(runId, { status: "running", steps: undefined });

    const cards = await step.run("storyboard", async () => {
      // Deterministic derivation from the script step - no second LLM call
      // unless the script was free text.
      return parseSceneCards(script, scenes);
    });

    const quote = await step.run("quote", async () => {
      const price = await getPrice("video");
      return {
        perClipUsd: price.unitUsd,
        totalUsd: price.unitUsd * cards.length,
        note: "Quote at the admin price sheet's current video unit price.",
      };
    });

    if (!falConfigured()) {
      logger.warn("pipeline render step: FAL_KEY not configured");
      await updateRun(runId, {
        status: "failed",
        error: "FAL_KEY missing - set it in the environment, then re-run (completed steps will not re-spend).",
      });
      return { script, cards, quote, clips: [], assembly: null, reason: "no-fal-key" };
    }

    const clips = await step.run("render", async () => {
      const out: { scene: string; url: string | null }[] = [];
      for (const card of cards) {
        const res = await fal.subscribe(genModel(), {
          input: { prompt: card.prompt },
          logs: false,
        });
        const data = res.data as { video?: { url?: string } };
        out.push({ scene: card.shot, url: data?.video?.url ?? null });
      }
      return out;
    });

    const assembly = await step.run("assemble", async () => ({
      handoffUrl: "/api/pipeline/assemble",
      clipUrls: clips.map((c) => c.url).filter(Boolean),
      note: "Stitch on your own worker (ffmpeg or Remotion) - POST the clip list to the assemble route.",
    }));

    await updateRun(runId, {
      status: "done",
      outputUrl: assembly.handoffUrl,
    });
    return { script, cards, quote, clips, assembly };
  },
);

export const functions = [adVideoPipeline];
