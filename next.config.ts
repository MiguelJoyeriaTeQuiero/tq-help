import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

// Sentry sólo se aplica si hay DSN (evita errores en local sin credenciales).
const hasSentry = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export default hasSentry
  ? withSentryConfig(nextConfig, {
      // Sube source maps sólo si hay auth token (normalmente en Vercel).
      silent: !process.env.CI,
      org:     process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Los source maps se suben a Sentry y se borran del bundle público
      // para no filtrar código original al cliente.
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },

      // Tunelea requests a Sentry por /monitoring para saltarse ad-blockers.
      tunnelRoute: "/monitoring",

      // Desactiva el logger de Sentry en el bundle de cliente.
      disableLogger: true,

      // Tree-shake de telemetría de Sentry SDK en el bundle cliente.
      widenClientFileUpload: true,
    })
  : nextConfig;
