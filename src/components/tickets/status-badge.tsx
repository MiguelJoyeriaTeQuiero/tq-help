import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_LABELS } from "@/lib/utils";
import { TicketStatus } from "@prisma/client";

type Variant = "default" | "success" | "warning" | "info" | "danger" | "neutral";

const STATUS_VARIANT: Record<TicketStatus, Variant> = {
  ABIERTO: "info",
  EN_PROGRESO: "warning",
  RESUELTO: "success",
  CERRADO: "neutral",
};

// Estados neutros/en curso → dot. Estados finales destacados → pill lleno.
const USE_DOT: Record<TicketStatus, boolean> = {
  ABIERTO: true,
  EN_PROGRESO: true,
  RESUELTO: false,
  CERRADO: true,
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} dot={USE_DOT[status]}>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}
