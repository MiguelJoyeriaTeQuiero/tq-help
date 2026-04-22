import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { MetalOrderStatus } from "@prisma/client";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.metalOrder.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, department: true } },
      items: { orderBy: { family: "asc" } },
    },
  });

  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session.user) && order.createdById !== session.user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.metalOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const { status, notes } = body as { status?: MetalOrderStatus; notes?: string };

  // Los empleados solo pueden enviar su propio borrador o cancelarlo
  if (!isAdmin(session.user)) {
    if (order.createdById !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    if (status && !["ENVIADO", "CANCELADO"].includes(status)) {
      return NextResponse.json({ error: "Sin permisos para ese cambio de estado" }, { status: 403 });
    }
    if (order.status !== "BORRADOR") {
      return NextResponse.json({ error: "Solo puedes modificar borradores" }, { status: 400 });
    }
  }

  const updated = await prisma.metalOrder.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, department: true } },
      items: { orderBy: { family: "asc" } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.metalOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!isAdmin(session.user) && order.createdById !== session.user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  if (order.status !== "BORRADOR") {
    return NextResponse.json({ error: "Solo se pueden eliminar borradores" }, { status: 400 });
  }

  await prisma.metalOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
