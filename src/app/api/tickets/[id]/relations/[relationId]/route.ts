import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; relationId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { relationId } = await params;
  const relation = await prisma.ticketRelation.findUnique({ where: { id: relationId } });
  if (!relation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const symmetricTypes = ["RELACIONADO", "DUPLICADO"];

  await prisma.$transaction(async (tx) => {
    await tx.ticketRelation.delete({ where: { id: relationId } });
    // Remove symmetric inverse if applicable
    if (symmetricTypes.includes(relation.relationType)) {
      await tx.ticketRelation.deleteMany({
        where: {
          sourceId: relation.targetId,
          targetId: relation.sourceId,
          relationType: relation.relationType,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
