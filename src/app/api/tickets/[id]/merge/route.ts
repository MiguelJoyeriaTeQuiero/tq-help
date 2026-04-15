import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTickets } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: masterId } = await params;
  const { sourceId } = await req.json();

  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  if (masterId === sourceId) return NextResponse.json({ error: "No puedes fusionar un ticket consigo mismo" }, { status: 400 });

  const [master, source] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: masterId } }),
    prisma.ticket.findUnique({ where: { id: sourceId } }),
  ]);

  if (!master) return NextResponse.json({ error: "Ticket maestro no encontrado" }, { status: 404 });
  if (!source) return NextResponse.json({ error: "Ticket a fusionar no encontrado" }, { status: 404 });
  if (source.mergedIntoId) return NextResponse.json({ error: "El ticket origen ya fue fusionado" }, { status: 400 });

  if (!canManageTickets(session.user, master.targetDept) || !canManageTickets(session.user, source.targetDept)) {
    return NextResponse.json({ error: "Sin permisos sobre uno de los tickets" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    // Move comments from source → master
    await tx.comment.updateMany({ where: { ticketId: sourceId }, data: { ticketId: masterId } });

    // Move attachments from source → master
    await tx.attachment.updateMany({ where: { ticketId: sourceId }, data: { ticketId: masterId } });

    // Move ticket relations (skip if creates duplicate)
    const sourceRelations = await tx.ticketRelation.findMany({ where: { sourceId } });
    const targetRelations = await tx.ticketRelation.findMany({ where: { targetId: sourceId } });

    for (const rel of sourceRelations) {
      if (rel.targetId === masterId) continue; // skip self-loop
      await tx.ticketRelation.upsert({
        where: { sourceId_targetId_relationType: { sourceId: masterId, targetId: rel.targetId, relationType: rel.relationType } },
        update: {},
        create: { sourceId: masterId, targetId: rel.targetId, relationType: rel.relationType, createdById: session.user.id },
      });
    }
    for (const rel of targetRelations) {
      if (rel.sourceId === masterId) continue;
      await tx.ticketRelation.upsert({
        where: { sourceId_targetId_relationType: { sourceId: rel.sourceId, targetId: masterId, relationType: rel.relationType } },
        update: {},
        create: { sourceId: rel.sourceId, targetId: masterId, relationType: rel.relationType, createdById: session.user.id },
      });
    }

    // Delete all source relations
    await tx.ticketRelation.deleteMany({ where: { OR: [{ sourceId }, { targetId: sourceId }] } });

    // Close source ticket and mark as merged
    await tx.ticket.update({
      where: { id: sourceId },
      data: { status: "CERRADO", mergedIntoId: masterId },
    });

    await tx.ticketStatusHistory.create({
      data: { ticketId: sourceId, fromStatus: source.status, toStatus: "CERRADO" },
    });

    // System comments
    await tx.comment.create({
      data: {
        ticketId: masterId,
        authorId: session.user.id,
        isInternal: true,
        content: `🔀 Ticket #${source.id.slice(-6).toUpperCase()} ("${source.title}") ha sido fusionado en esta incidencia.`,
      },
    });

    await tx.comment.create({
      data: {
        ticketId: sourceId,
        authorId: session.user.id,
        isInternal: true,
        content: `🔀 Esta incidencia fue fusionada en la incidencia "${master.title}" y cerrada.`,
      },
    });

    // Notify authors
    if (source.authorId !== master.authorId) {
      await tx.notification.create({
        data: {
          userId: source.authorId,
          type: "TICKET_MERGED",
          title: "Tu incidencia fue fusionada",
          message: `"${source.title}" fue fusionada en "${master.title}"`,
          link: `/tickets/${masterId}`,
        },
      });
    }
  });

  const updated = await prisma.ticket.findUnique({
    where: { id: masterId },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}
