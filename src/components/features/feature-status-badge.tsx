import { Badge } from "@/components/ui/badge";
import { FEATURE_STATUS_LABELS, FEATURE_STATUS_COLORS } from "@/lib/utils";
import { FeatureStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <Badge className={cn(FEATURE_STATUS_COLORS[status])}>
      {FEATURE_STATUS_LABELS[status]}
    </Badge>
  );
}
