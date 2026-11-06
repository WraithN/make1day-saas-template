// Session-level traffic analytics: the data behind the /admin/stats funnel.
//
// The original counter (lib/stats.ts) only knows "how many hits did /pricing
// get". That is enough for a top-pages list but it cannot answer the
// questions an operator actually asks: how many people bounced, what share
// clicked the CTA, how many became paying customers.
//
// This module records discrete events (view / cta / checkout / conversion)
// carrying a visitor id and a session id, then aggregates them into a funnel.
//
// Privacy: everything here is first-party and aggregate. A visitor id is a
// random opaque token stored in a first-party cookie; no IP, no user agent and
// no personal data is written. Events are only recorded after the visitor
// accepts cookies (the /api/track endpoint is gated by the client tracker),
// which keeps the consent promise honest.
//
// Storage: Supabase when a service-role key is configured (production, where
// the filesystem is ephemeral), SQLite otherwise (local dev / self-hosted).

import { randomUUID } from "node:crypto";
import { all, get, run } from "@/lib/sqlite";
import { logger } from "@/lib/logger";

// ── Types ──────────────────────────────────────────────────────────────────

export type TrafficEventKind = "view" | "cta" | "checkout" | "conversion";

export type TrafficEvent = {
  visitorId: string;
  sessionId: string;
  kind: TrafficEventKind;
  path?: string | null;
  label?: string | null;
  referrer?: string | null;
  /** Only set on checkout events — used to attribute a later conversion. */
  email?: string | null;
  createdAt: string;
};

/** One step of the conversion funnel. */
export type FunnelStep = {
  key: string;
  /** How many sessions reached this step. */
  sessions: number;
  /** sessions / first-step sessions (0..1). */
  rate: number;
  /** sessions / previous-step sessions (0..1). */
  stepRate: number;
};

export type TrafficReport = {
  /** Total page views. */
  pageviews: number;
  /** Distinct visitors. */
  visitors: number;
  /** Distinct sessions (a 30-minute inactivity window ends a session). */
  sessions: number;
  /** Sessions with exactly one page view and nothing else, over all sessions. */
  bounceRate: number;
  /** Sessions that clicked at least one CTA, over all sessions. */
  ctr: number;
  /** Sessions that reached a conversion, over all sessions. */
  conversionRate: number;
  /** Average page views per session. */
  pagesPerSession: number;
  funnel: FunnelStep[];
  /** CTA clicks grouped by label. */
  ctas: { label: string; clicks: number; sessions: number }[];
  /** Pages ranked by views (distinct sessions per page too). */
  topPages: { path: string; views: number; sessions: number }[];
  /** Referrers grouped by host. */
  referrers: { source: string; sessions: number }[];
  updatedAt: string;
  /** True when the data comes from the local SQLite file rather than Supabase. */
  local: boolean;
};

export const EMPTY_REPORT: TrafficReport = {
  pageviews: 0,
  visitors: 0,
  sessions: 0,
  bounceRate: 0,
  ctr: 0,
  conversionRate: 0,
  pagesPerSession: 0,
  funnel: [],
  ctas: [],
  topPages: [],
  referrers: [],
  updatedAt: new Date(0).toISOString(),
  local: true,
};

/** A session ends after this much inactivity (industry-standard 30 min). */
export const SESSION_GAP_MS = 30 * 60 * 1000;

/** Funnel definition, in order. Each step counts the sessions that reached it. */
const FUNNEL_STEPS = [
  "visitors",
  "engaged",
  "cta",
  "checkout",
  "conversion",
] as const;

// ── Storage helpers ────────────────────────────────────────────────────────

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

type EventRow = {
  visitor_id: string;
  session_id: string;
  kind: string;
  path: string | null;
  label: string | null;
  referrer: string | null;
  created_at: string;
};

function rowToEvent(r: EventRow): TrafficEvent {
  return {
    visitorId: r.visitor_id,
    sessionId: r.session_id,
    kind: r.kind as TrafficEventKind,
    path: r.path ?? null,
    label: r.label ?? null,
    referrer: r.referrer ?? null,
    createdAt: r.created_at,
  };
}

// ── Writing events ─────────────────────────────────────────────────────────

/**
 * Record one traffic event. Never throws: analytics must not break a page.
 */
export async function recordTrafficEvent(e: TrafficEvent): Promise<void> {
  try {
    if (hasServiceRole()) {
      await writeSupabase(e);
    } else {
      writeLocal(e);
    }
  } catch (err) {
    logger.warn("recordTrafficEvent failed", {
      kind: e.kind,
      err: (err as Error).message,
    });
  }
}

function writeLocal(e: TrafficEvent): void {
  run(
    `INSERT INTO traffic_events
       (id, visitor_id, session_id, kind, path, label, referrer, email, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    e.visitorId,
    e.sessionId,
    e.kind,
    e.path ?? null,
    e.label ?? null,
    e.referrer ?? null,
    e.email ?? null,
    e.createdAt,
  );
}

async function writeSupabase(e: TrafficEvent): Promise<void> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  const { error } = await db.from("traffic_events").insert({
    id: randomUUID(),
    visitor_id: e.visitorId,
    session_id: e.sessionId,
    kind: e.kind,
    path: e.path ?? null,
    label: e.label ?? null,
    referrer: e.referrer ?? null,
    email: e.email ?? null,
    created_at: e.createdAt,
  });
  if (error) throw new Error(error.message);
}

// ── Reading events ─────────────────────────────────────────────────────────

/** How far back the report looks. Older events are irrelevant to a funnel. */
const WINDOW_DAYS = 30;

async function readEvents(): Promise<{ events: TrafficEvent[]; local: boolean }> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();

  if (hasServiceRole()) {
    try {
      const { createSupabaseAdminClient } = await import(
        "@/lib/supabase/admin"
      );
      const db = createSupabaseAdminClient();
      const { data, error } = await db
        .from("traffic_events")
        .select(
          "visitor_id, session_id, kind, path, label, referrer, created_at",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(20000);
      if (error) throw new Error(error.message);
      return {
        events: (data ?? []).map((r: any) =>
          rowToEvent({
            visitor_id: r.visitor_id,
            session_id: r.session_id,
            kind: r.kind,
            path: r.path,
            label: r.label,
            referrer: r.referrer,
            created_at: r.created_at,
          }),
        ),
        local: false,
      };
    } catch (err) {
      logger.warn("traffic read fell back to local", {
        err: (err as Error).message,
      });
    }
  }

  const rows = all<EventRow>(
    `SELECT visitor_id, session_id, kind, path, label, referrer, created_at
       FROM traffic_events
      WHERE created_at >= ?
      ORDER BY created_at ASC`,
    since,
  );
  return { events: rows.map(rowToEvent), local: true };
}

// ── Aggregation ────────────────────────────────────────────────────────────

/** Group a visitor's events into sessions using the inactivity window. */
function sessionize(events: TrafficEvent[]): Map<string, TrafficEvent[]> {
  // events are ordered by time, so a visitor's events are contiguous.
  const byVisitor = new Map<string, TrafficEvent[]>();
  for (const e of events) {
    const list = byVisitor.get(e.visitorId) ?? [];
    list.push(e);
    byVisitor.set(e.visitorId, list);
  }

  const sessions = new Map<string, TrafficEvent[]>();
  for (const list of byVisitor.values()) {
    let current: TrafficEvent[] = [];
    let lastAt = 0;
    for (const e of list) {
      const at = new Date(e.createdAt).getTime();
      if (current.length > 0 && at - lastAt > SESSION_GAP_MS) {
        sessions.set(`${e.visitorId}:${current[0].createdAt}`, current);
        current = [];
      }
      current.push(e);
      lastAt = at;
    }
    if (current.length > 0) {
      sessions.set(`${list[0].visitorId}:${current[0].createdAt}`, current);
    }
  }
  return sessions;
}

/** Host of a referrer URL, or "direct" when there is none. */
function referrerSource(referrer?: string | null): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).host.replace(/^www\./, "");
    return host || "direct";
  } catch {
    return "direct";
  }
}

function ratio(n: number, d: number): number {
  if (!d) return 0;
  return n / d;
}

export function aggregateTraffic(
  events: TrafficEvent[],
  local: boolean,
): TrafficReport {
  if (events.length === 0) {
    return { ...EMPTY_REPORT, local, updatedAt: new Date().toISOString() };
  }

  const sessions = sessionize(events);
  const sessionList = [...sessions.values()];
  const totalSessions = sessionList.length;

  // Per-session flags.
  let bounced = 0;
  let totalViews = 0;

  const ctaLabelStats = new Map<
    string,
    { clicks: number; sessions: Set<string> }
  >();
  const pageStats = new Map<string, { views: number; sessions: Set<string> }>();
  const refStats = new Map<string, number>();

  // Per-session event summary, used to build the funnel.
  const summary = new Map<
    string,
    { views: number; cta: boolean; checkout: boolean; conversion: boolean }
  >();

  for (const [sessionKey, list] of sessions) {
    const views = list.filter((e) => e.kind === "view");
    const ctas = list.filter((e) => e.kind === "cta");
    const checkouts = list.filter((e) => e.kind === "checkout");
    const conversions = list.filter((e) => e.kind === "conversion");

    totalViews += views.length;
    if (views.length <= 1 && ctas.length === 0 && checkouts.length === 0) {
      bounced += 1;
    }

    summary.set(sessionKey, {
      views: views.length,
      cta: ctas.length > 0,
      checkout: checkouts.length > 0,
      conversion: conversions.length > 0,
    });

    for (const c of ctas) {
      const label = c.label || "cta";
      const stat = ctaLabelStats.get(label) ?? { clicks: 0, sessions: new Set() };
      stat.clicks += 1;
      stat.sessions.add(sessionKey);
      ctaLabelStats.set(label, stat);
    }

    for (const v of views) {
      const p = v.path || "/";
      const stat = pageStats.get(p) ?? { views: 0, sessions: new Set() };
      stat.views += 1;
      stat.sessions.add(sessionKey);
      pageStats.set(p, stat);
    }

    // A session's referrer is the first event that carries one.
    const firstWithRef = list.find((e) => e.referrer);
    const source = referrerSource(firstWithRef?.referrer);
    refStats.set(source, (refStats.get(source) ?? 0) + 1);
  }

  // ── Funnel ───────────────────────────────────────────────────────────────
  // A funnel is NESTED: every step is a subset of the one above it, so the
  // numbers can only shrink as you go down. Counting each step independently
  // produces impossible shapes (a "conversion" step larger than "checkout"
  // above it) whenever a visitor skips a step — e.g. downloading a template
  // without ever opening the pricing page.
  //
  // So each step is built by narrowing the previous step's session set:
  //   landing  — every session
  //   engaged  — landing sessions that browsed 2+ pages
  //   cta      — engaged sessions that clicked a CTA
  //   checkout — cta sessions that started a checkout
  //   converted— checkout sessions that converted
  const all = [...summary.keys()];
  const engaged = all.filter((k) => (summary.get(k)?.views ?? 0) >= 2);
  const ctaStep = engaged.filter((k) => summary.get(k)?.cta);
  const checkoutStep = ctaStep.filter((k) => summary.get(k)?.checkout);
  const conversionStep = checkoutStep.filter((k) => summary.get(k)?.conversion);

  const stepCounts: Record<string, number> = {
    visitors: all.length,
    engaged: engaged.length,
    cta: ctaStep.length,
    checkout: checkoutStep.length,
    conversion: conversionStep.length,
  };

  // Headline rates describe the whole session population, not the nested
  // funnel, so a visitor who converts without a CTA still counts as a
  // conversion.
  const ctaSessions = all.filter((k) => summary.get(k)?.cta).length;
  const conversionSessions = all.filter((k) => summary.get(k)?.conversion).length;

  const first = stepCounts.visitors || 1;
  const funnel: FunnelStep[] = FUNNEL_STEPS.map((key, i) => {
    const prev = i === 0 ? stepCounts.visitors : stepCounts[FUNNEL_STEPS[i - 1]];
    return {
      key,
      sessions: stepCounts[key] ?? 0,
      rate: ratio(stepCounts[key] ?? 0, first),
      stepRate: ratio(stepCounts[key] ?? 0, prev),
    };
  });

  const updatedAt = events[events.length - 1]?.createdAt ?? new Date().toISOString();

  return {
    pageviews: totalViews,
    visitors: new Set(events.map((e) => e.visitorId)).size,
    sessions: totalSessions,
    bounceRate: ratio(bounced, totalSessions),
    ctr: ratio(ctaSessions, totalSessions),
    conversionRate: ratio(conversionSessions, totalSessions),
    pagesPerSession: ratio(totalViews, totalSessions),
    funnel,
    ctas: [...ctaLabelStats.entries()]
      .map(([label, s]) => ({
        label,
        clicks: s.clicks,
        sessions: s.sessions.size,
      }))
      .sort((a, b) => b.clicks - a.clicks),
    topPages: [...pageStats.entries()]
      .map(([path, s]) => ({
        path,
        views: s.views,
        sessions: s.sessions.size,
      }))
      .sort((a, b) => b.views - a.views),
    referrers: [...refStats.entries()]
      .map(([source, sessions]) => ({ source, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10),
    updatedAt,
    local,
  };
}

/** Read + aggregate the traffic report for the admin console. */
export async function getTrafficReport(): Promise<TrafficReport> {
  try {
    const { events, local } = await readEvents();
    return aggregateTraffic(events, local);
  } catch (err) {
    logger.warn("getTrafficReport failed", { err: (err as Error).message });
    return { ...EMPTY_REPORT };
  }
}

/** Whether the event log is backed by Supabase (vs the local SQLite file). */
export function trafficIsDurable(): boolean {
  return hasServiceRole();
}

/**
 * Record a paid conversion and attribute it to the session that started the
 * checkout. The webhook only knows the buyer email, so we look up the
 * checkout event for that email and reuse its visitor/session ids.
 *
 * When no checkout was recorded (e.g. the buyer purchased on another
 * device), the conversion is still counted — it just cannot be tied to a
 * session, so it is stored with a synthetic visitor id.
 */
export async function recordConversion(
  email: string,
  label: string,
): Promise<void> {
  const needle = email.trim().toLowerCase();
  const found = await findCheckoutVisitor(needle);
  await recordTrafficEvent({
    visitorId: found?.visitorId ?? `unattributed:${needle}`,
    sessionId: found?.sessionId ?? `unattributed:${needle}`,
    kind: "conversion",
    path: "/account",
    label,
    email: needle || null,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Find the visitor/session that started a checkout for this email.
 *
 * The payment webhook arrives from the gateway, so it carries no visitor
 * cookie — only the buyer email. Because the checkout itself was recorded
 * server-side with that email, we can walk the conversion back to the exact
 * session that produced it.
 */
export async function findCheckoutVisitor(
  email: string,
): Promise<{ visitorId: string; sessionId: string } | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  try {
    if (hasServiceRole()) {
      const { createSupabaseAdminClient } = await import(
        "@/lib/supabase/admin"
      );
      const db = createSupabaseAdminClient();
      const { data, error } = await db
        .from("traffic_events")
        .select("visitor_id, session_id")
        .eq("kind", "checkout")
        .eq("email", needle)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        visitorId: data.visitor_id as string,
        sessionId: data.session_id as string,
      };
    }

    const row = get<EventRow>(
      `SELECT visitor_id, session_id FROM traffic_events
        WHERE kind = 'checkout' AND email = ?
        ORDER BY created_at DESC LIMIT 1`,
      needle,
    );
    if (!row) return null;
    return { visitorId: row.visitor_id, sessionId: row.session_id };
  } catch (err) {
    logger.warn("findCheckoutVisitor failed", { err: (err as Error).message });
    return null;
  }
}
