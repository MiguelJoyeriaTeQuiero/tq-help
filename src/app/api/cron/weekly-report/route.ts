import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ReportDocument } from "@/components/pdf/report-document";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron or manual trigger — verify secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to   = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch metrics
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
      FROM tickets WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY "targetDept" ORDER BY count DESC
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
    const ms = resolvedForAvg.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0);
    avgResolutionHours = Math.round(ms / resolvedForAvg.length / 3_600_000);
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

  // Generate PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(createElement(ReportDocument, { data }) as any);

  // Get all SUPERADMIN emails
  const admins = await prisma.user.findMany({
    where: { role: "SUPERADMIN", isActive: true },
    select: { email: true, name: true },
  });

  if (admins.length === 0) {
    return NextResponse.json({ ok: true, message: "No superadmins found" });
  }

  // Send via Resend
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, message: "RESEND_API_KEY not set, skipping email" });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM ?? "TQ-HELP <noreply@example.com>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const fromStr = from.toLocaleDateString("es-ES", { day: "2-digit", month: "long" });
  const toStr   = to.toLocaleDateString("es-ES",   { day: "2-digit", month: "long", year: "numeric" });

  const errors: string[] = [];
  for (const admin of admins) {
    try {
      await resend.emails.send({
        from: FROM,
        to: admin.email,
        subject: `Informe semanal TQ-HELP — ${fromStr} al ${toStr}`,
        html: `
          <h2>Hola, ${admin.name}</h2>
          <p>Adjunto encontrarás el <strong>informe semanal de KPIs</strong> de TQ-HELP correspondiente al período <strong>${fromStr} — ${toStr}</strong>.</p>
          <table style="border-collapse:collapse;width:100%;max-width:480px;margin:16px 0;">
            <tr style="background:#0099f2;color:#fff;">
              <th style="padding:8px 12px;text-align:left">Métrica</th>
              <th style="padding:8px 12px;text-align:right">Valor</th>
            </tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">Incidencias creadas</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0"><strong>${totalTickets}</strong></td></tr>
            <tr style="background:#f8fafc"><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">Resueltas</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0"><strong>${resolvedTickets}</strong></td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">SLA incumplidos</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0;color:#ef4444"><strong>${slaBreaches}</strong></td></tr>
            <tr style="background:#f8fafc"><td style="padding:8px 12px">Tiempo medio resolución</td><td style="padding:8px 12px;text-align:right"><strong>${avgResolutionHours}h</strong></td></tr>
          </table>
          <p><a href="${APP_URL}/admin/analytics" style="color:#0099f2">Ver analytics completo →</a></p>
          <p style="font-size:12px;color:#94a3b8">TQ-HELP — Informe generado automáticamente cada lunes</p>
        `,
        attachments: [
          {
            filename: `tq-help-informe-${from.toISOString().slice(0, 10)}.pdf`,
            content: Buffer.from(pdfBuffer).toString("base64"),
          },
        ],
      });
    } catch (e) {
      errors.push(String(e));
    }
  }

  return NextResponse.json({
    ok: true,
    sent: admins.length - errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
