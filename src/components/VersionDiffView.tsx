"use client";

import type { DiffLine } from "@/lib/diff-utils";
import { computeLineDiff } from "@/lib/diff-utils";

type VersionDiffViewProps = {
  oldContent: string;
  newContent: string;
  className?: string;
};

function DiffLines({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="min-w-0 font-mono text-sm">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex min-w-0 ${
            line.type === "added"
              ? "bg-green-500/10 text-green-800 dark:text-green-200"
              : line.type === "removed"
                ? "bg-red-500/10 text-red-800 dark:text-red-200"
                : "text-[var(--body-soft)]"
          }`}
        >
          <span className="select-none shrink-0 w-6 pr-2 text-right text-[var(--muted)]" aria-hidden>
            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
          </span>
          <span className="min-w-0 break-words whitespace-pre-wrap">{line.value || " "}</span>
        </div>
      ))}
    </div>
  );
}

export function VersionDiffView({ oldContent, newContent, className = "" }: VersionDiffViewProps) {
  const lines = computeLineDiff(oldContent, newContent);
  return (
    <div className={`overflow-auto rounded border border-[var(--border)] bg-[var(--bg-paper)] p-3 ${className}`}>
      <p className="text-body-soft mb-2 text-xs">
        Comparison: that version (removed) vs current (added).
      </p>
      <DiffLines lines={lines} />
    </div>
  );
}
