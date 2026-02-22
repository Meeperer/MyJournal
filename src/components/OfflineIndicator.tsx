"use client";

import { useEffect, useState } from "react";
import { drainQueue, getQueueLength } from "@/lib/offline-queue";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      setOffline(false);
      setSyncing(true);
      drainQueue()
        .then(() => setQueueLength(getQueueLength()))
        .finally(() => {
          setTimeout(() => setSyncing(false), 1500);
        });
    };
    const tick = () => {
      setQueueLength(getQueueLength());
      setOffline(typeof navigator === "undefined" ? false : !navigator.onLine);
    };
    const id = requestAnimationFrame(tick);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline && !syncing) return null;

  const message = offline
    ? (queueLength > 0
      ? `Offline – ${queueLength} change${queueLength !== 1 ? "s" : ""} will sync when you're back online.`
      : "Offline – changes will sync when you're back online.")
    : "Back online. Syncing…";

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[90] flex justify-center sm:left-auto sm:right-6 sm:max-w-sm"
      role="status"
      aria-live="polite"
    >
      <div
        className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
          offline
            ? "border-amber-600/40 bg-amber-500/15 text-amber-800 dark:text-amber-200"
            : "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--headline)]"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
