"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  RECIBIDA: "Recibida",
  EN_INVESTIGACION: "En investigación",
  RESUELTA: "Resuelta",
  ARCHIVADA: "Archivada",
};

const STATUS_COLORS: Record<string, string> = {
  RECIBIDA: "bg-blue-100 text-blue-700",
  EN_INVESTIGACION: "bg-yellow-100 text-yellow-700",
  RESUELTA: "bg-green-100 text-green-700",
  ARCHIVADA: "bg-slate-100 text-slate-700",
};

export default function ConsultarDenunciaPage() {
  const [code, setCode] = useState("");
  const [complaint, setComplaint] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setComplaint(null);

    const res = await fetch(`/api/complaints/track?code=${encodeURIComponent(code.trim().toUpperCase())}`);
    setLoading(false);

    if (!res.ok) {
      setError("Código no encontrado. Verifica que lo has introducido correctamente.");
      return;
    }

    setComplaint(await res.json());
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <MagnifyingGlassIcon className="mx-auto h-10 w-10 text-indigo-600 mb-2" />
          <h1 className="text-2xl font-bold text-slate-900">Consultar denuncia</h1>
          <p className="text-sm text-slate-500 mt-2">Introduce tu código de seguimiento</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                label="Código de seguimiento"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono tracking-widest text-center text-lg"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Consultar estado
              </Button>
            </form>
          </CardContent>
        </Card>

        {complaint && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Estado de tu denuncia</CardTitle>
                <Badge className={STATUS_COLORS[complaint.status]}>
                  {STATUS_LABELS[complaint.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Código:</strong> <span className="font-mono">{complaint.trackingCode}</span></p>
                <p><strong>Enviada:</strong> {format(new Date(complaint.createdAt), "d 'de' MMMM yyyy", { locale: es })}</p>
                <p><strong>Última actualización:</strong> {format(new Date(complaint.updatedAt), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}</p>
              </div>
              {complaint.statusHistory?.length > 1 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Historial</p>
                  <ol className="space-y-1">
                    {complaint.statusHistory.map((h: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="text-slate-400">{format(new Date(h.changedAt), "dd/MM HH:mm")}</span>
                        <Badge className={STATUS_COLORS[h.toStatus]}>{STATUS_LABELS[h.toStatus]}</Badge>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link href="/denuncias" className="text-sm text-slate-500 hover:text-indigo-600">
            ← Enviar nueva denuncia
          </Link>
        </div>
      </div>
    </div>
  );
}
