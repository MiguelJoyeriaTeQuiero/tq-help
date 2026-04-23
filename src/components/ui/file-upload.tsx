"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { PaperClipIcon, XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";

interface UploadedFile {
  url: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface FileUploadProps {
  onUpload: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ onUpload, maxFiles = 10 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selected: FileList) => {
    const remaining = maxFiles - files.length;
    if (selected.length > remaining) {
      setError(`Máximo ${maxFiles} archivos (quedan ${remaining} huecos)`);
      return;
    }

    setUploading(true);
    setError(null);
    const uploaded: UploadedFile[] = [];

    for (const file of Array.from(selected)) {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Error al subir archivo");
        break;
      }
      uploaded.push(await res.json());
    }

    const newFiles = [...files, ...uploaded];
    setFiles(newFiles);
    onUpload(newFiles);
    setUploading(false);
  };

  const remove = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    onUpload(newFiles);
  };

  const images = files.filter((f) => isImage(f.mimeType));
  const others = files.filter((f) => !isImage(f.mimeType));

  const canAccept = files.length < maxFiles && !uploading;

  return (
    <div
      className={`space-y-3 rounded-token-lg transition-[background-color,box-shadow,outline-color] duration-150 ${
        isDragging
          ? "outline outline-2 outline-dashed outline-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10 p-3 -m-3 shadow-token-sm"
          : ""
      }`}
      onDragEnter={(e) => {
        if (!canAccept) return;
        e.preventDefault();
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (!canAccept) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setIsDragging(false);
        if (!canAccept) return;
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
    >
      {/* Previews de imágenes */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((f, idx) => {
            const realIdx = files.indexOf(f);
            return (
              <div key={realIdx} className="relative group">
                <img
                  src={f.url}
                  alt={f.filename}
                  className="h-20 w-20 rounded-lg object-cover border border-slate-200 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => remove(realIdx)}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-0.5 max-w-[80px] truncate">{f.filename}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Archivos no imagen */}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {others.map((f) => {
            const realIdx = files.indexOf(f);
            return (
              <div key={realIdx} className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1.5 text-sm">
                <PaperClipIcon className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                <span className="max-w-[140px] truncate text-slate-700">{f.filename}</span>
                <span className="text-xs text-slate-400">{formatSize(f.size)}</span>
                <button type="button" onClick={() => remove(realIdx)} className="text-slate-400 hover:text-red-500 ml-1">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón subir */}
      {files.length < maxFiles && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <PhotoIcon className="mr-1 h-4 w-4" />
            {uploading ? "Subiendo..." : `Añadir imágenes / archivos${files.length > 0 ? ` (${files.length}/${maxFiles})` : ""}`}
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {isDragging && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
          Suelta los archivos aquí para subirlos…
        </p>
      )}
    </div>
  );
}
