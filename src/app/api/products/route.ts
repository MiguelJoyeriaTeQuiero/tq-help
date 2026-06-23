import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageWarehouse } from "@/lib/permissions";
import { MetalFamily } from "@prisma/client";

const FAMILIES = ["MAT_OFICINA", "LIMPIEZA", "ALMACEN_TQ"] as const;

/**
 * GET /api/products
 * Lista productos. Por defecto solo activos (para la creación de pedidos).
 * Con ?all=true devuelve también los inactivos (solo gestores de almacén).
 * Filtros opcionales: ?family=...&q=...
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const family = searchParams.get("family");
  const q = searchParams.get("q")?.trim();

  const includeInactive = all && canManageWarehouse(session.user);

  const products = await prisma.product.findMany({
    where: {
      ...(includeInactive ? {} : { active: true }),
      ...(family && FAMILIES.includes(family as never) ? { family: family as MetalFamily } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ family: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

/**
 * POST /api/products
 * Crea un producto. Solo gestores de almacén (logística / superadmin).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageWarehouse(session.user)) {
    return NextResponse.json({ error: "Solo el departamento de logística puede gestionar el almacén" }, { status: 403 });
  }

  const body = await req.json();
  const { name, family, imageUrl, stock, supplier, leadTimeDays, reorderPointOverride } = body as {
    name?: string;
    family?: MetalFamily;
    imageUrl?: string | null;
    stock?: number;
    supplier?: string | null;
    leadTimeDays?: number | null;
    reorderPointOverride?: number | null;
  };

  if (!name?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  if (!family || !FAMILIES.includes(family as never)) {
    return NextResponse.json({ error: "Familia no válida" }, { status: 400 });
  }
  const initialStock = Number.isFinite(stock) ? Math.max(0, Math.floor(stock as number)) : 0;

  const exists = await prisma.product.findUnique({
    where: { family_name: { family, name: name.trim() } },
  });
  if (exists) return NextResponse.json({ error: "Ya existe un producto con ese nombre en esa familia" }, { status: 409 });

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      family,
      imageUrl: imageUrl ?? null,
      stock: initialStock,
      supplier: supplier?.trim() || null,
      leadTimeDays: leadTimeDays == null ? null : Math.max(0, Math.floor(leadTimeDays)),
      reorderPointOverride: reorderPointOverride == null ? null : Math.max(0, Math.floor(reorderPointOverride)),
    },
  });

  return NextResponse.json(product, { status: 201 });
}
