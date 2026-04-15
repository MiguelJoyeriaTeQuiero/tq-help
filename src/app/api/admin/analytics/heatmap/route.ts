import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session || (!isAdmin(session.user) && session.user.role !== "VIEWER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // DOW: 0=Sunday … 6=Saturday in PostgreSQL
  const rows = await prisma.$queryRaw<{ dow: number; hour: number; count: number }[]>`
    SELECT
      EXTRACT(DOW FROM "createdAt")::int  AS dow,
      EXTRACT(HOUR FROM "createdAt")::int AS hour,
      COUNT(*)::int                        AS count
    FROM tickets
    WHERE "createdAt" >= NOW() - INTERVAL '90 days'
    GROUP BY dow, hour
    ORDER BY dow, hour
  `;

  // Build a flat object keyed by "dow-hour" for easy lookup
  const map: Record<string, number> = {};
  let maxCount = 0;
  for (const r of rows) {
    const key = `${r.dow}-${r.hour}`;
    map[key] = r.count;
    if (r.count > maxCount) maxCount = r.count;
  }

  return NextResponse.json({ map, maxCount });
}
