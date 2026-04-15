"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  order: number;
  isActive: boolean;
}

const emptyForm = { question: "", answer: "", category: "", order: 0, isActive: true };

export default function FaqAdminPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FaqItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    const res = await fetch("/api/faq?all=1");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditItem(item);
    setForm({ question: item.question, answer: item.answer, category: item.category ?? "", order: item.order, isActive: item.isActive });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, category: form.category || null };
    if (editItem) {
      await fetch(`/api/faq/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const toggleActive = async (item: FaqItem) => {
    await fetch(`/api/faq/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    load();
  };

  const deleteItem = async (item: FaqItem) => {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    await fetch(`/api/faq/${item.id}`, { method: "DELETE" });
    load();
  };

  const filtered = items.filter(
    (i) => i.question.toLowerCase().includes(search.toLowerCase()) || (i.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(items.map((i) => i.category ?? "General"))].sort();

  return (
    <AppLayout title="Gestión de FAQ">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Preguntas frecuentes</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Gestiona las preguntas visibles en{" "}
              <a href="/faq" target="_blank" className="text-indigo-600 hover:underline">/faq</a>
            </p>
          </div>
          <Button onClick={openCreate}>+ Nueva pregunta</Button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por pregunta o categoría..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">{editItem ? "Editar pregunta" : "Nueva pregunta"}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pregunta *</label>
                  <input
                    value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="¿Cómo puedo...?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Respuesta *</label>
                  <textarea
                    value={form.answer} onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))} required
                    rows={5}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    placeholder="Escribe la respuesta..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                    <input
                      value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      list="cat-list"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="General"
                    />
                    <datalist id="cat-list">
                      {categories.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Orden</label>
                    <input
                      type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                  Visible públicamente
                </label>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" loading={saving}>{editItem ? "Guardar cambios" : "Crear pregunta"}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Items */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No hay preguntas{search ? " que coincidan" : " aún"}.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border ${item.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"} p-4`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.category && (
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">{item.category}</span>
                      )}
                      {!item.isActive && (
                        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Oculta</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{item.question}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActive(item)}
                      className={`text-xs font-medium ${item.isActive ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"}`}
                    >
                      {item.isActive ? "Ocultar" : "Publicar"}
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
