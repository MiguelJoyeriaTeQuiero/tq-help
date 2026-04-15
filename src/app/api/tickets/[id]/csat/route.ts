import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const csat = await prisma.ticketCsat.findUnique({ where: { ticketId: id } });
  return NextResponse.json(csat);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.authorId !== session.user.id) {
    return NextResponse.json({ error: "Solo el autor puede valorar el ticket" }, { status: 403 });
  }
  if (ticket.status !== "CERRADO" && ticket.status !== "RESUELTO") {
    return NextResponse.json({ error: "Solo puedes valorar tickets cerrados o resueltos" }, { status: 400 });
  }

  const existing = await prisma.ticketCsat.findUnique({ where: { ticketId: id } });
  if (existing) return NextResponse.json({ error: "Ya has valorado este ticket" }, { status: 409 });

  const { rating, comment } = await req.json();
  const parsed = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().optional() })
    .safeParse({ rating, comment });
  if (!parsed.success) return NextResponse.json({ error: "Valoración inválida (1-5)" }, { status: 400 });

  const csat = await prisma.ticketCsat.create({
    data: { ticketId: id, rating: parsed.data.rating, comment: parsed.data.comment },
  });
  return NextResponse.json(csat, { status: 201 });
}
