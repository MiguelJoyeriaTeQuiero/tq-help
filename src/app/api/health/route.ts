/**
 * Health check público — endpoint que BetterStack Uptime monitoriza.
 * Devuelve 200 si DB responde, 503 si algo falla.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  try {
    // Comprobación ligera de DB — un SELECT 1.
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - started;

    return NextResponse.json(
      {
        status:    "ok",
        uptime:    process.uptime(),
        db:        "ok",
        db_ms:     ms,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("health_check_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        status:    "error",
        db:        "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
