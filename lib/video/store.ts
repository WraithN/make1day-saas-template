// Dual-backend (Supabase / local SQLite) store for video jobs — mirrors the
// tickets module's pattern so the studio works on any host.

export interface VideoJob {
  id: string;
  user_id: string;
  template_id: string;
  resolution: string;
  aspect: string;
  status: "queued" | "running" | "done" | "failed";
  provider_job_id: string | null;
  status_url: string | null;
  response_url: string | null;
  input_image_url: string;
  source_video_url: string;
  output_url: string | null;
  credits: number;
  consent_at: string;
  error: string | null;
  created_at: string;
}

type Row = Record<string, unknown>;

function mapRow(r: Row): VideoJob {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    template_id: String(r.template_id),
    resolution: String(r.resolution),
    aspect: String(r.aspect ?? "9:16"),
    status: (r.status as VideoJob["status"]) ?? "queued",
    provider_job_id: (r.provider_job_id as string) ?? null,
    status_url: (r.status_url as string) ?? null,
    response_url: (r.response_url as string) ?? null,
    input_image_url: String(r.input_image_url),
    source_video_url: String(r.source_video_url),
    output_url: (r.output_url as string) ?? null,
    credits: Number(r.credits ?? 1),
    consent_at: String(r.consent_at),
    error: (r.error as string) ?? null,
    created_at: String(r.created_at),
  };
}

async function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !role) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, role, { auth: { persistSession: false } });
}

export async function insertJob(
  job: Omit<VideoJob, "created_at"> & { created_at?: string },
): Promise<VideoJob> {
  const sb = await supabase();
  if (sb) {
    const { data } = await sb.from("video_jobs").insert(job).select().single();
    return mapRow(data as Row);
  }
  const { getDb } = await import("@/lib/sqlite");
  const id =
    job.id ||
    (globalThis.crypto?.randomUUID?.() ??
      `vj_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  getDb()
    .prepare(
      `INSERT INTO video_jobs (id, user_id, template_id, resolution, aspect, status, provider_job_id, status_url, response_url, input_image_url, source_video_url, output_url, credits, consent_at, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      job.user_id,
      job.template_id,
      job.resolution,
      job.aspect,
      job.status,
      job.provider_job_id,
      job.status_url,
      job.response_url,
      job.input_image_url,
      job.source_video_url,
      job.output_url,
      job.credits,
      job.consent_at,
      job.error,
    );
  const row = getDb()
    .prepare("SELECT * FROM video_jobs WHERE id = ?")
    .get(id) as Row;
  return mapRow(row);
}

export async function updateJob(
  id: string,
  patch: Partial<VideoJob>,
): Promise<void> {
  const sb = await supabase();
  if (sb) {
    await sb.from("video_jobs").update(patch).eq("id", id);
    return;
  }
  const { getDb } = await import("@/lib/sqlite");
  const cols = Object.keys(patch);
  if (cols.length === 0) return;
  const sets = cols.map((c) => `${c} = ?`).join(", ");
  getDb()
    .prepare(`UPDATE video_jobs SET ${sets} WHERE id = ?`)
    .run(
      ...cols.map(
        (c) => ((patch as Row)[c] ?? null) as string | number | null,
      ),
      id,
    );
}

export async function getJob(id: string): Promise<VideoJob | null> {
  const sb = await supabase();
  if (sb) {
    const { data } = await sb
      .from("video_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapRow(data as Row) : null;
  }
  const { getDb } = await import("@/lib/sqlite");
  const row = getDb()
    .prepare("SELECT * FROM video_jobs WHERE id = ?")
    .get(id) as Row | undefined;
  return row ? mapRow(row) : null;
}

export async function findJobByProviderId(
  providerJobId: string,
): Promise<VideoJob | null> {
  const sb = await supabase();
  if (sb) {
    const { data } = await sb
      .from("video_jobs")
      .select("*")
      .eq("provider_job_id", providerJobId)
      .maybeSingle();
    return data ? mapRow(data as Row) : null;
  }
  const { getDb } = await import("@/lib/sqlite");
  const row = getDb()
    .prepare("SELECT * FROM video_jobs WHERE provider_job_id = ?")
    .get(providerJobId) as Row | undefined;
  return row ? mapRow(row) : null;
}

export async function listJobs(userId: string): Promise<VideoJob[]> {  const sb = await supabase();
  if (sb) {
    const { data } = await sb
      .from("video_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return ((data ?? []) as Row[]).map(mapRow);
  }
  const { getDb } = await import("@/lib/sqlite");
  const rows = getDb()
    .prepare(
      "SELECT * FROM video_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .all(userId) as Row[];
  return rows.map(mapRow);
}
