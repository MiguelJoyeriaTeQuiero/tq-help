import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  // Verify ticket access
  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true, authorId: true, targetDept: true } });
  if (!ticket) return new Response("Not found", { status: 404 });
  if (session.user.role === "EMPLOYEE" && ticket.authorId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const isInternal = session.user.role !== "EMPLOYEE";
  const encoder   = new TextEncoder();
  let   lastId    = "";
  let   closed    = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const where: any = { ticketId: id };
          if (!isInternal) where.isInternal = false;
          if (lastId) where.id = { gt: lastId };

          const comments = await prisma.comment.findMany({
            where,
            include: { author: { select: { id: true, name: true, role: true } }, attachments: true },
            orderBy: { createdAt: "asc" },
          });

          if (comments.length > 0) {
            lastId = comments[comments.length - 1].id;
            for (const c of comments) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`));
            }
          }
        } catch {
          if (!closed) { closed = true; try { controller.close(); } catch {} }
        }
      };

      // Seed with last 20 existing comments
      const existing = await prisma.comment.findMany({
        where: { ticketId: id, ...(!isInternal ? { isInternal: false } : {}) },
        include: { author: { select: { id: true, name: true, role: true } }, attachments: true },
        orderBy: { createdAt: "asc" },
        take: 20,
      });
      if (existing.length > 0) {
        lastId = existing[existing.length - 1].id;
        for (const c of existing) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`));
        }
      }

      // Poll every 3 seconds for new comments
      let ticks = 0;
      const interval = setInterval(async () => {
        ticks++;
        // Close after ~10 min so Vercel doesn't time out
        if (closed || ticks > 200) {
          clearInterval(interval);
          if (!closed) { closed = true; try { controller.close(); } catch {} }
          return;
        }
        await send();
      }, 3_000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
