/**
 * GET /api/metal-orders/[id]/report
 * Genera un PDF con los artículos que el admin ha marcado como no disponibles (cantidad = 0).
 * Accesible para el creador del pedido y para admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { MetalOrderReportDocument } from "@/components/pdf/metal-order-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const unavailable = order.items.filter((it) => it.quantity === 0);
  if (unavailable.length === 0) {
    return NextResponse.json({ error: "No hay artículos marcados como no disponibles" }, { status: 400 });
  }

  const data = {
    orderId:    order.id,
    department: order.createdBy.department,
    createdBy:  order.createdBy.name,
    notes:      order.notes,
    generatedAt: new Date().toISOString(),
    unavailableItems: unavailable.map((it) => ({
      family:           it.family,
      description:      it.description,
      originalQuantity: it.originalQuantity ?? 0,
    })),
    totalUnavailable: unavailable.length,
    totalItems:       order.items.length,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(MetalOrderReportDocument, { data }) as any);
  const date   = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="no-disponibles-${date}.pdf"`,
    },
  });
}
