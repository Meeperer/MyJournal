"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck } from "./icons";

const TOAST_DURATION_MS = 2800;
const FADE_OUT_MS = 200;

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}

type ToastProviderProps = { children: React.ReactNode };

export function ToastProvider({ children }: ToastProviderProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setExiting(false);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!message || !visible) return;
    const startExit = TOAST_DURATION_MS;
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, startExit);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      setMessage(null);
      setExiting(false);
    }, startExit + FADE_OUT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [message, visible]);

  const value = useCallback((msg: string) => showToast(msg), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast: value }}>
      {children}
      {typeof document !== "undefined" &&
        visible &&
        message &&
        createPortal(
          <div
            className="toast-container fixed z-[100] flex items-center justify-center p-4 sm:justify-end sm:pr-6"
            style={{
              bottom: 0,
              left: 0,
              right: 0,
              pointerEvents: "none",
            }}
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            <div
              className={`toast-toast flex items-center gap-3 rounded-[12px] border-l-4 border-[var(--accent)] bg-[var(--bg-card)] px-4 py-3.5 text-[var(--headline)] shadow-[var(--shadow-warm)] dark:shadow-[0_0_20px_var(--accent-glow)] ${
                exiting ? "toast-exit" : "toast-enter"
              }`}
              style={{ maxWidth: "min(100%, 22rem)" }}
            >
              <span className="flex shrink-0 text-[var(--accent)]" aria-hidden>
                <IconCheck className="h-5 w-5" />
              </span>
              <span className="text-body-soft text-sm font-medium">{message}</span>
            </div>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
