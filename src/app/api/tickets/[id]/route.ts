import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTicketUpdateEmail } from "@/lib/mail";
import { TICKET_STATUS_LABELS } from "@/lib/utils";
import { isSlaBreached } from "@/lib/sla";
import { canManageTickets } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ABIERTO", "EN_PROGRESO", "RESUELTO", "CERRADO"]).optional(),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  assigneeId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, department: true } },
      tags: { include: { tag: true } },
      attachments: true,
      statusHistory: { orderBy: { changedAt: "asc" } },
      comments: {
        where:
          session.user.role === "EMPLOYEE"
            ? { isInternal: false }
            : undefined,
        include: {
          author: { select: { id: true, name: true, role: true } },
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Empleado solo puede ver sus propios tickets
  if (session.user.role === "EMPLOYEE" && ticket.authorId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!canManageTickets(session.user, ticket.targetDept)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, priority, assigneeId, tagIds } = parsed.data;
  const updates: any = {};

  if (status) {
    updates.status = status;
    if (status === "RESUELTO") updates.resolvedAt = new Date();
    // Registrar historial
    await prisma.ticketStatusHistory.create({
      data: { ticketId: id, fromStatus: ticket.status, toStatus: status as any },
    });
  }
  if (priority) updates.priority = priority;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;

  // Actualizar SLA breach
  if (ticket.slaDeadline) {
    updates.slaBreached = isSlaBreached(ticket.slaDeadline);
  }

  // Actualizar tags si se proporcionan
  if (tagIds !== undefined) {
    await prisma.ticketTag.deleteMany({ where: { ticketId: id } });
    if (tagIds.length > 0) {
      await prisma.ticketTag.createMany({
        data: tagIds.map((tagId) => ({ ticketId: id, tagId })),
      });
    }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: updates,
    include: {
      author: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  // Notificar al autor si cambió el estado
  if (status && status !== ticket.status) {
    await sendTicketUpdateEmail(
      updated.author.email,
      updated.author.name,
      id,
      updated.title,
      TICKET_STATUS_LABELS[updated.status]
    ).catch(() => {});

    // Crear notificación interna
    await prisma.notification.create({
      data: {
        userId: updated.author.id,
        type: "TICKET_UPDATED",
        title: "Tu incidencia ha sido actualizada",
        message: `"${updated.title}" pasó a estado ${TICKET_STATUS_LABELS[updated.status]}`,
        link: `/tickets/${id}`,
      },
    });
  }

  return NextResponse.json(updated);
}
