/**
 * Next.js instrumentation — se ejecuta una vez al arrancar el servidor.
 * Inicializa Sentry en Node.js y Edge, y expone onRequestError para
 * reportar errores de servidor automáticamente.
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
import type { Instrumentation } from "next";

export async function register() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(err, request, context);
  } catch {
    // swallow
  }
};
