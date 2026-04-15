import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  titleTemplate: z.string().min(1),
  bodyTemplate: z.string().min(1),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA"),
  targetDept: z.array(z.string()).min(1, "Selecciona al menos un departamento"),
  frequency: z.enum(["DIARIA", "SEMANAL", "QUINCENAL", "MENSUAL"]),
  nextRunAt: z.string(), // ISO date string
  assigneeId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recurring = await prisma.recurringTicket.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      _count: { select: { generatedTickets: true } },
    },
    orderBy: { nextRunAt: "asc" },
  });
  return NextResponse.json(recurring);
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

  const { nextRunAt, assigneeId, ...rest } = parsed.data;
  const recurring = await prisma.recurringTicket.create({
    data: {
      ...rest,
      nextRunAt: new Date(nextRunAt),
      assigneeId: assigneeId || undefined,
      createdById: session.user.id,
    },
  });
  return NextResponse.json(recurring, { status: 201 });
}
