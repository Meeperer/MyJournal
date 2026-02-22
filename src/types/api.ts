/**
 * Typed API response shapes and error body.
 */

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export type ApiSuccess<T> = { data: T };
export type ApiPaginated<T> = { data: T[]; total: number; page: number; pageSize: number };

export type SearchResultItem = {
  id: string;
  entryDate: string;
  title: string | null;
  rawContent: string;
  overviewSummary?: string;
  highlight?: { title?: string; rawContent?: string; overviewSummary?: string };
};

export type ExportFormat = "json" | "markdown";
export type ExportScope = "single" | "full";
