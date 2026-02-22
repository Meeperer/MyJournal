"use client";

import { useCallback, useEffect, useState } from "react";
import { IconClose } from "./icons";

type TemplateItem = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type TemplatesListProps = {
  open: boolean;
  onClose: () => void;
  onUseTemplate: (body: string) => void;
};

export function TemplatesList({ open, onClose, onUseTemplate }: TemplatesListProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open, fetchTemplates]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // ignore
    }
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="templates-title"
    >
      <div className="absolute inset-0 bg-[var(--modal-overlay)]" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-warm)]">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 id="templates-title" className="text-headline text-lg font-semibold">
            Templates
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[var(--body)] transition hover:bg-[var(--border)]/50"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </header>
        <div className="scrollbar-warm flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          {loading ? (
            <p className="text-body-soft text-sm">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="text-body-soft text-sm">No templates yet. Create one from an entry or below.</p>
          ) : null}
          {!loading && templates.length > 0 && (
            <ul className="space-y-3">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-paper)] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-headline-2 font-medium">{t.name}</p>
                    <p className="text-body-soft mt-0.5 truncate text-xs">{t.body.length > 80 ? t.body.slice(0, 80) + "…" : t.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUseTemplate(t.body);
                        onClose();
                      }}
                      className="btn-primary min-h-[36px] px-3 text-sm"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="btn-secondary min-h-[36px] px-3 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <h3 className="text-headline-2 text-sm font-semibold">New template</h3>
            <CreateTemplateForm onCreated={fetchTemplates} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTemplateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), body: body.trim() }),
      });
      if (res.ok) {
        setName("");
        setBody("");
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        className="input-warm w-full px-3 py-2 text-sm"
        maxLength={120}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Template body (pre-fills entry content)"
        className="input-warm w-full resize-y px-3 py-2 text-sm"
        rows={3}
        maxLength={5000}
      />
      <button type="submit" disabled={saving} className="btn-primary w-full py-2 text-sm disabled:opacity-50">
        {saving ? "Creating…" : "Create template"}
      </button>
    </form>
  );
}
