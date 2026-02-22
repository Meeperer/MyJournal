"use client";

import { createPortal } from "react-dom";
import { IconClose } from "./icons";
import { VersionDiffView } from "./VersionDiffView";

export type EntryVersionItem = {
  id: string;
  rawContent: string;
  correctedContent: string;
  createdAt: string;
};

type EntryVersionHistoryProps = {
  open: boolean;
  onClose: () => void;
  versions: EntryVersionItem[];
  versionsLoading: boolean;
  currentRawContent: string;
  previewVersionId: string | null;
  setPreviewVersionId: (id: string | null) => void;
  restoringId: string | null;
  onRestore: (versionId: string) => void;
};

export function EntryVersionHistory({
  open,
  onClose,
  versions,
  versionsLoading,
  currentRawContent,
  previewVersionId,
  setPreviewVersionId,
  restoringId,
  onRestore,
}: EntryVersionHistoryProps) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div
        className="absolute inset-0 bg-[var(--modal-overlay)]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-warm)]">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 id="history-modal-title" className="text-headline text-lg font-semibold">
            Version history
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
        <div className="scrollbar-warm flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
          {versionsLoading ? (
            <p className="text-body-soft text-sm">Loading…</p>
          ) : versions.length === 0 ? (
            <p className="text-body-soft text-sm">No previous versions yet.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li key={v.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-paper)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <span className="text-body-soft text-xs">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewVersionId(previewVersionId === v.id ? null : v.id)}
                        className="min-h-[44px] rounded px-3 py-2 text-sm text-[var(--accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                      >
                        {previewVersionId === v.id ? "Hide preview" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRestore(v.id)}
                        disabled={restoringId != null}
                        className="min-h-[44px] rounded px-3 py-2 text-sm font-medium text-[var(--accent)] hover:underline disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                      >
                        {restoringId === v.id ? "Restoring…" : "Restore this version"}
                      </button>
                    </div>
                  </div>
                  {previewVersionId === v.id && (
                    <div className="border-t border-[var(--border)] p-3">
                      <VersionDiffView oldContent={v.rawContent} newContent={currentRawContent} />
                    </div>
                  )}
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
