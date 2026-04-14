import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/departments — list departments (active only by default; ?all=1 shows all for SUPERADMIN)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const showAll = req.nextUrl.searchParams.get("all") === "1" && session.user.role === "SUPERADMIN";

  const departments = await prisma.departmentConfig.findMany({
    where: showAll ? undefined : { active: true },
    orderBy: [{ order: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(departments);
}

const createSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "La clave debe ser mayúsculas, números y guiones bajos"),
  label: z.string().min(1).max(100),
  order: z.number().int().optional(),
});

// POST /api/departments — create new department (SUPERADMIN only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { key, label, order } = parsed.data;

  const existing = await prisma.departmentConfig.findUnique({ where: { key } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un departamento con esa clave" }, { status: 409 });
  }

  const maxOrder = await prisma.departmentConfig.aggregate({ _max: { order: true } });
  const nextOrder = order ?? (maxOrder._max.order ?? 0) + 1;

  const dept = await prisma.departmentConfig.create({
    data: { key, label, order: nextOrder },
  });

  return NextResponse.json(dept, { status: 201 });
}
