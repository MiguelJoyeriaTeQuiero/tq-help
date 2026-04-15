"use client";

import { useState } from "react";

const DEPTS = [
  { value: "IT",           label: "IT / Tecnología" },
  { value: "RRHH",         label: "Recursos Humanos" },
  { value: "MARKETING",    label: "Marketing" },
  { value: "LOGISTICA",    label: "Logística" },
  { value: "CONTABILIDAD", label: "Contabilidad" },
  { value: "PRODUCTO",     label: "Producto" },
  { value: "DIRECCION",    label: "Dirección" },
];

export default function WidgetPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", description: "", dept: "" });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/widget/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al enviar"); return; }
      setSubmitted(data.id);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mx-auto">
            <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">¡Solicitud enviada!</h2>
          <p className="text-sm text-slate-500">Tu solicitud ha sido registrada. Recibirás una respuesta en el email indicado.</p>
          <p className="text-xs text-slate-400">Referencia: <span className="font-mono font-medium text-slate-600">{submitted.slice(-8).toUpperCase()}</span></p>
          <button
            onClick={() => { setSubmitted(null); setForm({ name: "", email: "", subject: "", description: "", dept: "" }); }}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Enviar otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md w-full space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">¿Necesitas ayuda?</h1>
          <p className="text-sm text-slate-500 mt-1">Cuéntanos tu problema y te atendemos enseguida</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                name="name" value={form.name} onChange={handleChange} required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange} required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Departamento *</label>
            <div className="relative">
              <select
                name="dept" value={form.dept} onChange={handleChange} required
                className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white pr-8"
              >
                <option value="">Selecciona departamento</option>
                {DEPTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Asunto *</label>
            <input
              name="subject" value={form.subject} onChange={handleChange} required minLength={5}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Resumen breve del problema"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Descripción *</label>
            <textarea
              name="description" value={form.description} onChange={handleChange} required minLength={10} rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="Describe el problema con el mayor detalle posible..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Tu solicitud será atendida lo antes posible · <a href="/status" className="hover:underline">Ver estado del sistema</a>
        </p>
      </div>
    </div>
  );
}
