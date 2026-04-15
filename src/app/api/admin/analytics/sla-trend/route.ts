import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session || (!isAdmin(session.user) && session.user.role !== "VIEWER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const rows = await prisma.$queryRaw<{ week: string; total: number; breached: number }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('week', "createdAt"), 'DD/MM') AS week,
      COUNT(*)::int                                      AS total,
      COUNT(*) FILTER (WHERE "slaBreached" = true)::int  AS breached
    FROM tickets
    WHERE "createdAt"   >= NOW() - INTERVAL '12 weeks'
      AND "slaDeadline" IS NOT NULL
    GROUP BY DATE_TRUNC('week', "createdAt")
    ORDER BY DATE_TRUNC('week', "createdAt") ASC
  `;

  const data = rows.map((r) => ({
    week: r.week,
    total: r.total,
    breached: r.breached,
    compliant: r.total - r.breached,
    compliance: r.total > 0 ? Math.round((1 - r.breached / r.total) * 100) : 100,
  }));

  return NextResponse.json(data);
}
