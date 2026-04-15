import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { getDeptLabel, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/utils";
import { format } from "date-fns";

function csv(val: unknown): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const tickets = await prisma.ticket.findMany({
    include: {
      author: { select: { name: true, email: true } },
      tags:   { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch assignee names in one query
  const assigneeIds = [...new Set(tickets.map((t) => t.assigneeId).filter(Boolean))] as string[];
  const assignees   = await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } });
  const aMap        = Object.fromEntries(assignees.map((a) => [a.id, a.name]));

  const headers = [
    "ID", "Título", "Estado", "Prioridad", "Autor", "Email autor",
    "Dept. origen", "Dept. destino", "Asignado a", "Etiquetas",
    "SLA fecha límite", "SLA superado", "Creado", "Resuelto",
  ];

  const rows = tickets.map((t) =>
    [
      t.id.slice(-8).toUpperCase(),
      t.title,
      TICKET_STATUS_LABELS[t.status] ?? t.status,
      TICKET_PRIORITY_LABELS[t.priority] ?? t.priority,
      t.author?.name ?? "",
      t.author?.email ?? "",
      getDeptLabel(t.originDept),
      t.targetDept.map((d) => getDeptLabel(d)).join("; "),
      t.assigneeId ? (aMap[t.assigneeId] ?? t.assigneeId) : "",
      (t.tags as any[]).map((tt) => tt.tag.name).join("; "),
      t.slaDeadline ? format(t.slaDeadline, "dd/MM/yyyy HH:mm") : "",
      t.slaBreached ? "Sí" : "No",
      format(t.createdAt, "dd/MM/yyyy HH:mm"),
      t.resolvedAt ? format(t.resolvedAt, "dd/MM/yyyy HH:mm") : "",
    ]
      .map(csv)
      .join(",")
  );

  const content = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickets-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
