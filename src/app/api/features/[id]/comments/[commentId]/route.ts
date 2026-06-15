import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Cualquier admin (DEPT_ADMIN o SUPERADMIN) puede eliminar comentarios.
  if (!isAdmin(session.user)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id, commentId } = await params;

  const comment = await prisma.featureComment.findUnique({
    where: { id: commentId },
    select: { id: true, featureId: true },
  });
  if (!comment || comment.featureId !== id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Los adjuntos del comentario se borran en cascada (onDelete: Cascade).
  await prisma.featureComment.delete({ where: { id: commentId } });

  return NextResponse.json({ ok: true });
}
