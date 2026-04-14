import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSlaDeadline } from "@/lib/sla";
import { sendNewTicketAlertEmail } from "@/lib/mail";
import { DEPARTMENT_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
  targetDept: z.enum(["MARKETING", "LOGISTICA", "IT", "RRHH", "CONTABILIDAD", "PRODUCTO", "DIRECCION"]),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const dept = searchParams.get("dept");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: any = {};

  // Empleados solo ven sus propios tickets
  if (session.user.role === "EMPLOYEE") {
    where.authorId = session.user.id;
  } else if (session.user.role === "DEPT_ADMIN") {
    // Admin de dept ve los de su departamento destino + los suyos propios
    where.OR = [
      { targetDept: session.user.department },
      { authorId: session.user.id },
    ];
  }
  // SUPERADMIN y VIEWER ven todo

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (dept) {
    where.targetDept = dept;
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, department: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return NextResponse.json({ tickets, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, priority, targetDept, tagIds } = parsed.data;

  const slaDeadline = calculateSlaDeadline(priority as any);

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority: priority as any,
      targetDept: targetDept as any,
      originDept: session.user.department,
      authorId: session.user.id,
      slaDeadline,
      tags: tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: {
      author: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });

  // Registrar en historial
  await prisma.ticketStatusHistory.create({
    data: { ticketId: ticket.id, toStatus: "ABIERTO" },
  });

  // Notificar a admins del departamento destino
  const admins = await prisma.user.findMany({
    where: {
      department: targetDept as any,
      role: { in: ["DEPT_ADMIN", "SUPERADMIN"] },
      isActive: true,
    },
  });

  await Promise.all(
    admins.map((admin) =>
      sendNewTicketAlertEmail(
        admin.email,
        admin.name,
        ticket.id,
        ticket.title,
        TICKET_PRIORITY_LABELS[ticket.priority],
        DEPARTMENT_LABELS[ticket.originDept]
      ).catch(() => {}) // no bloquear si falla el email
    )
  );

  return NextResponse.json(ticket, { status: 201 });
}
