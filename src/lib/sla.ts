import { TicketPriority } from "@prisma/client";

// Minutos por prioridad
const SLA_MINUTES: Record<TicketPriority, number> = {
  CRITICA: 240,       // 4 horas
  ALTA: 480,          // 8 horas laborables
  MEDIA: 4320,        // 3 días laborables (3 * 8 * 60)
  BAJA: 7200,         // 5 días laborables (5 * 8 * 60)
};

export function calculateSlaDeadline(priority: TicketPriority, from: Date = new Date()): Date {
  const minutes = SLA_MINUTES[priority];
  return new Date(from.getTime() + minutes * 60 * 1000);
}

export function isSlaBreached(deadline: Date | null): boolean {
  if (!deadline) return false;
  return new Date() > deadline;
}
