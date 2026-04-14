import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const feature = await prisma.featureRequest.findUnique({ where: { id } });
  if (!feature) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const isInternal = session.user.role === "EMPLOYEE" ? false : parsed.data.isInternal;

  if (isInternal && !canSeeInternalComments(session.user, feature.targetDept)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const comment = await prisma.featureComment.create({
    data: {
      content: parsed.data.content,
      isInternal,
      authorId: session.user.id,
      featureId: id,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
