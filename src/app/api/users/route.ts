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
  department: z.string().min(1),
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

  // Generar contraseña con iniciales + 4 números + !
  const tempPassword = generatePasswordFromName(name);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: role as any,
      department,
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

  // Devolver también la contraseña generada para que el admin pueda comunicarla
  return NextResponse.json({ ...user, generatedPassword: tempPassword }, { status: 201 });
}
