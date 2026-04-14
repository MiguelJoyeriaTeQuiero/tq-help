import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!isAdmin(session.user) && session.user.role !== "VIEWER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const [
    openTickets,
    ticketsByDept,
    ticketsByPriority,
    topFeatures,
    avgResolutionMs,
    complaintsByCategory,
    recentActivity,
  ] = await Promise.all([
    // Tickets abiertos totales
    prisma.ticket.count({ where: { status: { in: ["ABIERTO", "EN_PROGRESO"] } } }),

    // Tickets abiertos por departamento destino (unnest array field)
    prisma.$queryRaw<{ targetDept: string; _count: { id: number } }[]>`
      SELECT unnest("targetDept") AS "targetDept", COUNT(*)::int AS count
      FROM tickets
      WHERE status IN ('ABIERTO', 'EN_PROGRESO')
      GROUP BY "targetDept"
      ORDER BY count DESC
    `.then((rows: any[]) => rows.map((r) => ({ targetDept: r.targetDept, _count: { id: r.count } }))),

    // Tickets por prioridad
    prisma.ticket.groupBy({
      by: ["priority"],
      where: { status: { in: ["ABIERTO", "EN_PROGRESO"] } },
      _count: { id: true },
    }),

    // Peticiones más votadas
    prisma.featureRequest.findMany({
      where: { status: { notIn: ["COMPLETADO", "DESCARTADO"] } },
      orderBy: { voteCount: "desc" },
      take: 10,
      select: { id: true, title: true, voteCount: true, status: true, targetDept: true },
    }),

    // placeholder — calculado manualmente abajo
    Promise.resolve(null),

    // Denuncias por categoría (sin datos identificativos)
    prisma.complaint.groupBy({
      by: ["category"],
      _count: { id: true },
    }),

    // Últimos 5 tickets creados
    prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        targetDept: true,
      },
    }),
  ]);

  // SLA breaches and in-progress count
  const [slaBreaches, inProgressTickets] = await Promise.all([
    prisma.ticket.count({
      where: {
        slaDeadline: { lt: new Date() },
        status: { notIn: ["RESUELTO", "CERRADO"] },
      },
    }),
    prisma.ticket.count({
      where: { status: "EN_PROGRESO" },
    }),
  ]);

  // Calcular tiempo medio de resolución manualmente
  const resolvedTickets = await prisma.ticket.findMany({
    where: {
      status: "RESUELTO",
      resolvedAt: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { createdAt: true, resolvedAt: true },
  });

  let avgResolutionHours = 0;
  if (resolvedTickets.length > 0) {
    const totalMs = resolvedTickets.reduce((acc, t) => {
      return acc + (t.resolvedAt!.getTime() - t.createdAt.getTime());
    }, 0);
    avgResolutionHours = Math.round(totalMs / resolvedTickets.length / 1000 / 60 / 60);
  }

  return NextResponse.json({
    openTickets,
    ticketsByDept,
    ticketsByPriority,
    topFeatures,
    avgResolutionHours,
    complaintsByCategory,
    recentActivity,
    slaBreaches,
    inProgressTickets,
  });
}
