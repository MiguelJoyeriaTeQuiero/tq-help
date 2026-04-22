<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Observability

Three services are wired in and all degrade gracefully when their env vars are missing:

- **Sentry** (`@sentry/nextjs`): errors + performance. Init in `sentry.server.config.ts`, `sentry.edge.config.ts`, and `src/instrumentation-client.ts`; wired via `src/instrumentation.ts` (`register` + `onRequestError`) and `withSentryConfig` in `next.config.ts`. PII scrubbed in `beforeSend`. Errors tunneled via `/monitoring` to bypass ad-blockers.
- **BetterStack Logs**: structured logs via HTTP ingestion. No SDK — the `logger` in `src/lib/observability/index.ts` fires `fetch` with `keepalive: true` when `LOGTAIL_SOURCE_TOKEN` is set. BetterStack Uptime monitors `/api/health` (DB ping).
- **Umami Cloud**: cookieless analytics. Script injected in `src/app/layout.tsx` via `components/analytics/umami.tsx` with DNT honored and query strings excluded.

**Use the abstraction, not providers directly**:

```ts
import { logger, captureError, trackEvent, setUserContext } from "@/lib/observability";

logger.info("ticket_created", { ticketId, userId });
trackEvent("sla.breached", { ticketId, overdueHours: 8 });

try { /* ... */ } catch (err) {
  await captureError(err, { scope: "POST /api/tickets" });
  return NextResponse.json({ error: "Internal" }, { status: 500 });
}
```

Never import `@sentry/nextjs` or call `fetch` against Logtail from feature code.
