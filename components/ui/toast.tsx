"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };
type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  success: "bg-wf-green/10 border-wf-green/40 text-wf-green",
  error: "bg-wf-red/10 border-wf-red/40 text-wf-red",
  info: "bg-wf-card border-wf-border text-wf-text",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, kind = "info") => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, kind, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => remove(t.id)}
            className={cn(
              "pointer-events-auto text-left px-4 py-3 rounded-lg border shadow-lg text-sm font-semibold cursor-pointer transition-all animate-in",
              KIND_STYLES[t.kind],
            )}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Turn a thrown Convex/JS error into a clean, human one-liner for a toast.
// Strips the "[CONVEX M(...)] [Request ID] ... Uncaught Error:" wrapper and the
// trailing stack, and drops a leading SCREAMING_CODE: prefix from our thrown
// errors (e.g. "SERIAL_TAKEN: serial X is already provisioned" → "Serial X is
// already provisioned").
// Stable code from a ConvexError ({ code, message }) for branching in catch
// blocks — survives Convex's production message redaction. Undefined otherwise.
export function convexErrorCode(e: unknown): string | undefined {
  const code = (e as { data?: { code?: unknown } } | null | undefined)?.data?.code;
  return typeof code === "string" ? code : undefined;
}

export function cleanError(e: unknown, fallback = "Something went wrong"): string {
  // ConvexError carries the human message in .data.message, which (unlike a
  // plain thrown Error's message) survives prod redaction. Prefer it.
  const dataMsg = (e as { data?: { message?: unknown } } | null | undefined)?.data?.message;
  if (typeof dataMsg === "string" && dataMsg.trim()) return dataMsg.trim();
  if (!(e instanceof Error)) return fallback;
  let m = e.message;
  const idx = m.lastIndexOf("Uncaught Error:");
  if (idx >= 0) m = m.slice(idx + "Uncaught Error:".length);
  m = m.split(/\s+at\s+/)[0].replace(/^Error:\s*/, "").trim();
  const code = m.match(/^[A-Z][A-Z0-9_]+:\s*(.*)$/);
  if (code) m = code[1].trim();
  if (!m) return fallback;
  return m.charAt(0).toUpperCase() + m.slice(1);
}

// Returns a toast(message, kind?) function. Safe outside a provider (no-op +
// console fallback) so a stray call never crashes a page.
export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  return (
    ctx ??
    ((message, kind) => {
      if (kind === "error") console.error(message);
    })
  );
}
