import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const conditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  isActive: z.boolean().default(true),
  event: z.enum(["TICKET_CREATED", "TICKET_UPDATED"]),
  conditions: z.array(conditionSchema).min(1, "Al menos una condición"),
  action: z.object({ type: z.string(), value: z.string() }),
  order: z.number().int().default(0),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.businessRule.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const rule = await prisma.businessRule.create({
    data: { ...parsed.data, createdById: session.user.id },
  });
  return NextResponse.json(rule, { status: 201 });
}
