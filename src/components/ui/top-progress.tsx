"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface TopProgressContextValue {
  start: () => string;
  done: (id: string) => void;
  wrap: <T>(p: Promise<T>) => Promise<T>;
}

const Ctx = createContext<TopProgressContextValue | null>(null);

export function TopProgressProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const visible = active.size > 0;

  useEffect(() => {
    if (!visible) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(t);
    }
    setProgress(0);
    const tick = () => {
      setProgress((p) => {
        const remaining = 90 - p;
        const inc = Math.max(0.5, remaining * 0.03);
        return Math.min(90, p + inc);
      });
      rafRef.current = window.setTimeout(tick, 200) as unknown as number;
    };
    tick();
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [visible]);

  const start = useCallback(() => {
    const id = Math.random().toString(36).slice(2);
    setActive((s) => new Set(s).add(id));
    return id;
  }, []);

  const done = useCallback((id: string) => {
    setActive((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }, []);

  const wrap = useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    const id = start();
    try {
      return await p;
    } finally {
      done(id);
    }
  }, [start, done]);

  return (
    <Ctx.Provider value={{ start, done, wrap }}>
      <AnimatePresence>
        {(visible || progress > 0) && (
          <motion.div
            key="bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none"
          >
            <motion.div
              className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(0,153,242,0.6)]"
              animate={{ width: `${progress}%` }}
              transition={{ ease: [0.2, 0.8, 0.2, 1], duration: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </Ctx.Provider>
  );
}

export function useTopProgress() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      start: () => "",
      done: () => {},
      wrap: async <T,>(p: Promise<T>) => p,
    };
  }
  return ctx;
}
