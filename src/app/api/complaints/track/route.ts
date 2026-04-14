import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Consulta pública por código de seguimiento — sin autenticación
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.json({ error: "Código requerido" }, { status: 400 });

  const complaint = await prisma.complaint.findUnique({
    where: { trackingCode: code.toUpperCase() },
    select: {
      trackingCode: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      statusHistory: {
        select: { toStatus: true, changedAt: true },
        orderBy: { changedAt: "asc" },
      },
    },
  });

  if (!complaint) return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });

  // No se expone ningún dato interno ni notas
  return NextResponse.json(complaint);
}
