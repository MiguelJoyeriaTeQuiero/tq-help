"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";

interface Template {
  id: string;
  name: string;
  description?: string;
  titlePreset: string;
  bodyPreset: string;
  priority: string;
  targetDept: string[];
}

interface TemplatePickerProps {
  onSelect: (template: Template) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (templates.length > 0) return;
    setLoading(true);
    fetch("/api/ticket-templates")
      .then((r) => r.json())
      .then((d) => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); });
  };

  const handleSelect = (t: Template) => {
    onSelect(t);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { load(); setOpen(true); }}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
      >
        <DocumentDuplicateIcon className="h-4 w-4" />
        Usar plantilla
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Seleccionar plantilla">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No hay plantillas disponibles</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className="w-full flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 px-4 py-3 text-left transition-colors"
              >
                <DocumentDuplicateIcon className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{t.name}</p>
                  {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                  <p className="text-xs text-slate-400 mt-1 truncate">Título: {t.titlePreset}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
