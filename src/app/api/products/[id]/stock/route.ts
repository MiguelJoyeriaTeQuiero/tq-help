import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageWarehouse } from "@/lib/permissions";

/**
 * POST /api/products/[id]/stock
 * Da entrada / ajusta el stock de un producto. Solo gestores de almacén.
 * Body: { delta } para sumar/restar, o { set } para fijar un valor absoluto.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageWarehouse(session.user)) {
    return NextResponse.json({ error: "Solo el departamento de logística puede gestionar el almacén" }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json();
  const { delta, set } = body as { delta?: number; set?: number };

  let nextStock: number;
  if (typeof set === "number" && Number.isFinite(set)) {
    nextStock = Math.max(0, Math.floor(set));
  } else if (typeof delta === "number" && Number.isFinite(delta)) {
    nextStock = Math.max(0, product.stock + Math.floor(delta));
  } else {
    return NextResponse.json({ error: "Indica 'delta' o 'set'" }, { status: 400 });
  }

  // Si se recibe mercancía (sube el stock), se da por servido el pedido al proveedor
  // y se reactiva el seguimiento del aviso de reposición.
  const stockIncreased = nextStock > product.stock;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      stock: nextStock,
      ...(stockIncreased && product.replenishmentRequested ? { replenishmentRequested: false } : {}),
    },
  });

  return NextResponse.json(updated);
}
