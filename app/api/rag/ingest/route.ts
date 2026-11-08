import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ingestDocumentAsync, listDocuments } from "@/lib/rag";
import { getCurrentUser } from "@/lib/subscriptions";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(200_000),
});

/**
 * Ingesting writes into the shared index, so it needs an identity: an
 * anonymous visitor must not be able to poison the corpus or fill memory.
 *
 * Allowed: the demo session, an operator (console seeding), or any signed-in
 * user. Everything else → 401.
 */
async function authorizeIngest(): Promise<NextResponse | null> {
  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  if (isDemoMode() && demoCookie) return null;

  // The operator console may seed documents. lib/admin-session.ts is Node-only
  // (node:sqlite), so it is reached through a DYNAMIC import — a static one
  // would drag a Node-only module into the pruned client bundle.
  try {
    const { isOperatorAuthorized } = await import("@/lib/admin-session");
    if (await isOperatorAuthorized()) return null;
  } catch {
    // No operator session store → fall through to the user check.
  }

  try {
    const user = await getCurrentUser();
    if (user) return null;
  } catch {
    // Supabase is not configured → there is no user session to read.
  }

  return NextResponse.json(
    { error: "Sign in to index documents." },
    { status: 401 },
  );
}

/** POST /api/rag/ingest — split + index a document. */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "rag-ingest",
    limit: 20,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const denied = await authorizeIngest();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a title and non-empty text (max 200k chars)." },
      { status: 400 },
    );
  }
  // Await indexing so the document is semantically searchable on the next
  // query (embedding call + optional pgvector upsert).
  const doc = await ingestDocumentAsync(parsed.data.title, parsed.data.text);
  return NextResponse.json({ document: doc, total: listDocuments().length });
}

/** GET /api/rag/ingest — list indexed documents (handy for debugging). */
export async function GET() {
  const denied = await authorizeIngest();
  if (denied) return denied;

  return NextResponse.json({ documents: listDocuments() });
}
