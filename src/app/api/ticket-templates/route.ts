import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  titlePreset: z.string().min(1, "Título plantilla requerido"),
  bodyPreset: z.string().min(1, "Cuerpo plantilla requerido"),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA"),
  targetDept: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = new URL(req.url).searchParams.get("all") === "1"
    && ["SUPERADMIN","DEPT_ADMIN"].includes(session.user.role);

  const templates = await prisma.ticketTemplate.findMany({
    where: all ? {} : { isActive: true },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const template = await prisma.ticketTemplate.create({
    data: { ...parsed.data, createdById: session.user.id },
  });
  return NextResponse.json(template, { status: 201 });
}
