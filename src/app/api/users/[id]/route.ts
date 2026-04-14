import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"]).optional(),
  department: z.enum(["MARKETING", "LOGISTICA", "IT", "RRHH", "CONTABILIDAD", "PRODUCTO", "DIRECCION"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!isSuperAdmin(session.user)) {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data as any,
    select: { id: true, name: true, email: true, role: true, department: true, isActive: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!isSuperAdmin(session.user)) {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const { id } = await params;

  // Desactivar en vez de borrar para preservar historial
  await prisma.user.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ ok: true });
}
