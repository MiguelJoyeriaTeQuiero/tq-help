import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { applyOrderStock, restoreOrderStock } from "@/lib/metal-stock";
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
  const order = await prisma.metalOrder.findUnique({ where: { id }, include: { items: true } });
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

  // Ajuste de stock según el cambio de estado:
  //  - al salir de BORRADOR (envío/confirmación) se descuenta stock una sola vez
  //  - al cancelar un pedido cuyo stock ya se descontó, se devuelve
  let nextStockApplied = order.stockApplied;
  if (status && status !== order.status) {
    if (status === "CANCELADO") {
      if (order.stockApplied) nextStockApplied = false;
    } else if (status !== "BORRADOR" && !order.stockApplied) {
      nextStockApplied = true;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (nextStockApplied !== order.stockApplied) {
      if (nextStockApplied) await applyOrderStock(tx, order.items);
      else await restoreOrderStock(tx, order.items);
    }
    return tx.metalOrder.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        stockApplied: nextStockApplied,
      },
      include: {
        createdBy: { select: { id: true, name: true, department: true } },
        items: { orderBy: { family: "asc" } },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.metalOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const admin = isAdmin(session.user);
  if (!admin && order.createdById !== session.user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  // Los admins pueden eliminar cualquier pedido; el creador solo sus borradores.
  if (!admin && order.status !== "BORRADOR") {
    return NextResponse.json({ error: "Solo se pueden eliminar borradores" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Si el stock se había descontado, lo devolvemos antes de borrar el pedido.
    if (order.stockApplied) await restoreOrderStock(tx, order.items);
    await tx.metalOrder.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}
