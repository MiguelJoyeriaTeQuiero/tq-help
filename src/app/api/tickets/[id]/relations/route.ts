import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const relations = await prisma.ticketRelation.findMany({
    where: { OR: [{ sourceId: id }, { targetId: id }] },
    include: {
      source: { select: { id: true, title: true, status: true, priority: true } },
      target: { select: { id: true, title: true, status: true, priority: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Normalize from the perspective of `id`
  const normalized = relations.map((r) => ({
    id: r.id,
    relationType: r.relationType,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    linkedTicket: r.sourceId === id ? r.target : r.source,
    direction: r.sourceId === id ? "outgoing" : "incoming",
  }));

  return NextResponse.json(normalized);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId } = await params;
  const { targetId, relationType } = await req.json();

  if (!targetId || !relationType) {
    return NextResponse.json({ error: "targetId and relationType required" }, { status: 400 });
  }
  if (sourceId === targetId) {
    return NextResponse.json({ error: "No puedes relacionar un ticket consigo mismo" }, { status: 400 });
  }

  const symmetricTypes = ["RELACIONADO", "DUPLICADO"];
  const isSymmetric = symmetricTypes.includes(relationType);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const rel = await tx.ticketRelation.create({
        data: { sourceId, targetId, relationType, createdById: session.user.id },
      });
      // Symmetric: also create inverse
      if (isSymmetric) {
        await tx.ticketRelation.upsert({
          where: { sourceId_targetId_relationType: { sourceId: targetId, targetId: sourceId, relationType } },
          update: {},
          create: { sourceId: targetId, targetId: sourceId, relationType, createdById: session.user.id },
        });
      }
      return rel;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Esta relación ya existe" }, { status: 409 });
    throw e;
  }
}
