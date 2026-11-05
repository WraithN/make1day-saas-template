-- RAG hybrid retrieval: pgvector + Postgres full-text + RRF fusion.
--
-- This migration IS wired to the TypeScript side (lib/rag/vector.ts):
--   RAG_VECTOR_STORE=supabase  → ingest upserts rag_documents / rag_chunks
--                               with 1536-dim embeddings;
--                             → query calls match_rag_chunks_hybrid().
-- Run it in the Supabase SQL editor. Requires:
--   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS)
--   EMBEDDING_DIMENSIONS=1536 (must match the vector column below)
-- Without these, RAG uses the in-memory vector cache + BM25 automatically.
--
-- NOTE: Postgres 'simple' text search does not segment Chinese. The TS side
-- therefore also runs CJK-aware BM25 over the returned passages and fuses the
-- rank lists again — see lib/rag/hybrid.ts.

create extension if not exists vector;

-- Text ids: the TS store generates ids like "doc-xxxx#0". Using them directly
-- keeps the memory store and pgvector rows interchangeable for RRF fusion.
create table if not exists public.rag_documents (
  id text primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  title text not null,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.rag_chunks (
  id text primary key,
  doc_id text not null references public.rag_documents (id) on delete cascade,
  chunk_index integer not null default 0,
  title text not null default '',
  content text not null,
  embedding vector(1536),
  -- Lexical branch. 'simple' is language-agnostic and safe for mixed EN/ZH.
  tsv tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists rag_chunks_doc_id_idx
  on public.rag_chunks (doc_id);
create index if not exists rag_chunks_tsv_idx
  on public.rag_chunks using gin (tsv);
create index if not exists rag_chunks_embedding_idx
  on public.rag_chunks using hnsw (embedding vector_cosine_ops);

alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;

-- Service-role writes create owner_id = null rows. Owners can read their own
-- documents; the anon/authenticated roles cannot read the shared demo corpus
-- directly (the app reads it through server-side service-role calls only).
drop policy if exists "rag_documents_owner" on public.rag_documents;
create policy "rag_documents_owner" on public.rag_documents
  for all using (owner_id is null or auth.uid() = owner_id)
  with check (owner_id is null or auth.uid() = owner_id);

drop policy if exists "rag_chunks_owner" on public.rag_chunks;
create policy "rag_chunks_owner" on public.rag_chunks
  for all using (
    exists (
      select 1 from public.rag_documents d
      where d.id = doc_id and (d.owner_id is null or d.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.rag_documents d
      where d.id = doc_id and (d.owner_id is null or d.owner_id = auth.uid())
    )
  );

-- ── Hybrid search ──────────────────────────────────────────────────────────
-- Each branch takes its own top-N by RANK (not by raw score), then RRF fuses:
--   score = Σ 1 / (60 + rank)
-- A row found by both lexical and semantic search outranks a row found by one.
-- query_embedding may be NULL (no embedding key) → lexical-only results.
create or replace function public.match_rag_chunks_hybrid (
  query_embedding vector(1536),
  query_text text,
  candidate_count int default 20,
  match_count int default 4
)
returns table (
  id text,
  doc_id text,
  title text,
  content text,
  chunk_index integer,
  score float,
  from_lexical boolean,
  from_semantic boolean
)
language sql stable
as $$
  with q as (
    select websearch_to_tsquery('simple', coalesce(query_text, '')) as tsq
  ),
  lexical as (
    select c.id,
           row_number() over (order by ts_rank_cd(c.tsv, q.tsq) desc, c.id) as rank
    from public.rag_chunks c cross join q
    where c.tsv @@ q.tsq
    order by ts_rank_cd(c.tsv, q.tsq) desc, c.id
    limit candidate_count
  ),
  semantic as (
    select c.id,
           row_number() over (order by c.embedding <=> query_embedding, c.id) as rank
    from public.rag_chunks c
    where query_embedding is not null and c.embedding is not null
    order by c.embedding <=> query_embedding, c.id
    limit candidate_count
  ),
  branches as (
    select id, rank, 'lexical'::text as branch from lexical
    union all
    select id, rank, 'semantic'::text as branch from semantic
  ),
  fused as (
    select id,
           sum(1.0 / (60 + rank)) as rrf_score,
           bool_or(branch = 'lexical') as from_lexical,
           bool_or(branch = 'semantic') as from_semantic
    from branches
    group by id
  )
  select c.id,
         c.doc_id,
         c.title,
         c.content,
         c.chunk_index,
         f.rrf_score::float as score,
         f.from_lexical,
         f.from_semantic
  from fused f
  join public.rag_chunks c on c.id = f.id
  order by f.rrf_score desc
  limit match_count;
$$;

-- Backwards-compatible pure-vector helper (older docs referenced it).
create or replace function public.match_rag_chunks (
  query_embedding vector(1536),
  match_count int default 4
)
returns table (
  id text,
  doc_id text,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select c.id,
         c.doc_id,
         c.title,
         c.content,
         (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.rag_chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
