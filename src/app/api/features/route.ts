import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  targetDept: z.enum(["MARKETING", "LOGISTICA", "IT", "RRHH", "CONTABILIDAD", "PRODUCTO", "DIRECCION"]),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const dept = searchParams.get("dept");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (dept) where.targetDept = dept;

  const [features, total] = await Promise.all([
    prisma.featureRequest.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, department: true } },
        tags: { include: { tag: true } },
        votes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.featureRequest.count({ where }),
  ]);

  // Añadir si el usuario actual votó
  const withVoted = features.map((f) => ({
    ...f,
    hasVoted: f.votes.some((v) => v.userId === session.user.id),
  }));

  return NextResponse.json({ features: withVoted, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.role === "VIEWER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, description, targetDept, tagIds } = parsed.data;

  const feature = await prisma.featureRequest.create({
    data: {
      title,
      description,
      targetDept: targetDept as any,
      originDept: session.user.department,
      authorId: session.user.id,
      tags: tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: {
      author: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });

  await prisma.featureStatusHistory.create({
    data: { featureId: feature.id, toStatus: "PENDIENTE" },
  });

  return NextResponse.json(feature, { status: 201 });
}
