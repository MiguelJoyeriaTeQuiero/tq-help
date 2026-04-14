import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTickets } from "@/lib/permissions";
import { sendFeatureUpdateEmail } from "@/lib/mail";
import { FEATURE_STATUS_LABELS } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDIENTE", "EN_REVISION", "EN_DESARROLLO", "COMPLETADO", "DESCARTADO"]).optional(),
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, department: true } },
      tags: { include: { tag: true } },
      attachments: true,
      votes: { select: { userId: true } },
      statusHistory: { orderBy: { changedAt: "asc" } },
      comments: {
        where: session.user.role === "EMPLOYEE" ? { isInternal: false } : undefined,
        include: {
          author: { select: { id: true, name: true, role: true } },
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
      },
      convertedFrom: { select: { id: true, title: true } },
    },
  });

  if (!feature) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    ...feature,
    hasVoted: feature.votes.some((v) => v.userId === session.user.id),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const feature = await prisma.featureRequest.findUnique({ where: { id } });
  if (!feature) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!canManageTickets(session.user, feature.targetDept)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, title, description, tagIds } = parsed.data;
  const updates: any = {};
  if (status) updates.status = status;
  if (title) updates.title = title;
  if (description) updates.description = description;

  if (status && status !== feature.status) {
    await prisma.featureStatusHistory.create({
      data: { featureId: id, fromStatus: feature.status, toStatus: status as any },
    });
  }

  if (tagIds !== undefined) {
    await prisma.featureTag.deleteMany({ where: { featureId: id } });
    if (tagIds.length > 0) {
      await prisma.featureTag.createMany({
        data: tagIds.map((tagId) => ({ featureId: id, tagId })),
      });
    }
  }

  const updated = await prisma.featureRequest.update({
    where: { id },
    data: updates,
  });

  // Notificar a todos los que votaron
  if (status && status !== feature.status) {
    const voters = await prisma.vote.findMany({
      where: { featureId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await Promise.all(
      voters.map((v) =>
        Promise.all([
          sendFeatureUpdateEmail(
            v.user.email,
            v.user.name,
            id,
            updated.title,
            FEATURE_STATUS_LABELS[updated.status]
          ).catch(() => {}),
          prisma.notification.create({
            data: {
              userId: v.user.id,
              type: "FEATURE_STATUS_CHANGED",
              title: "Petición actualizada",
              message: `"${updated.title}" pasó a ${FEATURE_STATUS_LABELS[updated.status]}`,
              link: `/roadmap/${id}`,
            },
          }),
        ])
      )
    );
  }

  return NextResponse.json(updated);
}
