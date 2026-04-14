"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

const CATEGORY_OPTIONS = [
  { value: "ACOSO_LABORAL", label: "Acoso laboral" },
  { value: "FRAUDE", label: "Fraude" },
  { value: "DISCRIMINACION", label: "Discriminación" },
  { value: "CONFLICTO_INTERESES", label: "Conflicto de intereses" },
  { value: "OTRO", label: "Otro" },
];

export default function DenunciasPage() {
  const [category, setCategory] = useState("ACOSO_LABORAL");
  const [description, setDescription] = useState("");
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 20) {
      setError("La descripción debe tener al menos 20 caracteres");
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, description }),
    });
    setLoading(false);
    if (!res.ok) { setError("Error al enviar la denuncia. Inténtalo de nuevo."); return; }
    const data = await res.json();
    setTrackingCode(data.trackingCode);
  };

  if (trackingCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                <CardTitle>Denuncia registrada</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Tu denuncia ha sido recibida de forma anónima. Guarda este código para consultar su estado:
              </p>
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-center">
                <p className="text-2xl font-mono font-bold tracking-widest text-indigo-700">{trackingCode}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Importante:</strong> Este código es la única forma de consultar tu denuncia.
                  No se almacena ningún dato que permita identificarte. Una vez cierres esta página,
                  no podremos mostrarte el código de nuevo.
                </p>
              </div>
              <a
                href="/denuncias/consultar"
                className="block text-center text-sm text-indigo-600 hover:underline"
              >
                Consultar estado con este código →
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-10 w-10 text-indigo-600 mb-2" />
          <h1 className="text-2xl font-bold text-slate-900">Canal de denuncias</h1>
          <p className="text-sm text-slate-500 mt-2">
            Completamente anónimo. No se registra ningún dato de identificación.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Categoría *"
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <Textarea
                label="Descripción de los hechos *"
                placeholder="Describe los hechos con el mayor detalle posible: qué ocurrió, cuándo, quiénes estaban implicados (sin revelar tu identidad si no lo deseas), dónde..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[200px]"
                error={error}
              />
              <Button type="submit" className="w-full" loading={loading}>
                Enviar denuncia de forma anónima
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <Link href="/denuncias/consultar" className="text-sm text-slate-500 hover:text-indigo-600 block">
            ¿Ya enviaste una denuncia? Consulta su estado →
          </Link>
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600 block">
            ← Volver al sistema
          </Link>
        </div>
      </div>
    </div>
  );
}
