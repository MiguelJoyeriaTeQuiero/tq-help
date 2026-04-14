import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.role === "VIEWER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;

  const feature = await prisma.featureRequest.findUnique({ where: { id } });
  if (!feature) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existing = await prisma.vote.findUnique({
    where: { userId_featureId: { userId: session.user.id, featureId: id } },
  });

  if (existing) {
    // Toggle: quitar voto
    await prisma.vote.delete({ where: { id: existing.id } });
    await prisma.featureRequest.update({
      where: { id },
      data: { voteCount: { decrement: 1 } },
    });
    return NextResponse.json({ voted: false });
  } else {
    // Añadir voto
    await prisma.vote.create({ data: { userId: session.user.id, featureId: id } });
    await prisma.featureRequest.update({
      where: { id },
      data: { voteCount: { increment: 1 } },
    });
    return NextResponse.json({ voted: true });
  }
}
