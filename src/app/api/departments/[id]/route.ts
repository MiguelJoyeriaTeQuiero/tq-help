import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

// PATCH /api/departments/[id] — update label, active or order (SUPERADMIN only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const dept = await prisma.departmentConfig.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(dept);
}

// DELETE /api/departments/[id] — soft-delete (set active=false) (SUPERADMIN only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  // Soft delete — keep historical data intact
  const dept = await prisma.departmentConfig.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json(dept);
}
