"use client";

type EntryEditorToolbarProps = {
  onInsert: (before: string, after: string) => void;
  disabled?: boolean;
};

export function EntryEditorToolbar({ onInsert, disabled }: EntryEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-[var(--radius)] border border-b-0 border-[var(--border)] bg-[var(--bg-paper)] px-2 py-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onInsert("**", "**")}
        className="min-h-[36px] min-w-[36px] rounded p-1.5 text-sm font-bold text-[var(--body)] transition hover:bg-[var(--border)]/50 disabled:opacity-50"
        title="Bold"
        aria-label="Bold"
      >
        B
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onInsert("*", "*")}
        className="min-h-[36px] min-w-[36px] rounded p-1.5 text-sm italic text-[var(--body)] transition hover:bg-[var(--border)]/50 disabled:opacity-50"
        title="Italic"
        aria-label="Italic"
      >
        I
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onInsert("\n## ", "")}
        className="min-h-[36px] rounded px-2 py-1.5 text-xs font-medium text-[var(--body)] transition hover:bg-[var(--border)]/50 disabled:opacity-50"
        title="Heading"
        aria-label="Heading"
      >
        H
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onInsert("\n- ", "")}
        className="min-h-[36px] rounded px-2 py-1.5 text-xs text-[var(--body)] transition hover:bg-[var(--border)]/50 disabled:opacity-50"
        title="List"
        aria-label="List"
      >
        •
      </button>
    </div>
  );
}
