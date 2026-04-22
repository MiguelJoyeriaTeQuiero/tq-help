/**
 * Sentry — configuración para runtime Node.js.
 * Lo carga instrumentation.ts al arrancar el servidor.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1.0),

  // Scrub PII de requests antes de enviar.
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-cron-secret"];
    }
    if (event.user) {
      delete event.user.ip_address;
    }
    // Prisma query data puede contener PII — ocultamos los args.
    if (event.contexts?.trace?.data && typeof event.contexts.trace.data === "object") {
      const data = event.contexts.trace.data as Record<string, unknown>;
      if ("db.statement" in data) data["db.statement"] = "[redacted]";
    }
    return event;
  },
});
