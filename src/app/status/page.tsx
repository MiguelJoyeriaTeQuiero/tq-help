import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG = {
  OPERATIONAL:  { label: "Operativo",      color: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  DEGRADED:     { label: "Degradado",      color: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  INCIDENT:     { label: "Incidencia",     color: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  MAINTENANCE:  { label: "Mantenimiento",  color: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
};

export const revalidate = 60; // ISR: revalidate every 60s

export default async function StatusPage() {
  const services = await prisma.serviceStatus.findMany({
    include: {
      incidents: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { order: "asc" },
  });

  const allOperational = services.every((s) => s.status === "OPERATIONAL");
  const hasIncident = services.some((s) => s.status === "INCIDENT");
  const hasDegraded = services.some((s) => s.status === "DEGRADED");

  const overallStatus = hasIncident ? "INCIDENT" : hasDegraded ? "DEGRADED" : "OPERATIONAL";
  const overall = STATUS_CONFIG[overallStatus as keyof typeof STATUS_CONFIG];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className={`h-4 w-4 rounded-full ${overall.color}`} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Estado del Sistema</h1>
              <p className={`text-sm font-medium mt-0.5 ${overall.text}`}>
                {allOperational
                  ? "Todos los sistemas operativos"
                  : hasIncident
                  ? "Hay una o más incidencias activas"
                  : "Algunos sistemas funcionan con degradación"}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Última actualización: {format(new Date(), "dd MMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {services.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No hay servicios configurados</div>
        ) : (
          <>
            {/* Services list */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Servicios</h2>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                {services.map((service) => {
                  const cfg = STATUS_CONFIG[service.status as keyof typeof STATUS_CONFIG];
                  return (
                    <div key={service.id} className="flex items-center gap-4 px-4 py-4">
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{service.description}</p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Active incidents */}
            {services.some((s) => s.incidents.some((i) => !i.resolvedAt)) && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Incidencias activas</h2>
                <div className="space-y-3">
                  {services.flatMap((service) =>
                    service.incidents
                      .filter((i) => !i.resolvedAt)
                      .map((incident) => (
                        <div key={incident.id} className="rounded-xl border border-red-200 bg-red-50 p-4">
                          <div className="flex items-start gap-2">
                            <span className="text-red-500 text-lg leading-none">⚠</span>
                            <div>
                              <p className="font-semibold text-red-900">{incident.title}</p>
                              <p className="text-xs text-red-600 mt-0.5">{service.name}</p>
                              <p className="text-sm text-red-800 mt-2 whitespace-pre-wrap">{incident.message}</p>
                              <p className="text-xs text-red-500 mt-2">
                                {format(new Date(incident.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>
            )}

            {/* Recent resolved incidents */}
            {services.some((s) => s.incidents.some((i) => i.resolvedAt)) && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Historial reciente</h2>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                  {services.flatMap((service) =>
                    service.incidents
                      .filter((i) => i.resolvedAt)
                      .map((incident) => (
                        <div key={incident.id} className="flex items-start gap-3 px-4 py-3">
                          <span className="text-green-500 text-sm mt-0.5">✓</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700">{incident.title}</p>
                            <p className="text-xs text-slate-400">{service.name} · resuelto {format(new Date(incident.resolvedAt!), "dd/MM HH:mm", { locale: es })}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          TQ-HELP · Portal de Estado
        </div>
      </footer>
    </div>
  );
}
