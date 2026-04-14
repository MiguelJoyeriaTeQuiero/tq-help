import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ReportDocument } from "@/components/pdf/report-document";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = toParam ? new Date(toParam + "T23:59:59") : new Date();

  const [
    totalTickets,
    resolvedTickets,
    openTickets,
    slaBreaches,
    totalComplaints,
    ticketsByDept,
    ticketsByPriority,
    topFeatures,
    complaintsByCategory,
    resolvedForAvg,
  ] = await Promise.all([
    prisma.ticket.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.ticket.count({ where: { createdAt: { gte: from, lte: to }, status: { in: ["RESUELTO", "CERRADO"] } } }),
    prisma.ticket.count({ where: { status: { in: ["ABIERTO", "EN_PROGRESO"] } } }),
    prisma.ticket.count({ where: { slaDeadline: { lt: new Date() }, status: { notIn: ["RESUELTO", "CERRADO"] } } }),
    prisma.complaint.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.$queryRaw<any[]>`
      SELECT unnest("targetDept") AS "targetDept", COUNT(*)::int AS count
      FROM tickets
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY "targetDept"
      ORDER BY count DESC
    `.then((rows: any[]) => rows.map((r) => ({ targetDept: r.targetDept, _count: { id: r.count } }))),
    prisma.ticket.groupBy({ by: ["priority"], where: { createdAt: { gte: from, lte: to } }, _count: { id: true } }),
    prisma.featureRequest.findMany({
      where: { status: { notIn: ["DESCARTADO"] } },
      orderBy: { voteCount: "desc" },
      take: 10,
      select: { title: true, voteCount: true, status: true },
    }),
    prisma.complaint.groupBy({ by: ["category"], _count: { id: true } }),
    prisma.ticket.findMany({
      where: { status: "RESUELTO", resolvedAt: { not: null }, createdAt: { gte: from, lte: to } },
      select: { createdAt: true, resolvedAt: true },
    }),
  ]);

  let avgResolutionHours = 0;
  if (resolvedForAvg.length > 0) {
    const totalMs = resolvedForAvg.reduce((acc, t) => acc + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0);
    avgResolutionHours = Math.round(totalMs / resolvedForAvg.length / 1000 / 60 / 60);
  }

  const data = {
    from: from.toISOString(),
    to: to.toISOString(),
    totalTickets,
    resolvedTickets,
    openTickets,
    avgResolutionHours,
    slaBreaches,
    totalComplaints,
    ticketsByDept,
    ticketsByPriority,
    topFeatures,
    complaintsByCategory,
    generatedAt: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(ReportDocument, { data }) as any;
  const buffer = await renderToBuffer(element);

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tq-help-informe-${fromStr}-${toStr}.pdf"`,
    },
  });
}
