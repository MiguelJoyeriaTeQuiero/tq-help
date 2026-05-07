import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSlaDeadline } from "@/lib/sla";
import { z } from "zod";

const schema = z.object({
  accionId: z.string().min(1),
  titulo: z.string().min(1),
  descripcion: z.string().min(1),
  tiendaNombre: z.string().min(1),
  tiendaIsla: z.string().optional().default(""),
  visitaId: z.string().min(1),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional().default("MEDIA"),
});

/**
 * Machine-to-machine endpoint for TQ Academy → TQ-HELP ticket creation.
 * Auth: x-integration-secret header == TQACADEMY_INTEGRATION_SECRET env var.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TQACADEMY_INTEGRATION_SECRET;
  if (!secret || req.headers.get("x-integration-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { accionId, titulo, descripcion, tiendaNombre, tiendaIsla, visitaId, prioridad } = parsed.data;

  // Idempotent: if a ticket already exists for this accion, return it
  const existing = await prisma.ticket.findUnique({ where: { tqacademyAccionId: accionId } });
  if (existing) {
    return NextResponse.json({ id: existing.id, message: "Ticket ya existente" }, { status: 200 });
  }

  // Use the first SUPERADMIN as system author
  const systemUser = await prisma.user.findFirst({
    where: { role: "SUPERADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!systemUser) {
    return NextResponse.json({ error: "No hay superadmin disponible como autor" }, { status: 500 });
  }

  const fullDescription = [
    `**Acción correctiva generada automáticamente desde TQ Academy**`,
    ``,
    descripcion,
    ``,
    `---`,
    `_Tienda: ${tiendaNombre}${tiendaIsla ? ` · ${tiendaIsla}` : ""} · Visita ID: ${visitaId}_`,
  ].join("\n");

  const slaDeadline = calculateSlaDeadline(prioridad);
  const ticket = await prisma.ticket.create({
    data: {
      title: titulo,
      description: fullDescription,
      priority: prioridad,
      targetDept: ["OPERACIONES"],
      originDept: "VISITAS",
      authorId: systemUser.id,
      slaDeadline,
      tqacademyAccionId: accionId,
    },
  });

  await prisma.ticketStatusHistory.create({
    data: { ticketId: ticket.id, toStatus: "ABIERTO" },
  });

  return NextResponse.json({ id: ticket.id, message: "Ticket creado" }, { status: 201 });
}
