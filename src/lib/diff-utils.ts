/**
 * Text diff utilities for version comparison. Uses the `diff` package
 * to compute line-based changes between two strings.
 */

import * as Diff from "diff";

export type DiffLine = {
  type: "added" | "removed" | "unchanged";
  value: string;
  lineNumber?: number;
};

/**
 * Compare two text strings and return an array of diff lines for display.
 * Uses line-level diff; trailing newlines are normalized for comparison.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const b = newText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const changes = Diff.diffLines(a, b);
  const result: DiffLine[] = [];
  for (const part of changes) {
    const type = part.added ? "added" : part.removed ? "removed" : "unchanged";
    const lines = (part.value as string).split("\n");
    const hasTrailingNewline = (part.value as string).endsWith("\n");
    for (let i = 0; i < lines.length; i++) {
      const value = i < lines.length - 1 ? lines[i] + "\n" : (hasTrailingNewline ? lines[i] + "\n" : lines[i]);
      if (value === "\n" && i === lines.length - 1 && !hasTrailingNewline) continue;
      result.push({ type, value: value || "\n" });
    }
  }
  return result;
}
