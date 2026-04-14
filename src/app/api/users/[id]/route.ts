import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"]).optional(),
  department: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
  newPassword: z.string().min(4).max(100).optional(),
});

function generatePasswordFromName(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("");
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `${initials}${numbers}!`;
}

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

  const { resetPassword, newPassword, ...rest } = parsed.data;

  // Si se pide resetear contraseña
  if (resetPassword) {
    const target = await prisma.user.findUnique({ where: { id }, select: { name: true } });
    if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const generated = newPassword ?? generatePasswordFromName(target.name);
    const hash = await bcrypt.hash(generated, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: hash, mustChangePassword: true },
    });

    return NextResponse.json({ ok: true, generatedPassword: generated });
  }

  const user = await prisma.user.update({
    where: { id },
    data: rest as any,
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
