import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  EN_STOCK:      "bg-blue-100 text-blue-700",
  ASIGNADO:      "bg-green-100 text-green-700",
  EN_REPARACION: "bg-yellow-100 text-yellow-700",
  DADO_DE_BAJA:  "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  EN_STOCK:      "En stock",
  ASIGNADO:      "Asignado",
  EN_REPARACION: "En reparación",
  DADO_DE_BAJA:  "Dado de baja",
};

export function AssetStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
