import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTicketUpdateEmail } from "@/lib/mail";
import { TICKET_STATUS_LABELS } from "@/lib/utils";
import { isSlaBreached } from "@/lib/sla";
import { canManageTickets } from "@/lib/permissions";
import { evaluateRules } from "@/lib/rules-engine";
import { sendPushToUser } from "@/lib/push";
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
      approval: { include: { approver: { select: { id: true, name: true } } } },
      mergedInto: { select: { id: true, title: true } },
      mergedTickets: { select: { id: true, title: true, status: true } },
      relationsFrom: {
        include: { target: { select: { id: true, title: true, status: true, priority: true } } },
      },
      relationsTo: {
        include: { source: { select: { id: true, title: true, status: true, priority: true } } },
      },
      recurringSource: { select: { id: true, name: true } },
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
      convertedTo: { select: { id: true, title: true } },
    },
  });

  if (!ticket) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

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

  // Block status transitions when approval is pending
  if (status && status !== "ABIERTO" && ticket.approvalStatus === "PENDIENTE") {
    return NextResponse.json(
      { error: "Este ticket está pendiente de aprobación. Apruébalo antes de cambiar el estado." },
      { status: 409 }
    );
  }

  const updates: any = {};

  if (status) {
    updates.status = status;
    if (status === "RESUELTO") updates.resolvedAt = new Date();
    await prisma.ticketStatusHistory.create({
      data: { ticketId: id, fromStatus: ticket.status, toStatus: status as any },
    });
  }
  if (priority) updates.priority = priority;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;

  if (ticket.slaDeadline) {
    updates.slaBreached = isSlaBreached(ticket.slaDeadline);
  }

  if (tagIds !== undefined) {
    await prisma.ticketTag.deleteMany({ where: { ticketId: id } });
    if (tagIds.length > 0) {
      await prisma.ticketTag.createMany({
        data: tagIds.map((tagId) => ({ ticketId: id, tagId })),
      });
    }
  }

  // Evaluate business rules on update
  const rules = await prisma.businessRule.findMany({ where: { isActive: true } });
  const mutation = evaluateRules("TICKET_UPDATED", {
    ...ticket,
    priority: priority ?? ticket.priority,
    assigneeId: assigneeId !== undefined ? assigneeId : ticket.assigneeId,
  }, rules);

  if (mutation.assigneeId) updates.assigneeId = mutation.assigneeId;
  if (mutation.priority) updates.priority = mutation.priority;
  if (mutation.targetDept) updates.targetDept = mutation.targetDept;

  const updated = await prisma.ticket.update({
    where: { id },
    data: updates,
    include: {
      author: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  // Apply rule tag mutations
  if (mutation.tagIds?.length) {
    await prisma.ticketTag.createMany({
      data: mutation.tagIds.map((tagId) => ({ ticketId: id, tagId })),
      skipDuplicates: true,
    });
  }

  // CSAT notification when ticket is closed
  if (status === "CERRADO" && status !== ticket.status) {
    const csatPayload = {
      userId: ticket.authorId,
      type: "CSAT_REQUEST",
      title: "¿Cómo valorarías la atención recibida?",
      message: `Tu incidencia "${ticket.title}" ha sido cerrada. Comparte tu valoración.`,
      link: `/tickets/${id}/valorar`,
    };
    await prisma.notification.create({ data: csatPayload }).catch(() => {});
    await sendPushToUser(ticket.authorId, { title: csatPayload.title, body: csatPayload.message, url: csatPayload.link }).catch(() => {});
  }

  if (status && status !== ticket.status) {
    await sendTicketUpdateEmail(
      updated.author.email,
      updated.author.name,
      id,
      updated.title,
      TICKET_STATUS_LABELS[updated.status]
    ).catch(() => {});

    const updatePayload = {
      userId: updated.author.id,
      type: "TICKET_UPDATED",
      title: "Tu incidencia ha sido actualizada",
      message: `"${updated.title}" pasó a estado ${TICKET_STATUS_LABELS[updated.status]}`,
      link: `/tickets/${id}`,
    };
    await prisma.notification.create({ data: updatePayload });
    await sendPushToUser(updated.author.id, { title: updatePayload.title, body: updatePayload.message, url: updatePayload.link }).catch(() => {});
  }

  return NextResponse.json(updated);
}
