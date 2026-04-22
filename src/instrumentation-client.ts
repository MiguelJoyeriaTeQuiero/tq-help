/**
 * Client instrumentation — se ejecuta en el browser antes de que React hidrate.
 * Inicializa Sentry si hay DSN configurado.
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Según la recomendación, 1.0 de tracing — podemos bajarlo cuando el
    // volumen de tráfico lo justifique.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 1.0),

    // Session replay: 10% de sesiones normales, 100% de sesiones con errores.
    replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE ?? 0.1),
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Scrub PII antes de enviar.
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

    // No enviar errores de extensiones del browser.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
    ],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRouterTransitionStart = (Sentry as any).captureRouterTransitionStart;
