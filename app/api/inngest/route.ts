import { serve } from "inngest/next";
import { functions } from "@/inngest/functions";
import { inngest } from "@/inngest/client";

export const dynamic = "force-dynamic";

/**
 * The single Inngest endpoint: the platform calls it to execute steps.
 * Nothing else about the app changes - durable pipeline steps are
 * ordinary TypeScript functions living in the repo.
 * Local dev: `npm run inngest:dev` (Inngest Dev Server on :8288).
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
