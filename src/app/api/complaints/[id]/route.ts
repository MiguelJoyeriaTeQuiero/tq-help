import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessComplaints, canViewResolvedComplaints } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["RECIBIDA", "EN_INVESTIGACION", "RESUELTA", "ARCHIVADA"]).optional(),
  note: z.string().min(1).max(5000).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const canFull = canAccessComplaints(session.user);
  const canResolved = canViewResolvedComplaints(session.user);

  if (!canFull && !canResolved) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (!canFull && canResolved) {
    if (!["RESUELTA", "ARCHIVADA"].includes(complaint.status)) {
      return NextResponse.json({ error: "Sin permisos para denuncias activas" }, { status: 403 });
    }
  }

  const full = await prisma.complaint.findUnique({
    where: { id },
    include: {
      internalNotes: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { changedAt: "asc" } },
      auditLogs: {
        include: { user: { select: { id: true, name: true, department: true } } },
        orderBy: { accessedAt: "desc" },
        take: 50,
      },
    },
  });

  // Registrar acceso
  await prisma.complaintAuditLog.create({
    data: { complaintId: id, userId: session.user.id, action: "VIEW" },
  });

  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!canAccessComplaints(session.user)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;

  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, note } = parsed.data;

  if (status && status !== complaint.status) {
    await prisma.complaintStatusHistory.create({
      data: { complaintId: id, fromStatus: complaint.status, toStatus: status as any },
    });
    await prisma.complaint.update({ where: { id }, data: { status: status as any } });

    await prisma.complaintAuditLog.create({
      data: { complaintId: id, userId: session.user.id, action: "UPDATE_STATUS" },
    });
  }

  if (note) {
    await prisma.complaintNote.create({ data: { complaintId: id, content: note } });
    await prisma.complaintAuditLog.create({
      data: { complaintId: id, userId: session.user.id, action: "ADD_NOTE" },
    });
  }

  const updated = await prisma.complaint.findUnique({
    where: { id },
    include: {
      internalNotes: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { changedAt: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
