import { Badge } from "@/components/ui/badge";
import { TICKET_PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/utils";
import { TicketPriority } from "@prisma/client";
import { cn } from "@/lib/utils";

const DOT_COLORS: Record<TicketPriority, string> = {
  CRITICA: "bg-red-500",
  ALTA:    "bg-orange-500",
  MEDIA:   "bg-blue-500",
  BAJA:    "bg-slate-400",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge className={cn("inline-flex items-center gap-1.5", PRIORITY_COLORS[priority])}>
      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", DOT_COLORS[priority])} />
      {TICKET_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
