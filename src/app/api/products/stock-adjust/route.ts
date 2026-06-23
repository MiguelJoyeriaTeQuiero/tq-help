import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageWarehouse } from "@/lib/permissions";

/**
 * POST /api/products/stock-adjust
 * Ajuste masivo de stock tras un recuento físico: fija el stock de cada producto
 * al valor contado. Solo gestores de almacén.
 * Body: { items: [{ id, counted }] }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageWarehouse(session.user)) {
    return NextResponse.json({ error: "Solo el departamento de logística puede gestionar el almacén" }, { status: 403 });
  }

  const body = await req.json();
  const items = body.items as { id: string; counted: number }[];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un producto contado" }, { status: 400 });
  }
  for (const it of items) {
    if (!it.id || !Number.isFinite(it.counted) || it.counted < 0) {
      return NextResponse.json({ error: "Cada línea necesita un id y una cantidad contada ≥ 0" }, { status: 400 });
    }
  }

  const ids = items.map((i) => i.id);
  const current = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, stock: true, replenishmentRequested: true },
  });
  const currentById = new Map(current.map((p) => [p.id, p]));

  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const it of items) {
      const prod = currentById.get(it.id);
      if (!prod) continue;
      const counted = Math.floor(it.counted);
      if (counted === prod.stock) continue; // sin cambios
      await tx.product.update({
        where: { id: it.id },
        data: {
          stock: counted,
          // si el recuento sube el stock y había un pedido al proveedor pendiente, lo damos por recibido
          ...(counted > prod.stock && prod.replenishmentRequested ? { replenishmentRequested: false } : {}),
        },
      });
      updated++;
    }
  });

  return NextResponse.json({ ok: true, updated });
}
