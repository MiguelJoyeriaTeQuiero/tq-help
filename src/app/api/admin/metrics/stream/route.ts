import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function fetchLiveMetrics() {
  const [openTickets, slaBreaches, inProgressTickets, todayCount] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: ["ABIERTO", "EN_PROGRESO"] } } }),
    prisma.ticket.count({
      where: { slaDeadline: { lt: new Date() }, status: { notIn: ["RESUELTO", "CERRADO"] } },
    }),
    prisma.ticket.count({ where: { status: "EN_PROGRESO" } }),
    prisma.ticket.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);
  return { openTickets, slaBreaches, inProgressTickets, todayCount, timestamp: new Date().toISOString() };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (!isAdmin(session.user) && session.user.role !== "VIEWER")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const data = await fetchLiveMetrics();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          if (!closed) {
            closed = true;
            try { controller.close(); } catch {}
          }
        }
      };

      // Initial push
      await send();

      // Push every 20 seconds; close after ~5 mins so Vercel doesn't timeout
      let ticks = 0;
      const interval = setInterval(async () => {
        ticks++;
        if (closed || ticks > 15) {
          clearInterval(interval);
          if (!closed) { closed = true; try { controller.close(); } catch {} }
          return;
        }
        await send();
      }, 20_000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
