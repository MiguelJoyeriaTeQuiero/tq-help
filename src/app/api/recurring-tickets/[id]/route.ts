import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  titleTemplate: z.string().min(1).optional(),
  bodyTemplate: z.string().min(1).optional(),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  targetDept: z.array(z.string()).optional(),
  frequency: z.enum(["DIARIA", "SEMANAL", "QUINCENAL", "MENSUAL"]).optional(),
  nextRunAt: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { nextRunAt, assigneeId, ...rest } = parsed.data;
  const data: any = { ...rest };
  if (nextRunAt) data.nextRunAt = new Date(nextRunAt);
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;

  const recurring = await prisma.recurringTicket.update({ where: { id }, data });
  return NextResponse.json(recurring);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.recurringTicket.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
