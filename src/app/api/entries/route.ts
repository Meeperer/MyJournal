import { getAuthenticatedUser } from "@/lib/auth";
import { parseEntryDate } from "@/lib/date";
import { processEntryWithGroq } from "@/lib/aras";
import { logger } from "@/lib/logger";
import { parsePostEntryBody } from "@/lib/validation";
import { sanitizeRawContent } from "@/lib/validation";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import {
  jsonOk,
  json400,
  json401,
  json404,
  json429,
  jsonError,
} from "@/lib/api-response";
import {
  findEntryByDate,
  saveEntryWithVersion,
  softDeleteEntryByDate,
} from "@/lib/entries";

/** GET /api/entries?date=YYYY-MM-DD - get entry for the given date (current user). Excludes soft-deleted. */
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const date = parseEntryDate(dateStr);
  if (!date) {
    return json400(dateStr == null || dateStr.length === 0 ? "Missing date" : "Invalid date");
  }

  const entry = await findEntryByDate(auth.user.id, date);
  const response = entry
    ? {
        id: entry.id,
        entryDate: entry.entryDate,
        title: entry.title,
        rawContent: entry.rawContent,
        arasContent: entry.arasContent,
        mood: entry.mood,
        tags: entry.tags,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }
    : null;
  return jsonOk(response);
}

/** POST /api/entries - create or update entry (validated, sanitized, rate-limited) */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  let unknownBody: unknown;
  try {
    unknownBody = await request.json();
  } catch {
    return json400("Invalid JSON");
  }

  const parsed = parsePostEntryBody(unknownBody);
  if (!parsed.success) {
    return json400(parsed.error, parsed.details);
  }

  const data = parsed.data;
  const sanitizedContent = sanitizeRawContent(data.rawContent);
  if (sanitizedContent.length === 0) {
    return json400("rawContent is required (after sanitization)");
  }

  const entryDate = new Date(data.date + "T00:00:00.000Z");

  let arasContent: string | null = null;
  try {
    const aras = await processEntryWithGroq(
      sanitizedContent,
      data.date,
      data.title ?? undefined,
    );
    if (aras) arasContent = JSON.stringify(aras);
  } catch (err) {
    logger.error("ARAS processing error (entry still saved)", {
      requestId,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  const tagsStr = data.tags?.length ? data.tags.join(", ") : null;

  try {
    const entry = await saveEntryWithVersion({
      userId: auth.user.id,
      entryDate,
      title: data.title ?? null,
      rawContent: sanitizedContent,
      mood: data.mood ?? null,
      tags: tagsStr,
      arasContent,
    });

    const response = {
      id: entry.id,
      entryDate: entry.entryDate.toISOString().slice(0, 10),
      title: entry.title,
      rawContent: entry.rawContent,
      arasContent: entry.arasContent,
      mood: entry.mood,
      tags: entry.tags,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
    return jsonOk(response);
  } catch (err) {
    logger.error("POST /api/entries error", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    const message = err instanceof Error ? err.message : "Failed to save entry";
    return jsonError(message, 500);
  }
}

/** DELETE /api/entries?date=YYYY-MM-DD - soft-delete entry for the given date */
export async function DELETE(request: Request) {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const date = parseEntryDate(dateStr);
  if (!date) {
    return json400(dateStr == null || dateStr.length === 0 ? "Missing date" : "Invalid date");
  }

  const deleted = await softDeleteEntryByDate(auth.user.id, date);
  if (!deleted) {
    return json404("Entry not found or already deleted");
  }
  return jsonOk({ deleted: true });
}
