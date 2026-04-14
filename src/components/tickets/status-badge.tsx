import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from "@/lib/utils";
import { TicketStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge className={cn(TICKET_STATUS_COLORS[status])}>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}
