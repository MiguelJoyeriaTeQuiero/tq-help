/**
 * Sentry — configuración para runtime Edge (middleware, edge routes).
 * Menos capacidades que el runtime Node.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1.0),

  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
    }
    if (event.user) {
      delete event.user.ip_address;
    }
    return event;
  },
});
