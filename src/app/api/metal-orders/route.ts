import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { MetalFamily } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const where = isAdmin(session.user)
    ? { ...(status ? { status: status as never } : {}) }
    : { createdById: session.user.id, ...(status ? { status: status as never } : {}) };

  const orders = await prisma.metalOrder.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, department: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { notes, items, send } = body as {
    notes?: string;
    items: { family: MetalFamily; description?: string; quantity: number }[];
    send?: boolean; // true = enviar directamente, false = guardar borrador
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "El pedido debe tener al menos un artículo" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.family || item.quantity < 1) {
      return NextResponse.json({ error: "Cada línea debe tener familia y cantidad ≥ 1" }, { status: 400 });
    }
  }

  const order = await prisma.metalOrder.create({
    data: {
      notes,
      status: send ? "ENVIADO" : "BORRADOR",
      createdById: session.user.id,
      department: session.user.department,
      items: {
        create: items.map((i) => ({
          family: i.family,
          description: i.description ?? null,
          quantity: i.quantity,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(order, { status: 201 });
}
