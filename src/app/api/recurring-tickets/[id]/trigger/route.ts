import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { advanceNextRunAt } from "@/lib/recurring";
import { calculateSlaDeadline } from "@/lib/sla";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "DEPT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const recurring = await prisma.recurringTicket.findUnique({ where: { id } });
  if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slaDeadline = calculateSlaDeadline(recurring.priority as any);

  const ticket = await prisma.ticket.create({
    data: {
      title: recurring.titleTemplate,
      description: recurring.bodyTemplate,
      priority: recurring.priority,
      targetDept: recurring.targetDept,
      originDept: session.user.department,
      authorId: session.user.id,
      assigneeId: recurring.assigneeId ?? undefined,
      recurringSourceId: recurring.id,
      slaDeadline,
    },
  });

  await prisma.ticketStatusHistory.create({
    data: { ticketId: ticket.id, toStatus: "ABIERTO" },
  });

  // Advance nextRunAt
  const nextRunAt = advanceNextRunAt(new Date(), recurring.frequency as any);
  await prisma.recurringTicket.update({
    where: { id },
    data: { lastRunAt: new Date(), nextRunAt },
  });

  return NextResponse.json({ ticket, nextRunAt }, { status: 201 });
}
