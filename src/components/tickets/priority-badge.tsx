import { Badge } from "@/components/ui/badge";
import { TICKET_PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/utils";
import { TicketPriority } from "@prisma/client";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge className={cn(PRIORITY_COLORS[priority])}>
      {priority === "CRITICA" && "🔴 "}
      {priority === "ALTA" && "🟠 "}
      {TICKET_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
