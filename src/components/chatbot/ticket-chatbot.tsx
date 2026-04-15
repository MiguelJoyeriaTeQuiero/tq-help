"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface FaqResult {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

interface BotMessage {
  role: "user" | "bot";
  text?: string;
  faqs?: FaqResult[];
  directAnswer?: { question: string; answer: string } | null;
}

export function TicketChatbot({ onProceed }: { onProceed: () => void }) {
  const router                = useRouter();
  const [open,   setOpen]     = useState(false);
  const [input,  setInput]    = useState("");
  const [msgs,   setMsgs]     = useState<BotMessage[]>([
    { role: "bot", text: "¡Hola! Antes de crear una incidencia, cuéntame qué problema tienes. Intentaré ayudarte con nuestra base de conocimiento." },
  ]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExp]    = useState<string | null>(null);
  const [skipped,  setSkip]   = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs((p) => [...p, { role: "user", text: userMsg }]);
    setLoading(true);

    const res  = await fetch("/api/chatbot", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.answer) {
      setMsgs((p) => [...p, {
        role: "bot",
        text: "He encontrado una respuesta que podría ayudarte:",
        directAnswer: data.answer,
        faqs: data.faqs?.filter((f: FaqResult) => f.id !== data.answer?.id),
      }]);
    } else if (data.faqs?.length > 0) {
      setMsgs((p) => [...p, {
        role: "bot",
        text: "No tengo una respuesta exacta, pero esto podría ser útil:",
        faqs: data.faqs,
      }]);
    } else {
      setMsgs((p) => [...p, {
        role: "bot",
        text: "No he encontrado información relacionada en la base de conocimiento. Puedes crear una incidencia y el equipo te ayudará lo antes posible.",
      }]);
    }
  };

  if (skipped) return null;

  return (
    <div className="mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left hover:bg-indigo-100 transition-colors"
        >
          <SparklesIcon className="h-5 w-5 text-indigo-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-800">¿Ya buscaste en la base de conocimiento?</p>
            <p className="text-xs text-indigo-500 mt-0.5">Pregúntame antes de abrir una incidencia — puede que ya haya respuesta</p>
          </div>
          <ChevronDownIcon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
        </button>
      ) : (
        <div className="rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 bg-indigo-600 px-4 py-2.5">
            <SparklesIcon className="h-4 w-4 text-indigo-200" />
            <span className="text-sm font-medium text-white flex-1">Asistente de autoservicio</span>
            <button onClick={() => setOpen(false)} className="text-indigo-200 hover:text-white">
              <ChevronUpIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setSkip(true); onProceed(); }}
              className="text-indigo-200 hover:text-white ml-1"
              title="Cerrar y crear incidencia directamente"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-72 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] space-y-2 ${m.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                  {m.text && (
                    <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                    }`}>
                      {m.text}
                    </div>
                  )}

                  {/* Direct answer */}
                  {m.directAnswer && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm w-full">
                      <p className="font-medium text-green-800 mb-1">{m.directAnswer.question}</p>
                      <p className="text-green-700 text-xs leading-relaxed whitespace-pre-wrap">{m.directAnswer.answer}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setSkip(true); setOpen(false); }}
                          className="text-xs font-medium text-green-700 hover:text-green-900"
                        >
                          ✓ Esto resolvió mi duda
                        </button>
                        <span className="text-green-300">·</span>
                        <button
                          onClick={() => { setSkip(true); onProceed(); }}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Crear incidencia de todas formas
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FAQ list */}
                  {m.faqs && m.faqs.length > 0 && (
                    <div className="space-y-1.5 w-full">
                      {m.faqs.map((faq) => (
                        <div key={faq.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                          <button
                            onClick={() => setExp(expanded === faq.id ? null : faq.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors"
                          >
                            <span className="font-medium text-slate-700 line-clamp-2">{faq.question}</span>
                            {expanded === faq.id
                              ? <ChevronUpIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 ml-1" />
                              : <ChevronDownIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 ml-1" />}
                          </button>
                          {expanded === faq.id && (
                            <div className="px-3 pb-2.5 pt-0 border-t border-slate-100">
                              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0,1,2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe tu problema…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
            >
              Enviar
            </button>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => router.push("/faq")}
              className="text-xs text-indigo-500 hover:text-indigo-700"
            >
              Ver FAQ completa →
            </button>
            <button
              onClick={() => { setSkip(true); onProceed(); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Crear incidencia sin consultar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
