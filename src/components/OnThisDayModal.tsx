"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./icons";

type OnThisDayItem = {
  id: string;
  entryDate: string;
  title: string | null;
  snippet: string;
};

type OnThisDayModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
};

export function OnThisDayModal({ open, onClose, onSelectDate }: OnThisDayModalProps) {
  const [items, setItems] = useState<OnThisDayItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    setLoading(true);
    fetch(`/api/entries/on-this-day?month=${month}&day=${day}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: OnThisDayItem[] }) => setItems(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => fetchItems());
    return () => cancelAnimationFrame(id);
  }, [open, fetchItems]);

  const handleSelect = (entryDate: string) => {
    onSelectDate(new Date(entryDate + "T12:00:00.000Z"));
    onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="on-this-day-title"
    >
      <div
        className="absolute inset-0 bg-[var(--modal-overlay)]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-warm)]">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 id="on-this-day-title" className="text-headline text-lg font-semibold">
            On this day
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[var(--body)] transition hover:bg-[var(--border)]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </header>
        <div className="scrollbar-warm flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          {loading ? (
            <p className="text-body-soft text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-body-soft text-sm">No entries on this day in past years.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.entryDate)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-paper)] p-4 text-left transition hover:bg-[var(--border)]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                  >
                    <span className="text-body-soft text-xs font-medium">{item.entryDate}</span>
                    <p className="text-body mt-1 line-clamp-2 text-sm">{item.snippet}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
