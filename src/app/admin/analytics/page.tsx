import { redirect } from "next/navigation";

// Merged into /admin — tabs: Resumen | Analytics | Agentes | Exportar
export default function AnalyticsRedirect() {
  redirect("/admin");
}
