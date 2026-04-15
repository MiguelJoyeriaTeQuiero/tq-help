import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { advanceNextRunAt } from "@/lib/recurring";
import { calculateSlaDeadline } from "@/lib/sla";

// Called by Vercel Cron daily at 07:00 UTC.
// Also callable manually with the CRON_SECRET header.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dueItems = await prisma.recurringTicket.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { createdBy: { select: { id: true, department: true } } },
  });

  const results: string[] = [];

  for (const item of dueItems) {
    const slaDeadline = calculateSlaDeadline(item.priority as any);
    const ticket = await prisma.ticket.create({
      data: {
        title: item.titleTemplate,
        description: item.bodyTemplate,
        priority: item.priority,
        targetDept: item.targetDept,
        originDept: item.createdBy.department,
        authorId: item.createdById,
        assigneeId: item.assigneeId ?? undefined,
        recurringSourceId: item.id,
        slaDeadline,
      },
    });

    await prisma.ticketStatusHistory.create({
      data: { ticketId: ticket.id, toStatus: "ABIERTO" },
    });

    const nextRunAt = advanceNextRunAt(now, item.frequency as any);
    await prisma.recurringTicket.update({
      where: { id: item.id },
      data: { lastRunAt: now, nextRunAt },
    });

    results.push(ticket.id);
  }

  return NextResponse.json({ processed: results.length, ticketIds: results });
}

export async function GET(req: NextRequest) {
  // Allow GET for Vercel Cron (it sends GET by default)
  return POST(req);
}
