import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSlaDeadline } from "@/lib/sla";
import { sendNewTicketAlertEmail } from "@/lib/mail";
import { DEPARTMENT_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/utils";
import { evaluateRules } from "@/lib/rules-engine";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
  targetDept: z.array(z.string().min(1)).min(1, "Selecciona al menos un departamento destino"),
  tagIds: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const dept = searchParams.get("dept");
  const approvalPending = searchParams.get("approvalPending") === "1";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: any = {};

  if (session.user.role === "EMPLOYEE") {
    where.authorId = session.user.id;
  } else if (session.user.role === "DEPT_ADMIN") {
    where.OR = [
      { targetDept: { has: session.user.department } },
      { authorId: session.user.id },
    ];
  }

  if (status) {
    if (status.includes(",")) {
      where.status = { in: status.split(",") };
    } else {
      where.status = status;
    }
  }
  if (priority) where.priority = priority;
  if (dept) where.targetDept = { has: dept };
  if (approvalPending) where.approvalStatus = "PENDIENTE";

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

  const { title, description, priority, targetDept, tagIds, requiresApproval } = parsed.data;
  const slaDeadline = calculateSlaDeadline(priority as any);

  // Evaluate business rules
  const rules = await prisma.businessRule.findMany({ where: { isActive: true } });
  const mutation = evaluateRules("TICKET_CREATED", { title, description, priority, targetDept, originDept: session.user.department }, rules);

  const effectivePriority = (mutation.priority as any) ?? priority;
  const effectiveTargetDept = mutation.targetDept ?? targetDept;
  const effectiveAssigneeId = mutation.assigneeId ?? undefined;

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority: effectivePriority,
      targetDept: effectiveTargetDept,
      originDept: session.user.department,
      authorId: session.user.id,
      slaDeadline,
      assigneeId: effectiveAssigneeId,
      requiresApproval: !!requiresApproval,
      approvalStatus: requiresApproval ? "PENDIENTE" : undefined,
      tags: tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: {
      author: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });

  // Apply rule tag mutations
  if (mutation.tagIds?.length) {
    await prisma.ticketTag.createMany({
      data: mutation.tagIds.map((tagId) => ({ ticketId: ticket.id, tagId })),
      skipDuplicates: true,
    });
  }

  // Create approval record if needed
  if (requiresApproval) {
    await prisma.ticketApproval.create({
      data: { ticketId: ticket.id },
    });
  }

  // Register status history
  await prisma.ticketStatusHistory.create({
    data: { ticketId: ticket.id, toStatus: "ABIERTO" },
  });

  // Notify admins
  const admins = await prisma.user.findMany({
    where: {
      department: { in: effectiveTargetDept },
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
      ).catch(() => {})
    )
  );

  return NextResponse.json(ticket, { status: 201 });
}
