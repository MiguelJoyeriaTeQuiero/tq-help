import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTickets } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const approval = await prisma.ticketApproval.findUnique({
    where: { ticketId: id },
    include: { approver: { select: { id: true, name: true } } },
  });
  return NextResponse.json(approval);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTickets(session.user, ticket.targetDept)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status, comment } = await req.json();
  if (!["APROBADO", "RECHAZADO"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const approval = await prisma.ticketApproval.update({
    where: { ticketId: id },
    data: { status, comment, approverId: session.user.id, reviewedAt: new Date() },
  });

  // Update ticket approvalStatus + change status accordingly
  const ticketUpdate: any = { approvalStatus: status };
  if (status === "APROBADO") {
    ticketUpdate.status = "EN_PROGRESO";
  } else if (status === "RECHAZADO") {
    ticketUpdate.status = "CERRADO";
  }
  await prisma.ticket.update({ where: { id }, data: ticketUpdate });

  // Record status history
  await prisma.ticketStatusHistory.create({
    data: {
      ticketId: id,
      fromStatus: ticket.status,
      toStatus: ticketUpdate.status,
    },
  });

  // Add internal comment
  await prisma.comment.create({
    data: {
      ticketId: id,
      authorId: session.user.id,
      isInternal: true,
      content: status === "APROBADO"
        ? `✅ Aprobado por ${session.user.name}${comment ? `: ${comment}` : ""}`
        : `❌ Rechazado por ${session.user.name}${comment ? `: ${comment}` : ""}`,
    },
  });

  // Notify author
  await prisma.notification.create({
    data: {
      userId: ticket.authorId,
      type: "TICKET_APPROVAL",
      title: status === "APROBADO" ? "Incidencia aprobada" : "Incidencia rechazada",
      message: status === "APROBADO"
        ? `Tu solicitud "${ticket.title}" ha sido aprobada y está en progreso`
        : `Tu solicitud "${ticket.title}" ha sido rechazada${comment ? `: ${comment}` : ""}`,
      link: `/tickets/${id}`,
    },
  });

  return NextResponse.json(approval);
}
