import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTicketUpdateEmail } from "@/lib/mail";
import { canSeeInternalComments } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  if (!ticket) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Empleado solo puede comentar sus propios tickets y solo externamente
  if (session.user.role === "EMPLOYEE" && ticket.authorId !== session.user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Empleado no puede crear comentarios internos
  const isInternal = session.user.role === "EMPLOYEE" ? false : parsed.data.isInternal;

  if (isInternal && !canSeeInternalComments(session.user, ticket.targetDept)) {
    return NextResponse.json({ error: "Sin permisos para comentario interno" }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      isInternal,
      authorId: session.user.id,
      ticketId: id,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  // Notificar al autor si el comentario es externo y no lo hizo el propio autor
  if (!isInternal && session.user.id !== ticket.authorId) {
    await sendTicketUpdateEmail(
      ticket.author.email,
      ticket.author.name,
      id,
      ticket.title,
      ticket.status,
      "Se ha añadido una respuesta a tu incidencia."
    ).catch(() => {});
  }

  // Parse @mentions: find all @word in content
  const mentions = parsed.data.content.match(/@(\w+)/g)?.map((m) => m.slice(1)) ?? [];
  for (const mention of mentions) {
    const mentionedUser = await prisma.user.findFirst({
      where: { name: { contains: mention, mode: "insensitive" } },
    });
    if (mentionedUser && mentionedUser.id !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: mentionedUser.id,
          type: "MENTION",
          title: "Te han mencionado",
          message: `${session.user.name} te mencionó en una incidencia`,
          link: `/tickets/${id}`,
        },
      });
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
