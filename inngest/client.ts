import { Inngest } from "inngest";

// One Inngest client for the whole app (https://www.inngest.com/docs).
// Local development: `npm run inngest:dev` starts the Inngest Dev Server,
// production: deploy and point your Inngest project at /api/inngest.
export const inngest = new Inngest({
  id: (process.env.INNGEST_APP_ID?.trim() || "app").replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
});
