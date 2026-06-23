import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageWarehouse } from "@/lib/permissions";
import {
  getReplenishmentSettings,
  computeReplenishment,
  type ProductDemand,
} from "@/lib/replenishment";

/**
 * GET /api/products/replenishment
 * Calcula, para cada producto activo, sus métricas de reposición a partir del
 * histórico de pedidos (demanda solicitada). Solo gestores de almacén.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageWarehouse(session.user)) {
    return NextResponse.json({ error: "Solo el departamento de logística puede gestionar el almacén" }, { status: 403 });
  }

  const cfg = await getReplenishmentSettings();
  const now = new Date();
  const windowStart = new Date(now.getTime() - cfg.windowMonths * 30 * 86_400_000);

  const [products, items] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ family: "asc" }, { name: "asc" }] }),
    prisma.metalOrderItem.findMany({
      where: {
        productId: { not: null },
        order: { status: { notIn: ["BORRADOR", "CANCELADO"] }, createdAt: { gte: windowStart } },
      },
      select: {
        productId: true,
        quantity: true,
        originalQuantity: true,
        order: { select: { id: true, createdAt: true } },
      },
    }),
  ]);

  // Agrupar demanda por producto (usando la cantidad SOLICITADA: originalQuantity ?? quantity)
  const demandByProduct = new Map<string, ProductDemand & { orderIds: Set<string> }>();
  for (const it of items) {
    if (!it.productId) continue;
    const requested = it.originalQuantity ?? it.quantity;
    let d = demandByProduct.get(it.productId);
    if (!d) {
      d = { totalDemand: 0, orderCount: 0, firstOrderAt: null, orderIds: new Set() };
      demandByProduct.set(it.productId, d);
    }
    d.totalDemand += requested;
    d.orderIds.add(it.order.id);
    if (!d.firstOrderAt || it.order.createdAt < d.firstOrderAt) d.firstOrderAt = it.order.createdAt;
  }

  const result = products.map((p) => {
    const d = demandByProduct.get(p.id);
    const demand: ProductDemand = {
      totalDemand: d?.totalDemand ?? 0,
      orderCount: d?.orderIds.size ?? 0,
      firstOrderAt: d?.firstOrderAt ?? null,
    };
    const metrics = computeReplenishment(p, demand, cfg, now);
    return {
      id: p.id,
      name: p.name,
      family: p.family,
      imageUrl: p.imageUrl,
      stock: p.stock,
      supplier: p.supplier,
      leadTimeDays: p.leadTimeDays,
      reorderPointOverride: p.reorderPointOverride,
      replenishmentRequested: p.replenishmentRequested,
      demand,
      ...metrics,
    };
  });

  return NextResponse.json({
    config: cfg,
    inCampaign: result[0]?.inCampaign ?? cfg.campaignMonths.includes(now.getMonth() + 1),
    products: result,
  });
}
