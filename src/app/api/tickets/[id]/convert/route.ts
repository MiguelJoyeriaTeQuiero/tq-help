import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTickets } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!canManageTickets(session.user, ticket.targetDept)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Verificar si ya fue convertido
  const existing = await prisma.featureRequest.findUnique({ where: { convertedFromTicketId: id } });
  if (existing) {
    return NextResponse.json({ error: "Este ticket ya fue convertido en petición" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const feature = await prisma.featureRequest.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      originDept: ticket.originDept,
      targetDept: ticket.targetDept,
      authorId: ticket.authorId,
      convertedFromTicketId: ticket.id,
    },
  });

  await prisma.featureStatusHistory.create({
    data: { featureId: feature.id, toStatus: "PENDIENTE" },
  });

  return NextResponse.json(feature, { status: 201 });
}
