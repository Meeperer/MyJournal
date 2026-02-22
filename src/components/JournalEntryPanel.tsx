"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateKey } from "@/lib/date";
import { addToQueue } from "@/lib/offline-queue";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { EntryEditorToolbar } from "./EntryEditorToolbar";
import { EntryVersionHistory } from "./EntryVersionHistory";
import { IconClose, IconExpand, IconSpinner, IconTrash } from "./icons";

type ArasData = {
  corrected_entry: string;
  aras: { activity: string; reflection: string; analysis: string; summary: string };
  hover_preview: string[];
};

type JournalEntry = {
  id: string;
  title: string | null;
  rawContent: string;
  arasContent: string | null;
  mood: string | null;
  tags: string | null;
} | null;

type JournalEntryPanelProps = {
  selectedDate: Date;
  onClose?: () => void;
  templateBodyToApply?: string | null;
  onClearTemplateToApply?: () => void;
  onOpenTemplates?: () => void;
  onEntrySaved?: () => void;
  onEntryDeleted?: () => void;
  onSaveError?: (message: string) => void;
  onOverviewModalOpenChange?: (open: boolean) => void;
};

const OVERVIEW_WIDTH_PCT = 32;

export function JournalEntryPanel({ selectedDate, onClose, templateBodyToApply, onClearTemplateToApply, onOpenTemplates, onEntrySaved, onEntryDeleted, onSaveError, onOverviewModalOpenChange }: JournalEntryPanelProps) {
  const dateKey = formatDateKey(selectedDate);
  const [entry, setEntry] = useState<JournalEntry>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState("");
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [overviewModalExiting, setOverviewModalExiting] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [versions, setVersions] = useState<{ id: string; rawContent: string; correctedContent: string; createdAt: string }[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusParagraphIndex, setFocusParagraphIndex] = useState(0);
  const entryContentRef = useRef<HTMLTextAreaElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const overviewModalRef = useRef<HTMLDivElement>(null);
  const overviewModalExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEntry = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?date=${dateKey}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntry(data);
      setTitle(data?.title ?? "");
      setRawContent(data?.rawContent ?? "");
      setMood(data?.mood ?? "");
      setTags(data?.tags ?? "");
    } catch {
      setEntry(null);
      setTitle("");
      setRawContent("");
      setMood("");
      setTags("");
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  useEffect(() => {
    if (templateBodyToApply != null) {
      setRawContent(templateBodyToApply);
      onClearTemplateToApply?.();
    }
  }, [templateBodyToApply, onClearTemplateToApply]);

  const isToday = useCallback(() => {
    const t = new Date();
    return selectedDate.getFullYear() === t.getFullYear() && selectedDate.getMonth() === t.getMonth() && selectedDate.getDate() === t.getDate();
  }, [selectedDate]);

  useEffect(() => {
    if (!isToday()) {
      setDailyPrompt(null);
      return;
    }
    fetch("/api/prompts/daily")
      .then((res) => (res.ok ? res.json() : { text: null }))
      .then((data: { text?: string | null }) => setDailyPrompt(data?.text ?? null))
      .catch(() => setDailyPrompt(null));
  }, [isToday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateKey,
          title: title || undefined,
          rawContent: rawContent || "",
          mood: mood || undefined,
          tags: tags || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data?.error === "string" ? data.error : "Failed to save";
        onSaveError?.(message);
        return;
      }
      setEntry(data);
      onEntrySaved?.();
    } catch (err) {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        addToQueue({
          type: "post",
          date: dateKey,
          body: { title: title || undefined, rawContent: rawContent || "", mood: mood || undefined, tags: tags || undefined },
        });
        onSaveError?.("Offline. Your entry will sync when you're back online.");
      } else {
        const message = err instanceof Error ? err.message : "Failed to save";
        console.error("Save error:", message);
        onSaveError?.(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => setDeleteConfirmOpen(true);
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/entries?date=${dateKey}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onEntryDeleted?.();
      onClose?.();
    } catch (err) {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        addToQueue({ type: "delete", date: dateKey });
        onEntryDeleted?.();
        onClose?.();
      }
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };
  const handleDeleteCancel = () => {
    if (!deleting) setDeleteConfirmOpen(false);
  };

  const insertAtCursor = useCallback((before: string, after: string) => {
    const ta = entryContentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = rawContent;
    const newText = text.slice(0, start) + before + (start < end ? text.slice(start, end) : "") + after + text.slice(end);
    setRawContent(newText);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + (end - start) + after.length;
      ta.setSelectionRange(pos, pos);
    });
  }, [rawContent]);

  const focusParagraphs = rawContent.trim().split(/\n\n+/).filter(Boolean);
  const focusTotal = Math.max(1, focusParagraphs.length);
  const focusIndex = Math.min(focusParagraphIndex, focusTotal - 1);
  const focusParagraph = focusParagraphs[focusIndex] ?? (rawContent.trim() || "No content yet.");

  const openHistoryModal = useCallback(() => {
    setHistoryModalOpen(true);
    setPreviewVersionId(null);
    setVersions([]);
    setVersionsLoading(true);
    fetch(`/api/entries/versions?date=${dateKey}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; rawContent: string; correctedContent: string; createdAt: string }[]) => setVersions(Array.isArray(data) ? data : []))
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  }, [dateKey]);

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      setRestoringId(versionId);
      try {
        const res = await fetch("/api/entries/versions/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId }),
        });
        if (!res.ok) throw new Error("Restore failed");
        const data = await res.json();
        setEntry(data);
        setTitle(data?.title ?? "");
        setRawContent(data?.rawContent ?? "");
        setHistoryModalOpen(false);
        onEntrySaved?.();
      } catch (err) {
        console.error(err);
      } finally {
        setRestoringId(null);
      }
    },
    [onEntrySaved]
  );

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let aras: ArasData | null = null;
  if (entry?.arasContent) {
    try {
      const parsed = JSON.parse(entry.arasContent) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "aras" in parsed &&
        (parsed as ArasData).aras
      ) {
        aras = parsed as ArasData;
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const closeOverviewModal = useCallback(() => {
    if (overviewModalExiting) return;
    setOverviewModalExiting(true);
    const duration = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 180 : 220;
    overviewModalExitTimeoutRef.current = setTimeout(() => {
      overviewModalExitTimeoutRef.current = null;
      setOverviewModalOpen(false);
      setOverviewModalExiting(false);
      onOverviewModalOpenChange?.(false);
      requestAnimationFrame(() => expandButtonRef.current?.focus());
    }, duration);
  }, [onOverviewModalOpenChange, overviewModalExiting]);

  useEffect(() => {
    return () => {
      if (overviewModalExitTimeoutRef.current) clearTimeout(overviewModalExitTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    onOverviewModalOpenChange?.(overviewModalOpen);
  }, [overviewModalOpen, onOverviewModalOpenChange]);

  useFocusTrap(overviewModalRef, {
    enabled: overviewModalOpen,
    onEscape: closeOverviewModal,
  });

  return (
    <div className="relative h-full w-full">
      {/* Dim overlay when Overview modal is open or exiting */}
      {(overviewModalOpen || overviewModalExiting) && (
        <div
          className="overview-modal-backdrop absolute inset-0 z-10 pointer-events-auto"
          aria-hidden
        />
      )}

      <section className="flex h-full min-h-0 w-full flex-col">
      <header className="animate-paper-headline flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-6 sm:p-8 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            Journal entry
          </p>
          <h2 id="journal-entry-title" className="text-headline-2 mt-1 text-xl sm:text-2xl">
            {dateLabel}
          </h2>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-2">
          {entry != null && (
            <>
              <a
                href={`/api/entries/export?format=json&scope=single&date=${dateKey}`}
                download={`journal-${dateKey}.json`}
                className="header-icon-btn inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2.5 text-[var(--body)] transition hover:bg-[var(--border)]/50 hover:text-[var(--headline)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                aria-label="Export as JSON"
                title="Export as JSON"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              </a>
              <a
                href={`/api/entries/export?format=markdown&scope=single&date=${dateKey}`}
                download={`journal-${dateKey}.md`}
                className="header-icon-btn inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2.5 text-[var(--body)] transition hover:bg-[var(--border)]/50 hover:text-[var(--headline)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                aria-label="Export as Markdown"
                title="Export as Markdown"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </a>
              <button
                type="button"
                onClick={openHistoryModal}
                disabled={saving}
                className="header-icon-btn inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2.5 text-[var(--body)] transition hover:bg-[var(--border)]/50 hover:text-[var(--headline)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
                aria-label="Version history"
                title="Version history"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting || saving}
                className="header-icon-btn inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2.5 text-[var(--body)] transition hover:bg-[var(--error)]/15 hover:text-[var(--error)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
                aria-label="Delete entry"
              >
                <IconTrash />
              </button>
            </>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="header-icon-btn inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2.5 text-[var(--body)] transition hover:bg-[var(--border)]/50 hover:text-[var(--headline)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              aria-label="Close"
            >
              <IconClose className="h-[18px] w-[18px] shrink-0" />
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden max-sm:overflow-y-auto sm:flex-row">
        {/* Journal form (left on desktop; first on mobile) */}
        <div className="scrollbar-warm order-1 flex min-w-0 flex-1 flex-col overflow-y-auto max-sm:min-h-0 sm:order-1">
          {loading ? (
            <p className="animate-paper-form p-6 sm:p-8 text-body-soft text-sm">Loading…</p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="animate-paper-form flex flex-col gap-6 p-6 sm:p-8"
              aria-busy={saving}
            >
              <fieldset className="flex flex-col gap-6 border-0 p-0 m-0 min-w-0" disabled={saving}>
              <div className="space-y-2">
                <label htmlFor="entry-title" className="text-body text-sm font-medium text-[var(--headline-2)]">
                  Title (optional)
                </label>
                <input
                  id="entry-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this day a title"
                  className="input-warm block w-full px-4 py-2.5 text-sm"
                />
              </div>

              {dailyPrompt && (
                <p className="text-body-soft text-sm italic" role="complementary" aria-label="Prompt of the day">
                  {dailyPrompt}
                </p>
              )}
              {onOpenTemplates && !rawContent.trim() && (
                <p className="text-body-soft text-sm">
                  <button
                    type="button"
                    onClick={onOpenTemplates}
                    className="text-[var(--accent)] hover:underline"
                  >
                    Start from template
                  </button>
                </p>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="entry-content" className="text-body text-sm font-medium text-[var(--headline-2)]">
                    What&apos;s on your mind?
                  </label>
                  <button
                    type="button"
                    onClick={() => setFocusMode((m) => !m)}
                    className="text-body-soft text-xs hover:text-[var(--accent)]"
                  >
                    {focusMode ? "Edit" : "Focus mode"}
                  </button>
                </div>
                {focusMode ? (
                  <div className="paper input-warm flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-paper)] px-4 py-4">
                    <p className="text-body-soft min-h-[8rem] text-sm leading-[1.8] whitespace-pre-wrap">
                      {focusParagraph}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setFocusParagraphIndex((i) => Math.max(0, i - 1))}
                        disabled={focusIndex <= 0}
                        className="btn-secondary min-h-[36px] px-3 text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-body-soft text-xs">
                        {focusIndex + 1} / {focusTotal}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFocusParagraphIndex((i) => Math.min(focusTotal - 1, i + 1))}
                        disabled={focusIndex >= focusTotal - 1}
                        className="btn-secondary min-h-[36px] px-3 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <EntryEditorToolbar onInsert={insertAtCursor} disabled={saving} />
                    <textarea
                      ref={entryContentRef}
                      id="entry-content"
                      rows={6}
                      value={rawContent}
                      onChange={(e) => setRawContent(e.target.value)}
                      placeholder="Write your journal entry…"
                      className="paper input-warm text-body-soft block w-full resize-y rounded-t-none px-4 py-3 text-sm leading-[1.8]"
                    />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="entry-mood" className="text-body text-sm font-medium text-[var(--headline-2)]">
                    Mood (optional)
                  </label>
                  <input
                    id="entry-mood"
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g. Calm, Energized"
                    className="input-warm block w-full px-4 py-2.5 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="entry-tags" className="text-body text-sm font-medium text-[var(--headline-2)]">
                    Tags (optional)
                  </label>
                  <input
                    id="entry-tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    onFocus={() => {
                      if (tagSuggestions.length === 0) {
                        fetch("/api/entries/tags")
                          .then((res) => (res.ok ? res.json() : { tags: [] }))
                          .then((data: { tags?: string[] }) => setTagSuggestions(Array.isArray(data?.tags) ? data.tags : []))
                          .catch(() => setTagSuggestions([]));
                      }
                    }}
                    placeholder="e.g. work, gratitude"
                    className="input-warm block w-full px-4 py-2.5 text-sm"
                  />
                  {tagSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tagSuggestions
                        .filter((t) => !tags.split(",").map((s) => s.trim()).includes(t))
                        .slice(0, 12)
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const trimmed = tags.trim();
                              setTags(trimmed ? (trimmed.endsWith(",") ? `${trimmed} ${tag}` : `${trimmed}, ${tag}`) : tag);
                            }}
                            className="rounded bg-[var(--border)]/50 px-2 py-1 text-xs text-[var(--body)] hover:bg-[var(--border)]"
                          >
                            {tag}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              </fieldset>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center justify-center gap-2 w-full px-4 py-3 text-sm disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <IconSpinner className="shrink-0" aria-hidden />
                    <span>Processing…</span>
                  </>
                ) : (
                  "Save entry"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Overview panel (right on desktop; below on mobile) */}
        <div
          className="overview-panel-transition order-2 flex shrink-0 flex-col overflow-hidden border-l border-[var(--border)] max-sm:order-2 max-sm:max-h-[40vh] max-sm:border-l-0 max-sm:border-t max-sm:!w-full max-sm:!min-w-0 sm:order-2 sm:min-h-0 journal-overview-mobile"
          style={{
            width: overviewOpen ? `${OVERVIEW_WIDTH_PCT}%` : 0,
            minWidth: overviewOpen ? 220 : 0,
          }}
          aria-hidden={!overviewOpen}
        >
          <div className="scrollbar-warm flex h-full min-w-[220px] flex-col overflow-y-auto p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-headline font-semibold text-lg tracking-wide">Overview</h3>
              <button
                ref={expandButtonRef}
                type="button"
                onClick={() => {
                  setOverviewModalOpen(true);
                  onOverviewModalOpenChange?.(true);
                }}
                disabled={saving}
                className={`expand-overview-btn ml-auto flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded p-2.5 text-[var(--muted)] transition-all duration-150 hover:scale-105 hover:opacity-100 hover:bg-[var(--border)]/40 hover:text-[var(--headline)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${overviewModalOpen ? "pointer-events-none opacity-50" : ""} ${saving ? "pointer-events-none opacity-60" : ""}`}
                aria-label="Expand Overview"
                title="Expand Overview"
                aria-disabled={overviewModalOpen || saving}
              >
                <IconExpand />
              </button>
            </div>
            {saving ? (
              <div className="overview-skeleton mt-4 space-y-5 font-[var(--font-sans)]" aria-busy="true" aria-label="Processing your entry">
                <div className="overview-skeleton-line h-3 w-full rounded" />
                <dl className="grid gap-4">
                  {["Activity", "Reflection", "Analysis", "Summary"].map((label) => (
                    <div key={label}>
                      <dt className="text-body text-xs font-medium text-[var(--muted)]">{label}</dt>
                      <dd className="mt-1.5 h-10 w-full rounded overview-skeleton-shimmer" />
                    </div>
                  ))}
                </dl>
              </div>
            ) : aras ? (
              <div className="overview-content-visible mt-4 space-y-5 font-[var(--font-sans)]">
                {aras.corrected_entry && (
                  <p className="text-body-soft text-sm leading-relaxed">{aras.corrected_entry}</p>
                )}
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-body text-xs font-medium text-[var(--muted)]">Activity</dt>
                    <dd className="text-body-soft mt-0.5 text-sm leading-relaxed">{aras.aras.activity}</dd>
                  </div>
                  <div>
                    <dt className="text-body text-xs font-medium text-[var(--muted)]">Reflection</dt>
                    <dd className="text-body-soft mt-0.5 text-sm leading-relaxed">{aras.aras.reflection}</dd>
                  </div>
                  <div>
                    <dt className="text-body text-xs font-medium text-[var(--muted)]">Analysis</dt>
                    <dd className="text-body-soft mt-0.5 text-sm leading-relaxed">{aras.aras.analysis}</dd>
                  </div>
                  <div>
                    <dt className="text-body text-xs font-medium text-[var(--muted)]">Summary</dt>
                    <dd className="text-body-soft mt-0.5 text-sm leading-relaxed">{aras.aras.summary}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-body-soft mt-4 text-sm">
                Save your entry to see a gentle overview here.
              </p>
            )}
          </div>
        </div>

        {/* Collapsible toggle — rightmost (desktop only); fixed width so it stays on the right */}
        <button
          type="button"
          onClick={() => setOverviewOpen((o) => !o)}
          className="overview-toggle order-3 hidden w-10 shrink-0 items-center justify-center self-stretch border-l border-[var(--border)] bg-[var(--bg-paper)] text-[var(--body)] transition hover:bg-[var(--border)]/40 hover:text-[var(--headline)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--accent)] sm:flex dark:hover:shadow-[0_0_12px_var(--accent-glow)]"
          aria-label={overviewOpen ? "Collapse overview" : "Expand overview"}
          aria-expanded={overviewOpen}
        >
          <span className="text-sm font-medium" aria-hidden>
            {overviewOpen ? "›" : "‹"}
          </span>
        </button>
      </div>
    </section>

      {/* Overview expanded modal (portal) — stays mounted during exit animation */}
      {(overviewModalOpen || overviewModalExiting) &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="overview-modal-title"
          >
            <div
              className={`overview-modal-backdrop absolute inset-0 ${overviewModalExiting ? "overview-modal-backdrop-exit" : ""}`}
              onClick={closeOverviewModal}
              aria-hidden
            />
            <div
              ref={overviewModalRef}
              className={`overview-modal-content relative z-10 flex max-h-[85vh] w-full max-w-[70%] flex-col overflow-hidden ${overviewModalExiting ? "overview-modal-content-exit" : ""}`}
              style={{ maxWidth: "min(70%, 42rem)" }}
            >
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-8 pt-8 pb-6">
                <div>
                  <h2
                    id="overview-modal-title"
                    className="text-headline text-2xl font-normal tracking-wide"
                  >
                    Overview
                  </h2>
                  <p className="text-body-soft mt-1.5 text-sm">{dateLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={closeOverviewModal}
                  className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[var(--body)] transition hover:bg-[var(--border)]/50 hover:text-[var(--headline)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  aria-label="Close"
                >
                  <IconClose />
                </button>
              </header>
              <div className="scrollbar-warm flex-1 overflow-y-auto px-8 pb-8 pt-1">
                {saving ? (
                  <div className="overview-skeleton font-[var(--font-sans)] space-y-8" aria-busy="true" aria-label="Processing your entry">
                    {["Activity", "Reflection", "Analysis", "Summary"].map((label) => (
                      <div key={label} className="overview-modal-section">
                        <dt className="overview-section-label">{label}</dt>
                        <dd className="mt-3 h-16 w-full rounded overview-skeleton-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : aras ? (
                  <dl className="overview-content-visible font-[var(--font-sans)] space-y-8">
                    <div className="overview-modal-section">
                      <dt className="overview-section-label">Activity</dt>
                      <dd className="text-body-soft mt-3 text-[15px] leading-[1.7]">{aras.aras.activity}</dd>
                    </div>
                    <div className="overview-modal-section">
                      <dt className="overview-section-label">Reflection</dt>
                      <dd className="text-body-soft mt-3 text-[15px] leading-[1.7]">{aras.aras.reflection}</dd>
                    </div>
                    <div className="overview-modal-section">
                      <dt className="overview-section-label">Analysis</dt>
                      <dd className="text-body-soft mt-3 text-[15px] leading-[1.7]">{aras.aras.analysis}</dd>
                    </div>
                    <div className="overview-modal-section">
                      <dt className="overview-section-label">Summary</dt>
                      <dd className="text-body-soft mt-3 text-[15px] leading-[1.7]">{aras.aras.summary}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-body-soft text-sm leading-[1.75]">
                    Save your entry to see a gentle overview here.
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      <EntryVersionHistory
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        versions={versions}
        versionsLoading={versionsLoading}
        currentRawContent={rawContent}
        previewVersionId={previewVersionId}
        setPreviewVersionId={setPreviewVersionId}
        restoringId={restoringId}
        onRestore={handleRestoreVersion}
      />

      {/* Delete confirmation modal */}
      {deleteConfirmOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <div
              className="absolute inset-0 bg-[var(--modal-overlay)]"
              onClick={handleDeleteCancel}
              aria-hidden
            />
            <div className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-warm)]">
              <h2 id="delete-confirm-title" className="text-headline text-lg font-semibold">
                Delete entry?
              </h2>
              <p className="text-body-soft mt-2 text-sm">
                Are you sure you want to delete this entry? You can’t undo this, but the entry is only hidden and not permanently removed.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="btn-secondary min-h-[44px] min-w-[44px] px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--error)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--error)] disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <IconSpinner className="inline-block h-4 w-4 shrink-0 align-middle" aria-hidden />
                      <span className="ml-2">Deleting…</span>
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
