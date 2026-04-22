/**
 * PATCH /api/metal-orders/[id]/items
 * Solo admins. Actualiza las cantidades de los artículos de un pedido.
 * Guarda originalQuantity la primera vez que se modifica cada línea.
 * Crea una notificación en BD para el creador del pedido.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

interface ItemPatch {
  id: string;
  quantity: number;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { id: orderId } = await params;

  const order = await prisma.metalOrder.findUnique({
    where: { id: orderId },
    include: { items: true, createdBy: { select: { id: true, name: true } } },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (["ENTREGADO", "CANCELADO"].includes(order.status)) {
    return NextResponse.json({ error: "No se puede modificar un pedido entregado o cancelado" }, { status: 400 });
  }

  const body = await req.json();
  const patches = body.items as ItemPatch[];

  if (!Array.isArray(patches) || patches.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos una línea" }, { status: 400 });
  }

  // Validar cantidades
  for (const p of patches) {
    if (p.quantity < 1) return NextResponse.json({ error: "La cantidad mínima es 1" }, { status: 400 });
  }

  // Actualizar cada línea en una transacción
  await prisma.$transaction(async (tx) => {
    for (const patch of patches) {
      const current = order.items.find((it) => it.id === patch.id);
      if (!current) continue;

      const hasChanged = current.quantity !== patch.quantity;
      if (!hasChanged) continue;

      // Guardar originalQuantity solo la primera vez
      const originalQuantity = current.originalQuantity !== null
        ? current.originalQuantity   // ya fue modificado antes — conservar el original histórico
        : current.quantity;          // primera modificación — guardar el valor original del pedido

      await tx.metalOrderItem.update({
        where: { id: patch.id },
        data: {
          quantity: patch.quantity,
          originalQuantity,
        },
      });
    }

    // Notificación al creador del pedido si no es el propio admin
    if (order.createdBy.id !== session.user.id) {
      await tx.notification.create({
        data: {
          userId:  order.createdBy.id,
          type:    "METAL_ORDER_MODIFIED",
          title:   "Pedido modificado",
          message: `Un administrador ha ajustado las cantidades de tu pedido de material.`,
          link:    `/pedidos-metal/${orderId}`,
        },
      });
    }
  });

  // Devolver el pedido actualizado
  const updated = await prisma.metalOrder.findUnique({
    where: { id: orderId },
    include: {
      createdBy: { select: { id: true, name: true, department: true } },
      items: { orderBy: { family: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
