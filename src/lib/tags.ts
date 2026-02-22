/**
 * Shared tag parsing. Tags are stored as a single comma-separated string in the DB.
 * Use this for API responses and filtering so parsing is consistent.
 */

const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 10;

/**
 * Parse a tags string (e.g. "work, gratitude") into an array of trimmed, deduped tags.
 * Respects max length per tag and max count.
 */
export function parseTags(tagsStr: string | null | undefined): string[] {
  if (tagsStr == null || typeof tagsStr !== "string") return [];
  const seen = new Set<string>();
  return tagsStr
    .split(",")
    .map((s) => s.trim().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean)
    .filter((t) => {
      if (seen.has(t.toLowerCase())) return false;
      seen.add(t.toLowerCase());
      return true;
    })
    .slice(0, MAX_TAGS);
}

/**
 * First tag from a tags string, or null.
 */
export function firstTag(tagsStr: string | null | undefined): string | null {
  const tags = parseTags(tagsStr);
  return tags[0] ?? null;
}

/** Sanitize tag for use in DB filter (no comma, no LIKE wildcards, max length). */
export function sanitizeTagForFilter(tag: string | null | undefined): string | null {
  if (tag == null || typeof tag !== "string") return null;
  const t = tag.replace(/[,%_]/g, "").trim().slice(0, MAX_TAG_LENGTH);
  return t || null;
}

/**
 * Prisma-friendly "entry has this tag" filter. Use with AND. Returns null if tag invalid.
 * Caller must spread into where: ...(tagFilter(tag) ?? {}).
 */
export function tagFilterForPrisma(tag: string | null | undefined): { OR: Array<{ tags: string | { startsWith: string } | { endsWith: string } | { contains: string } }> } | null {
  const t = sanitizeTagForFilter(tag);
  if (!t) return null;
  return {
    OR: [
      { tags: t },
      { tags: { startsWith: t + "," } },
      { tags: { endsWith: "," + t } },
      { tags: { contains: "," + t + "," } },
    ],
  };
}
