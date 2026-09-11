"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { uid } from "./utils";

interface Toast {
  id: string;
  message: string;
  variant: "success" | "info";
}

interface ToastContextValue {
  showToast: (message: string, variant?: Toast["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: Toast["variant"] = "success") => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((toast) => toast.id !== id)), 3200);
  }, []);

  const dismiss = (id: string) => setToasts((t) => t.filter((toast) => toast.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 animate-[fade-in_0.15s_ease-out] dark:border-slate-700 dark:bg-slate-800"
            role="status"
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            )}
            <p className="max-w-xs text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
