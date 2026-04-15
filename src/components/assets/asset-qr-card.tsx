"use client";

import { useState } from "react";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

export function AssetQrCard({ assetId, assetName }: { assetId: string; assetName: string }) {
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadQr = async () => {
    if (previewUrl) return; // already loaded
    setDownloading(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/qr`);
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } finally {
      setDownloading(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/qr`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${assetId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex h-52 w-52 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 transition-colors"
        onClick={loadQr}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={`QR ${assetName}`} className="h-48 w-48 rounded-lg" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <QrCodeIcon className="h-16 w-16" />
            <span className="text-xs">Clic para previsualizar</span>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" loading={downloading} onClick={download}>
        <QrCodeIcon className="h-4 w-4 mr-1.5" />
        Descargar QR
      </Button>
      <p className="text-xs text-slate-400 text-center">
        Escanea el código para abrir la ficha del activo
      </p>
    </div>
  );
}
