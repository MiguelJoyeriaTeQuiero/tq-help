"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG = {
  OPERATIONAL:  { label: "Operativo",     color: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  DEGRADED:     { label: "Degradado",     color: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  INCIDENT:     { label: "Incidencia",    color: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  MAINTENANCE:  { label: "Mantenimiento", color: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

export default function EstadoAdminPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Service form
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcOrder, setSvcOrder] = useState(0);
  const [savingSvc, setSavingSvc] = useState(false);

  // Incident form
  const [showIncForm, setShowIncForm] = useState<string | null>(null);
  const [incTitle, setIncTitle] = useState("");
  const [incMessage, setIncMessage] = useState("");
  const [incStatus, setIncStatus] = useState("INCIDENT");
  const [savingInc, setSavingInc] = useState(false);

  const load = async () => {
    const res = await fetch("/api/status?all=1");
    if (res.ok) setServices(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSvc(true);
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: svcName, description: svcDesc, order: svcOrder }),
    });
    setSvcName(""); setSvcDesc(""); setSvcOrder(0); setShowSvcForm(false);
    setSavingSvc(false);
    load();
  };

  const updateServiceStatus = async (serviceId: string, status: string) => {
    await fetch(`/api/status/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const createIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showIncForm) return;
    setSavingInc(true);
    await fetch(`/api/status/${showIncForm}/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: incTitle, message: incMessage, setStatus: incStatus }),
    });
    setIncTitle(""); setIncMessage(""); setShowIncForm(null);
    setSavingInc(false);
    load();
  };

  const resolveIncident = async (_serviceId: string, incidentId: string) => {
    await fetch(`/api/status/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    load();
  };

  const deleteService = async (serviceId: string) => {
    if (!confirm("¿Eliminar este servicio y todos sus incidentes?")) return;
    await fetch(`/api/status/${serviceId}`, { method: "DELETE" });
    load();
  };

  return (
    <AppLayout title="Estado del sistema">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Portal de estado</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Gestiona servicios e incidencias visibles públicamente en{" "}
              <a href="/status" target="_blank" className="text-indigo-600 hover:underline">/status</a>
            </p>
          </div>
          <Button onClick={() => setShowSvcForm((p) => !p)}>
            {showSvcForm ? "Cancelar" : "+ Nuevo servicio"}
          </Button>
        </div>

        {/* New service form */}
        {showSvcForm && (
          <Card>
            <CardHeader><CardTitle>Nuevo servicio</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createService} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                    <input
                      value={svcName} onChange={(e) => setSvcName(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Ej: API principal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Orden</label>
                    <input
                      type="number" value={svcOrder} onChange={(e) => setSvcOrder(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                  <input
                    value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Descripción breve (opcional)"
                  />
                </div>
                <Button type="submit" size="sm" loading={savingSvc}>Crear servicio</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-400">Cargando servicios...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No hay servicios configurados. Crea el primero.</div>
        ) : (
          <div className="space-y-4">
            {services.map((svc) => {
              const cfg = STATUS_CONFIG[svc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.OPERATIONAL;
              const openIncidents = svc.incidents?.filter((i: any) => !i.resolvedAt) ?? [];
              const resolvedIncidents = svc.incidents?.filter((i: any) => i.resolvedAt) ?? [];

              return (
                <Card key={svc.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1">
                        <CardTitle>{svc.name}</CardTitle>
                        {svc.description && <p className="text-xs text-slate-500 mt-0.5">{svc.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status dropdown */}
                        <div className="relative">
                          <select
                            value={svc.status}
                            onChange={(e) => updateServiceStatus(svc.id, e.target.value)}
                            className={`appearance-none rounded-full border text-xs font-medium px-3 py-1 pr-6 cursor-pointer focus:outline-none ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <button
                          onClick={() => { setShowIncForm(svc.id); setIncTitle(""); setIncMessage(""); setIncStatus("INCIDENT"); }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 rounded-lg px-2 py-1"
                        >
                          + Incidente
                        </button>
                        <button
                          onClick={() => deleteService(svc.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Incident form */}
                  {showIncForm === svc.id && (
                    <CardContent className="border-t border-slate-100 pt-4">
                      <form onSubmit={createIncident} className="space-y-3">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nuevo incidente</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Título *</label>
                            <input
                              value={incTitle} onChange={(e) => setIncTitle(e.target.value)} required
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="Ej: Latencia elevada en API"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Estado del servicio</label>
                            <div className="relative">
                              <select
                                value={incStatus} onChange={(e) => setIncStatus(e.target.value)}
                                className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white pr-8"
                              >
                                {STATUS_OPTIONS.filter(o => o.value !== "OPERATIONAL").map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Mensaje *</label>
                          <textarea
                            value={incMessage} onChange={(e) => setIncMessage(e.target.value)} required rows={2}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                            placeholder="Describe la incidencia y el impacto..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" loading={savingInc}>Publicar incidente</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setShowIncForm(null)}>Cancelar</Button>
                        </div>
                      </form>
                    </CardContent>
                  )}

                  {/* Open incidents */}
                  {openIncidents.length > 0 && (
                    <CardContent className="border-t border-red-100 bg-red-50/50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">Incidentes activos</p>
                      <div className="space-y-2">
                        {openIncidents.map((inc: any) => (
                          <div key={inc.id} className="flex items-start gap-3 rounded-lg bg-white border border-red-200 p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-red-900">{inc.title}</p>
                              <p className="text-xs text-red-600 mt-0.5">{inc.message}</p>
                              <p className="text-xs text-red-400 mt-1">
                                {format(new Date(inc.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                              </p>
                            </div>
                            <button
                              onClick={() => resolveIncident(svc.id, inc.id)}
                              className="flex-shrink-0 text-xs text-green-600 hover:text-green-800 font-medium border border-green-200 rounded-lg px-2 py-1 bg-white"
                            >
                              Resolver
                            </button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}

                  {/* Resolved incidents */}
                  {resolvedIncidents.length > 0 && (
                    <CardContent className="border-t border-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Resueltos</p>
                      <div className="space-y-1">
                        {resolvedIncidents.slice(0, 3).map((inc: any) => (
                          <div key={inc.id} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-green-500">✓</span>
                            <span className="flex-1 truncate">{inc.title}</span>
                            <span className="text-slate-400">
                              {format(new Date(inc.resolvedAt!), "dd/MM HH:mm", { locale: es })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
