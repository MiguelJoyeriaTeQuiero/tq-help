import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import { sendWelcomeEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["SUPERADMIN", "DEPT_ADMIN", "EMPLOYEE", "VIEWER"]),
  department: z.enum(["MARKETING", "LOGISTICA", "IT", "RRHH", "CONTABILIDAD", "PRODUCTO", "DIRECCION"]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!isSuperAdmin(session.user)) {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
    orderBy: [{ department: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!isSuperAdmin(session.user)) {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, email, role, department } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });

  // Generar contraseña temporal aleatoria
  const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: role as any,
      department: department as any,
      passwordHash,
      mustChangePassword: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
    },
  });

  await sendWelcomeEmail(email, name, tempPassword).catch(() => {});

  return NextResponse.json(user, { status: 201 });
}
