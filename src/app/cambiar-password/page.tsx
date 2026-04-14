"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CambiarPasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (next.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }

    setLoading(true);
    const res = await fetch("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al cambiar la contraseña");
    } else {
      // El JWT sigue teniendo mustChangePassword=true — hay que cerrar sesión
      // y volver a iniciarla para que NextAuth emita un token limpio
      setDone(true);
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Cambia tu contraseña</h2>
          <p className="text-sm text-slate-500 mb-6">
            Es tu primer acceso. Debes establecer una contraseña personal.
          </p>
          {done && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              ✓ Contraseña cambiada. Redirigiendo al login...
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              label="Contraseña temporal"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Nueva contraseña"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Guardar contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
