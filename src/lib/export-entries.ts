/**
 * Export entries as JSON or Markdown. Sanitizes content to prevent injection.
 * Logic is separate from API for testability.
 */

import type { OverviewFromAras } from "@/types";
import { sanitizeRawContent } from "@/lib/validation";

export type ExportEntry = {
  date: string;
  title: string | null;
  rawContent: string;
  correctedContent: string | null;
  overview: {
    activity: string;
    reflection: string;
    analysis: string;
    summary: string;
  } | null;
};

/** Build a single entry for export from DB row + arasContent. */
export function buildExportEntry(
  entryDate: string,
  title: string | null,
  rawContent: string,
  arasContent: string | null
): ExportEntry {
  const raw = sanitizeRawContent(rawContent);
  let overview: ExportEntry["overview"] = null;
  let correctedContent: string | null = null;
  if (arasContent) {
    try {
      const aras = JSON.parse(arasContent) as OverviewFromAras;
      overview = aras.aras
        ? {
            activity: sanitizeForExport(aras.aras.activity),
            reflection: sanitizeForExport(aras.aras.reflection),
            analysis: sanitizeForExport(aras.aras.analysis),
            summary: sanitizeForExport(aras.aras.summary),
          }
        : null;
      correctedContent =
        typeof aras.corrected_entry === "string"
          ? sanitizeForExport(aras.corrected_entry)
          : null;
    } catch {
      // leave overview/corrected null
    }
  }
  return {
    date: entryDate,
    title: title ? sanitizeForExport(title) : null,
    rawContent: sanitizeForExport(raw),
    correctedContent,
    overview,
  };
}

/** Escape/sanitize string for safe inclusion in JSON or plain text. Prevents injection. */
function sanitizeForExport(s: string): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/** Produce JSON string for export (single entry or array). */
export function toJsonExport(entries: ExportEntry[]): string {
  const first = entries[0];
  const payload =
    entries.length === 1 && first !== undefined
      ? first
      : { exportedAt: new Date().toISOString(), entries };
  return JSON.stringify(payload, null, 2);
}

/** Produce Markdown string for one entry. */
export function toMarkdownEntry(e: ExportEntry): string {
  const parts: string[] = [];
  parts.push(`# ${e.date}`);
  parts.push("");
  parts.push(`## ${e.title ?? "Untitled"}`);
  parts.push("");
  parts.push("### Raw Entry");
  parts.push("");
  parts.push(escapeMarkdownBlock(e.rawContent));
  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push("## Overview");
  if (e.overview) {
    parts.push("");
    parts.push("### Activity");
    parts.push("");
    parts.push(escapeMarkdownBlock(e.overview.activity));
    parts.push("");
    parts.push("### Reflection");
    parts.push("");
    parts.push(escapeMarkdownBlock(e.overview.reflection));
    parts.push("");
    parts.push("### Analysis");
    parts.push("");
    parts.push(escapeMarkdownBlock(e.overview.analysis));
    parts.push("");
    parts.push("### Summary");
    parts.push("");
    parts.push(escapeMarkdownBlock(e.overview.summary));
  } else {
    parts.push("");
    parts.push("*No overview.*");
  }
  return parts.join("\n");
}

/** Escape content for markdown: use fenced block to avoid injection. */
function escapeMarkdownBlock(s: string): string {
  const trimmed = sanitizeForExport(s).trim();
  if (!trimmed) return "";
  const fence = "```";
  return `${fence}\n${trimmed}\n${fence}`;
}

/** Produce full Markdown document for multiple entries. */
export function toMarkdownExport(entries: ExportEntry[]): string {
  const header = `# Journal Export\n\nExported: ${new Date().toISOString()}\n\n---\n\n`;
  const body = entries.map((e) => toMarkdownEntry(e)).join("\n\n---\n\n");
  return header + body;
}

const STREAM_BATCH_SIZE = 100;

/** Create a ReadableStream that streams JSON export for an async iterable of entries. */
export function streamJsonExport(
  entriesAsync: AsyncIterable<ExportEntry>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode('{"exportedAt":"' + new Date().toISOString() + '","entries":['));
        let first = true;
        for await (const e of entriesAsync) {
          if (!first) controller.enqueue(encoder.encode(","));
          controller.enqueue(encoder.encode(JSON.stringify(e)));
          first = false;
        }
        controller.enqueue(encoder.encode("]}"));
      } finally {
        controller.close();
      }
    },
  });
}

/** Create a ReadableStream that streams Markdown export for an async iterable of entries. */
export function streamMarkdownExport(
  entriesAsync: AsyncIterable<ExportEntry>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode("# Journal Export\n\nExported: " + new Date().toISOString() + "\n\n---\n\n"));
        for await (const e of entriesAsync) {
          controller.enqueue(encoder.encode(toMarkdownEntry(e) + "\n\n---\n\n"));
        }
      } finally {
        controller.close();
      }
    },
  });
}

export { STREAM_BATCH_SIZE };
