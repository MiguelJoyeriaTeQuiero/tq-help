import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session || (!isAdmin(session.user) && session.user.role !== "VIEWER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Ticket counts by assignee + status
  const ticketCounts = await prisma.ticket.groupBy({
    by: ["assigneeId", "status"],
    where: { assigneeId: { not: null } },
    _count: { id: true },
  });

  if (ticketCounts.length === 0) {
    return NextResponse.json([]);
  }

  // Unique assignee IDs
  const assigneeIds = [...new Set(ticketCounts.map((r) => r.assigneeId as string))];

  // Fetch user info
  const users = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, name: true, department: true },
  });

  // Avg resolution time per assignee (raw SQL — safe: we know the table is "tickets")
  const resolutionRows = await prisma.$queryRaw<{ assigneeId: string; avg_hours: number }[]>`
    SELECT "assigneeId",
           ROUND(AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600))::int AS avg_hours
    FROM tickets
    WHERE "assigneeId" IS NOT NULL
      AND "resolvedAt" IS NOT NULL
    GROUP BY "assigneeId"
  `;
  const resolutionMap = Object.fromEntries(resolutionRows.map((r) => [r.assigneeId, r.avg_hours]));

  // CSAT per assignee — fetch from TicketCsat, group in JS
  const csatItems = await prisma.ticketCsat.findMany({
    select: { rating: true, ticket: { select: { assigneeId: true } } },
    where: { ticket: { assigneeId: { not: null } } },
  });
  const csatByAgent: Record<string, number[]> = {};
  for (const c of csatItems) {
    const aid = c.ticket.assigneeId;
    if (!aid) continue;
    if (!csatByAgent[aid]) csatByAgent[aid] = [];
    csatByAgent[aid].push(c.rating);
  }

  // Aggregate per user
  const metrics = users.map((user) => {
    const userCounts = ticketCounts.filter((r) => r.assigneeId === user.id);
    const total = userCounts.reduce((s, r) => s + r._count.id, 0);
    const resolved = userCounts
      .filter((r) => r.status === "RESUELTO" || r.status === "CERRADO")
      .reduce((s, r) => s + r._count.id, 0);
    const open = userCounts
      .filter((r) => r.status === "ABIERTO" || r.status === "EN_PROGRESO")
      .reduce((s, r) => s + r._count.id, 0);

    const scores = csatByAgent[user.id] ?? [];
    const avgCsat = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    return {
      id: user.id,
      name: user.name,
      department: user.department,
      total,
      resolved,
      open,
      avgResolutionHours: resolutionMap[user.id] ?? null,
      avgCsat,
      csatCount: scores.length,
    };
  });

  return NextResponse.json(metrics.sort((a, b) => b.resolved - a.resolved));
}
