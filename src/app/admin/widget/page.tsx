"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WidgetAdminPage() {
  const [dept, setDept] = useState("IT");
  const [copied, setCopied] = useState(false);

  const DEPTS = [
    { value: "IT",           label: "IT / Tecnología" },
    { value: "RRHH",         label: "Recursos Humanos" },
    { value: "MARKETING",    label: "Marketing" },
    { value: "LOGISTICA",    label: "Logística" },
    { value: "CONTABILIDAD", label: "Contabilidad" },
    { value: "PRODUCTO",     label: "Producto" },
    { value: "DIRECCION",    label: "Dirección" },
  ];

  const origin = typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.com";

  const iframeCode = `<!-- Widget TQ-HELP -->
<iframe
  src="${origin}/widget"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);"
  title="Soporte técnico"
></iframe>`;

  const buttonCode = `<!-- Botón flotante TQ-HELP -->
<script>
  (function() {
    var btn = document.createElement('button');
    btn.innerHTML = '💬 ¿Necesitas ayuda?';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0099f2;color:#fff;border:none;border-radius:9999px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,153,242,0.4);z-index:9999;';
    btn.onclick = function() {
      var iframe = document.createElement('div');
      iframe.innerHTML = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px"><div style="background:#fff;border-radius:16px;overflow:hidden;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,0.2)"><button onclick="this.parentElement.parentElement.parentElement.remove()" style="float:right;background:none;border:none;font-size:20px;padding:12px;cursor:pointer;color:#64748b">&times;</button><iframe src="${origin}/widget" style="width:100%;height:560px;border:none;display:block"></iframe></div></div>';
      document.body.appendChild(iframe);
    };
    document.body.appendChild(btn);
  })();
</script>`;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout title="Widget embebible">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Widget embebible</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Copia el código y pégalo en cualquier web para recibir solicitudes de soporte.
            La página pública está en{" "}
            <a href="/widget" target="_blank" className="text-indigo-600 hover:underline">/widget</a>
          </p>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader><CardTitle>Vista previa</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: 420 }}>
              <iframe src="/widget" className="w-full h-full" title="Widget preview" />
            </div>
          </CardContent>
        </Card>

        {/* iframe embed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Opción 1: iFrame embebido</CardTitle>
              <button
                onClick={() => copy(iframeCode)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                {copied ? "¡Copiado!" : "Copiar código"}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">Incrusta el formulario directamente en una sección de tu web.</p>
            <pre className="rounded-xl bg-slate-900 text-green-300 text-xs p-4 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
              {iframeCode}
            </pre>
          </CardContent>
        </Card>

        {/* Floating button */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Opción 2: Botón flotante</CardTitle>
              <button
                onClick={() => copy(buttonCode)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                {copied ? "¡Copiado!" : "Copiar código"}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">
              Añade un botón flotante en la esquina inferior derecha de cualquier web.
              Al hacer clic, abre el formulario en un modal.
            </p>
            <pre className="rounded-xl bg-slate-900 text-green-300 text-xs p-4 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
              {buttonCode}
            </pre>
          </CardContent>
        </Card>

        {/* API info */}
        <Card>
          <CardHeader><CardTitle>API directa</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Si prefieres construir tu propio formulario, puedes llamar al endpoint directamente:</p>
            <pre className="rounded-xl bg-slate-900 text-green-300 text-xs p-4 overflow-x-auto font-mono">
{`POST ${origin}/api/widget/ticket
Content-Type: application/json

{
  "name": "Nombre del usuario",
  "email": "usuario@empresa.com",
  "subject": "Asunto mínimo 5 caracteres",
  "description": "Descripción mínimo 10 caracteres",
  "dept": "IT"  // IT | RRHH | MARKETING | LOGISTICA | CONTABILIDAD | PRODUCTO | DIRECCION
}`}
            </pre>
            <p className="text-xs text-slate-400">No requiere autenticación. El sistema crea o reutiliza la cuenta del email indicado.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
