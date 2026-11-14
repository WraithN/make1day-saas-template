// Edge-safe configuration surface.
//
// middleware.ts runs on the Edge runtime and must not import lib/env.ts (the
// server config module knows about fs, node:crypto and server-only secrets -
// pulling it into an edge bundle is exactly how "works in dev, 500 in prod"
// bugs are born). This file is the ONE place edge code reads process.env:
// every variable is either NEXT_PUBLIC_* (inlined into any bundle by design)
// or a string toggle middleware genuinely needs to route requests.
//
// Adding a new edge-read variable here? It must be (a) string-only, (b)
// documented in .env.example, and (c) covered by scripts/launch-check.mjs.
const raw = (name: string): string => process.env[name] ?? "";

/** Site URL exactly as configured - empty when unset (callers gate on it;
 *  the localhost default belongs to the server config, not to canonical
 *  redirects, which must never 301 to a dev host). */
export const publicSiteUrl = (): string => raw("NEXT_PUBLIC_SITE_URL");

/** Video-workflow surfaces are hidden on stores that sell the module as
 *  source (SHOW_VIDEO_STUDIO=false); customer builds default to visible. */
export const showVideoStudio = (): boolean =>
  raw("SHOW_VIDEO_STUDIO").toLowerCase() !== "false";

/** Same switch for the demo chat/RAG surfaces (SHOW_AI_SURFACES=false). */
export const showAiSurfaces = (): boolean =>
  raw("SHOW_AI_SURFACES").toLowerCase() !== "false";

/** Operator emails for role-gated /admin access (comma list). */
export const adminEmails = (): string[] =>
  raw("ADMIN_EMAILS")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Supabase browser-config pair (NEXT_PUBLIC by design - anon is public). */
export const supabaseUrl = (): string => raw("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = (): string => raw("NEXT_PUBLIC_SUPABASE_ANON_KEY");

/** Product scope key for plans/licenses; "default" keeps single-product
 *  installs working without configuration. */
export const productId = (): string => raw("PRODUCT_ID").trim() || "default";
