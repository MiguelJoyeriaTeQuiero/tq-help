/**
 * Observability — única puerta de entrada para logs, errores y analytics.
 *
 * Dispatcha a:
 *  - Console (siempre, formato estructurado)
 *  - Sentry (errores, si SENTRY_DSN está configurado)
 *  - BetterStack Logs (si LOGTAIL_SOURCE_TOKEN está configurado)
 *
 * Los fallos de proveedores NO deben romper la app — todos los envíos
 * son "fire-and-forget" con try/catch interno.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogContext = Record<string, any>;

export type LogLevel = "debug" | "info" | "warn" | "error";

const SERVICE_NAME = "tq-help";
const IS_SERVER = typeof window === "undefined";
const ENV = process.env.NODE_ENV ?? "development";

// ── BetterStack Logs (ingestion HTTP) ─────────────────────────────────────
const LOGTAIL_TOKEN    = process.env.LOGTAIL_SOURCE_TOKEN;
const LOGTAIL_ENDPOINT = process.env.LOGTAIL_INGESTING_HOST ?? "https://in.logs.betterstack.com";

async function sendToBetterStack(level: LogLevel, message: string, ctx?: LogContext) {
  if (!LOGTAIL_TOKEN || !IS_SERVER) return;
  try {
    await fetch(LOGTAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOGTAIL_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        dt: new Date().toISOString(),
        level,
        message,
        service: SERVICE_NAME,
        env: ENV,
        ...ctx,
      }),
      // no-wait: no bloqueamos el request
      keepalive: true,
    });
  } catch {
    // swallow — logs no deben romper el flujo
  }
}

// ── Sentry (lazy) ─────────────────────────────────────────────────────────
// Importación dinámica para que el bundle cliente no arrastre sentry en rutas
// que no lo usan.
type SentryLike = {
  captureException: (e: unknown, ctx?: LogContext) => void;
  captureMessage: (msg: string, level?: "fatal" | "error" | "warning" | "log" | "info" | "debug") => void;
  setUser: (user: { id?: string; email?: string; role?: string } | null) => void;
};

let sentryCache: SentryLike | null | undefined;

async function getSentry(): Promise<SentryLike | null> {
  if (sentryCache !== undefined) return sentryCache;
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) {
    sentryCache = null;
    return null;
  }
  try {
    const Sentry = await import("@sentry/nextjs");
    sentryCache = Sentry as unknown as SentryLike;
    return sentryCache;
  } catch {
    sentryCache = null;
    return null;
  }
}

// ── API pública ───────────────────────────────────────────────────────────

function format(level: LogLevel, message: string, ctx?: LogContext): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] ${level.toUpperCase().padEnd(5)} ${message}`;
  if (!ctx || Object.keys(ctx).length === 0) return base;
  return `${base} ${JSON.stringify(ctx)}`;
}

export const logger = {
  debug(message: string, ctx?: LogContext) {
    if (ENV === "production") return; // demasiado ruido en prod
    console.debug(format("debug", message, ctx));
    void sendToBetterStack("debug", message, ctx);
  },
  info(message: string, ctx?: LogContext) {
    console.info(format("info", message, ctx));
    void sendToBetterStack("info", message, ctx);
  },
  warn(message: string, ctx?: LogContext) {
    console.warn(format("warn", message, ctx));
    void sendToBetterStack("warn", message, ctx);
  },
  error(message: string, ctx?: LogContext) {
    console.error(format("error", message, ctx));
    void sendToBetterStack("error", message, ctx);
  },
};

/**
 * Capturar una excepción. Va a Sentry + BetterStack + console.
 * Usar en catch-blocks de API routes, server actions, jobs.
 */
export async function captureError(error: unknown, ctx?: LogContext): Promise<void> {
  const err     = error instanceof Error ? error : new Error(String(error));
  const payload = {
    ...ctx,
    error_name:    err.name,
    error_message: err.message,
    error_stack:   err.stack,
  };

  console.error(format("error", err.message, payload));
  void sendToBetterStack("error", err.message, payload);

  const sentry = await getSentry();
  if (sentry) {
    try {
      sentry.captureException(err, ctx);
    } catch {
      // swallow
    }
  }
}

/**
 * Registrar un evento de negocio (no-error). No va a Sentry — solo logs.
 * Ejemplos: "ticket.created", "sla.breached", "login.success".
 */
export function trackEvent(name: string, ctx?: LogContext): void {
  logger.info(`event:${name}`, ctx);
}

/**
 * Asociar el usuario actual al scope de Sentry. Llamar desde server
 * components / route handlers tras verificar sesión.
 */
export async function setUserContext(user: { id: string; email?: string; role?: string } | null): Promise<void> {
  const sentry = await getSentry();
  if (!sentry) return;
  try {
    sentry.setUser(user);
  } catch {
    // swallow
  }
}
