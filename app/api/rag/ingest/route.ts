import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestDocumentAsync, listDocuments } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(200_000),
});

/** POST /api/rag/ingest — split + index a document. */
export async function POST(req: Request) {
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
  return NextResponse.json({ documents: listDocuments() });
}
