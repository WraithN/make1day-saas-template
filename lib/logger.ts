// Structured, level-aware logger for ShipKit server runtimes.
//
// Emits one JSON object per line (Loggly / Datadog / CloudWatch / systemd
// friendly) and never throws into the caller. In development it also pretty-
// prints to the console so local tailing is readable. Levels are controlled by
// LOG_LEVEL (debug | info | warn | error), defaulting to info in prod and
// debug in dev.

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw in LEVEL_WEIGHT) return raw as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[currentLevel()];
}

export type LogContext = Record<string, unknown>;

function emit(level: LogLevel, msg: string, ctx?: LogContext) {
  if (!shouldLog(level)) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx ?? {}),
    // Attach a deployment id when present so logs from many tenants/regions
    // can be correlated (e.g. in a log aggregator).
    dep: process.env.DEPLOYMENT_ID ?? undefined,
  };
  const line = JSON.stringify(entry);
  if (process.env.NODE_ENV === "production") {
    // One line per event — safe for log shippers.
    process.stdout.write(line + "\n");
  } else {
    const tag = level.toUpperCase().padEnd(5);
    const ctxStr = ctx && Object.keys(ctx).length ? " " + line : "";
    // eslint-disable-next-line no-console
    console.log(`[${tag}] ${msg}${ctxStr}`);
  }
}

export const logger = {
  debug(msg: string, ctx?: LogContext) {
    emit("debug", msg, ctx);
  },
  info(msg: string, ctx?: LogContext) {
    emit("info", msg, ctx);
  },
  warn(msg: string, ctx?: LogContext) {
    emit("warn", msg, ctx);
  },
  error(msg: string, ctx?: LogContext) {
    emit("error", msg, ctx);
  },
};

/** Wrap an async handler so thrown errors are logged with context. */
export async function withErrorLogged<T>(
  label: string,
  fn: () => Promise<T>,
  ctx?: LogContext,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error(`${label} failed`, {
      ...ctx,
      err: (err as Error).message,
      stack:
        currentLevel() === "debug" ? (err as Error).stack : undefined,
    });
    throw err;
  }
}
