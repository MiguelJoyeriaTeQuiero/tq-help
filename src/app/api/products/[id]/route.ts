import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageWarehouse } from "@/lib/permissions";
import { MetalFamily } from "@prisma/client";

const FAMILIES = ["MAT_OFICINA", "LIMPIEZA", "ALMACEN_TQ"] as const;

/**
 * PATCH /api/products/[id]
 * Edita un producto (nombre, familia, foto, estado activo). Solo gestores de almacén.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageWarehouse(session.user)) {
    return NextResponse.json({ error: "Solo el departamento de logística puede gestionar el almacén" }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json();
  const { name, family, imageUrl, active } = body as {
    name?: string;
    family?: MetalFamily;
    imageUrl?: string | null;
    active?: boolean;
  };

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
  }
  if (family !== undefined && !FAMILIES.includes(family as never)) {
    return NextResponse.json({ error: "Familia no válida" }, { status: 400 });
  }

  const nextName = name !== undefined ? name.trim() : product.name;
  const nextFamily = family ?? product.family;

  // Evitar colisión con el índice único (family, name)
  if (nextName !== product.name || nextFamily !== product.family) {
    const clash = await prisma.product.findUnique({
      where: { family_name: { family: nextFamily, name: nextName } },
    });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "Ya existe un producto con ese nombre en esa familia" }, { status: 409 });
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: nextName } : {}),
      ...(family !== undefined ? { family } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/products/[id]
 * Elimina un producto si no tiene pedidos asociados; si los tiene, lo desactiva.
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageWarehouse(session.user)) {
    return NextResponse.json({ error: "Solo el departamento de logística puede gestionar el almacén" }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  if (product._count.orderItems > 0) {
    // Tiene historial de pedidos: lo desactivamos en lugar de borrarlo para no romper referencias.
    const deactivated = await prisma.product.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ...deactivated, deactivated: true });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
