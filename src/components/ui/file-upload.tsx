"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";

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

export function FileUpload({ onUpload, maxFiles = 5 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selected: FileList) => {
    if (files.length + selected.length > maxFiles) {
      setError(`Máximo ${maxFiles} archivos`);
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm">
            <PaperClipIcon className="h-3 w-3 text-slate-500" />
            <span className="max-w-[150px] truncate text-slate-700">{f.filename}</span>
            <button onClick={() => remove(i)} className="text-slate-400 hover:text-red-500">
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={uploading}
        onClick={() => inputRef.current?.click()}
        disabled={files.length >= maxFiles}
      >
        <PaperClipIcon className="mr-1 h-4 w-4" />
        Adjuntar archivo
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
