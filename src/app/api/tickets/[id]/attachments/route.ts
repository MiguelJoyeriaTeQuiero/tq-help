import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  filename: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });

  // Solo el autor o un admin puede añadir adjuntos
  if (session.user.role === "EMPLOYEE" && ticket.authorId !== session.user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { mimeType } = parsed.data;
  const type = mimeType.startsWith("image/") ? "IMAGE"
    : mimeType.startsWith("video/") ? "VIDEO"
    : "DOCUMENT";

  const attachment = await prisma.attachment.create({
    data: {
      ...parsed.data,
      type: type as any,
      ticketId: id,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
