"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LockClosedIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; name: string; role: string };
}

function renderWithMentions(text: string) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="text-indigo-600 font-medium">{part}</span>
      : part
  );
}

interface Props {
  ticketId:    string;
  isAdmin:     boolean;
  /** called after each new comment POST so parent can refresh ticket data if needed */
  onComment?:  () => void;
}

export function LiveComments({ ticketId, isAdmin, onComment }: Props) {
  const { data: session }       = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [seenIds]               = useState(() => new Set<string>());
  const [connected, setConn]    = useState(false);
  const [comment,   setComment] = useState("");
  const [isInternal, setIntern] = useState(false);
  const [sending,   setSending] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const esRef                   = useRef<EventSource | null>(null);

  const addComment = useCallback((c: Comment) => {
    if (seenIds.has(c.id)) return;
    seenIds.add(c.id);
    setComments((prev) => [...prev, c]);
  }, [seenIds]);

  useEffect(() => {
    const connect = () => {
      esRef.current?.close();
      const es = new EventSource(`/api/tickets/${ticketId}/stream`);
      esRef.current = es;

      es.onopen    = () => setConn(true);
      es.onmessage = (e) => {
        try { addComment(JSON.parse(e.data)); } catch {}
      };
      es.onerror = () => {
        setConn(false);
        es.close();
        setTimeout(connect, 5_000);
      };
    };
    connect();
    return () => { esRef.current?.close(); };
  }, [ticketId, addComment]);

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${ticketId}/comments`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content: comment, isInternal }),
    });
    setSending(false);
    if (res.ok) {
      setComment("");
      onComment?.();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
        <span className="text-xs text-slate-400">{connected ? "En vivo" : "Reconectando…"}</span>
      </div>

      {/* Comment list */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Sin comentarios todavía</p>
        )}
        {comments.map((c) => (
          <div
            key={c.id}
            className={`rounded-xl p-3 text-sm ${
              c.isInternal
                ? "bg-yellow-50 border border-yellow-200"
                : c.author.id === session?.user?.id
                  ? "bg-indigo-50 border border-indigo-100 ml-6"
                  : "bg-slate-50 border border-slate-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-slate-800 text-xs">{c.author.name}</span>
              {c.isInternal && (
                <span className="flex items-center gap-1 text-[10px] text-yellow-700 bg-yellow-100 rounded-full px-1.5 py-0.5">
                  <LockClosedIcon className="h-2.5 w-2.5" /> Interno
                </span>
              )}
              <span className="ml-auto text-[10px] text-slate-400">
                {format(new Date(c.createdAt), "dd/MM HH:mm", { locale: es })}
              </span>
            </div>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {renderWithMentions(c.content)}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {session?.user?.role !== "VIEWER" && (
        <form onSubmit={handleSubmit} className="space-y-2 border-t border-slate-100 pt-3">
          <Textarea
            placeholder="Escribe un comentario… (usa @nombre para mencionar)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[72px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as any);
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {isAdmin && (
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIntern(e.target.checked)}
                    className="rounded"
                  />
                  <LockClosedIcon className="h-3 w-3" /> Interno
                </label>
              )}
              <span className="text-[10px] text-slate-400 hidden sm:inline">⌘↵ para enviar</span>
            </div>
            <Button type="submit" size="sm" loading={sending} disabled={!comment.trim()}>
              <PaperAirplaneIcon className="h-3.5 w-3.5 mr-1" /> Enviar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
