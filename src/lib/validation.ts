/**
 * API validation schemas (Zod) and content sanitization.
 * Strict schemas, no unknown fields. Structured error responses.
 */

import { z } from "zod";

const tagsSchema = z
  .union([
    z.string(),
    z.array(z.string().max(30)).max(10),
  ])
  .optional()
  .transform((t): string[] | undefined => {
    if (t == null) return undefined;
    if (typeof t === "string") {
      return t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((s) => s.slice(0, 30));
    }
    return t;
  });

export const postEntryBodySchema = z.strictObject({
  date: z.iso.date(),
  title: z.string().max(120).optional(),
  rawContent: z.string().min(1, "rawContent is required").max(5000, "rawContent max 5000 chars"),
  mood: z.string().max(100).optional(),
  tags: tagsSchema,
});

export type PostEntryBody = z.infer<typeof postEntryBodySchema>;

const templateNameSchema = z.string().min(1, "Name is required").max(120);
const templateBodySchema = z.string().max(5000, "Body max 5000 chars");

export const postTemplateBodySchema = z.strictObject({
  name: templateNameSchema,
  body: templateBodySchema,
});

export const patchTemplateBodySchema = z.strictObject({
  name: templateNameSchema.optional(),
  body: templateBodySchema.optional(),
}).refine((d) => d.name !== undefined || d.body !== undefined, { message: "Provide name or body" });

export type PostTemplateBody = z.infer<typeof postTemplateBodySchema>;
export type PatchTemplateBody = z.infer<typeof patchTemplateBodySchema>;

export function parsePostTemplateBody(unknownBody: unknown): { success: true; data: PostTemplateBody } | { success: false; error: string; status: number } {
  const result = postTemplateBodySchema.safeParse(unknownBody);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.issues[0];
  return { success: false, error: first ? `${first.path.join(".")}: ${first.message}` : "Validation failed", status: 400 };
}

export function parsePatchTemplateBody(unknownBody: unknown): { success: true; data: PatchTemplateBody } | { success: false; error: string; status: number } {
  const result = patchTemplateBodySchema.safeParse(unknownBody);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.issues[0];
  return { success: false, error: first ? `${first.path.join(".")}: ${first.message}` : "Validation failed", status: 400 };
}

/** Parse and validate POST /api/entries body. Returns { success, data } or { success: false, error, status } */
export function parsePostEntryBody(unknownBody: unknown): { success: true; data: PostEntryBody } | { success: false; error: string; status: number; details?: z.ZodIssue[] } {
  const result = postEntryBodySchema.safeParse(unknownBody);
  if (result.success) return { success: true, data: result.data };
  const err = result.error;
  const details = err.issues;
  const first = details[0];
  const message = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
  const status = 400;
  return { success: false, error: message, status, details: details };
}

/** GET /api/entries/previews query params */
export const getPreviewsQuerySchema = z.strictObject({
  year: z.string().regex(/^\d+$/).transform(Number),
  month: z.string().regex(/^\d+$/).transform(Number),
  tag: z.string().max(30).optional(),
}).refine(({ month }) => month >= 0 && month <= 11, { message: "month must be 0-11", path: ["month"] });

export type GetPreviewsQuery = z.infer<typeof getPreviewsQuerySchema>;

export function parseGetPreviewsQuery(searchParams: { get: (k: string) => string | null }): { success: true; data: GetPreviewsQuery } | { success: false; error: string; status: number } {
  const year = searchParams.get("year") ?? "";
  const month = searchParams.get("month") ?? "";
  const tag = searchParams.get("tag") ?? undefined;
  const result = getPreviewsQuerySchema.safeParse({ year, month, tag });
  if (result.success) return { success: true, data: result.data };
  const first = result.error.issues[0];
  return { success: false, error: first ? first.message : "Invalid query", status: 400 };
}

/** POST /api/register body */
export const registerBodySchema = z.strictObject({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

/** Parse and validate POST /api/register body. */
export function parseRegisterBody(unknownBody: unknown): { success: true; data: RegisterBody } | { success: false; error: string; status: number; details?: z.ZodIssue[] } {
  const result = registerBodySchema.safeParse(unknownBody);
  if (result.success) return { success: true, data: result.data };
  const err = result.error;
  const details = err.issues;
  const first = details[0];
  const message = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
  return { success: false, error: message, status: 400, details };
}

/** GET /api/entries/export query params */
export const getExportQuerySchema = z
  .strictObject({
    format: z.enum(["json", "markdown"]),
    scope: z.enum(["single", "full"]),
    date: z.string().optional(),
  })
  .refine((data) => data.scope !== "single" || (data.date != null && data.date.length > 0), {
    message: "date is required for single export",
    path: ["date"],
  });

export type GetExportQuery = z.infer<typeof getExportQuerySchema>;

export function parseGetExportQuery(searchParams: { get: (k: string) => string | null }): { success: true; data: GetExportQuery } | { success: false; error: string; status: number } {
  const format = (searchParams.get("format") ?? "json").toLowerCase();
  const scope = (searchParams.get("scope") ?? "single").toLowerCase();
  const date = searchParams.get("date") ?? undefined;
  const result = getExportQuerySchema.safeParse({ format, scope, date });
  if (result.success) return { success: true, data: result.data };
  const first = result.error.issues[0];
  return { success: false, error: first ? first.message : "Invalid query", status: 400 };
}

/** POST /api/entries/versions/restore body */
export const restoreVersionBodySchema = z.strictObject({
  versionId: z.string().min(1, "versionId is required").max(64),
});

export type RestoreVersionBody = z.infer<typeof restoreVersionBodySchema>;

/** Parse and validate POST /api/entries/versions/restore body. */
export function parseRestoreVersionBody(unknownBody: unknown): { success: true; data: RestoreVersionBody } | { success: false; error: string; status: number } {
  const result = restoreVersionBodySchema.safeParse(unknownBody);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.issues[0];
  return { success: false, error: first ? first.message : "Validation failed", status: 400 };
}

/** Sanitize rawContent before storage or sending to AI. */
export function sanitizeRawContent(input: string): string {
  let s = input.trim();
  if (s.length === 0) return s;
  // Remove script tags and content
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Strip any remaining HTML-like tags
  s = s.replace(/<[^>]+>/g, "");
  // Normalize line breaks to \n
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Enforce hard max length
  const MAX = 5000;
  if (s.length > MAX) s = s.slice(0, MAX);
  return s;
}
