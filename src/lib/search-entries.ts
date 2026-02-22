/**
 * Search entries by title, raw content, and overview. Excludes soft-deleted.
 * Uses Postgres full-text search (search_vector) when available; falls back to ILIKE.
 */

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeTagForFilter, tagFilterForPrisma } from "@/lib/tags";
import type { SearchResultItem } from "@/types";

/** Remove LIKE wildcards from user input so search is literal. */
function sanitizeSearchQuery(q: string): string {
  return q.replace(/[%_]/g, " ").trim().slice(0, 200);
}

export type SearchEntriesOptions = {
  userId: string;
  query: string;
  tag?: string | null;
  page?: number;
  pageSize?: number;
};

export type SearchEntriesResult = {
  data: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
};

type DbRow = { id: string; entryDate: Date; title: string | null; rawContent: string; arasContent: string | null };

/** Search using FTS when query is non-empty; optional tag filter. Paginated. */
export async function searchEntries(
  opts: SearchEntriesOptions
): Promise<SearchEntriesResult> {
  const { userId, query, tag: tagParam, page = 1, pageSize = 20 } = opts;
  const trimmed = sanitizeSearchQuery(query);
  const tagWhere = tagFilterForPrisma(tagParam ?? null);
  const tagSanitized = sanitizeTagForFilter(tagParam ?? null);
  if (trimmed.length === 0 && !tagWhere) {
    return { data: [], total: 0, page: 1, pageSize };
  }

  const limit = Math.min(Math.max(1, pageSize), 100);
  const skip = (page - 1) * pageSize;

  if (trimmed.length > 0) {
    try {
      const tagCondition = tagSanitized
        ? Prisma.sql` AND (tags = ${tagSanitized} OR tags LIKE ${tagSanitized + ",%"} OR tags LIKE ${"," + tagSanitized} OR tags LIKE ${"," + tagSanitized + ","})`
        : Prisma.empty;
      const [entries, countResult] = await Promise.all([
        prisma.$queryRaw<DbRow[]>(
          Prisma.sql`
            SELECT id, "entryDate", title, "rawContent", "arasContent"
            FROM "JournalEntry"
            WHERE "userId" = ${userId} AND "deletedAt" IS NULL
              AND "search_vector" @@ plainto_tsquery('english', ${trimmed})
              ${tagCondition}
            ORDER BY "entryDate" DESC
            LIMIT ${limit} OFFSET ${skip}
          `,
        ),
        prisma.$queryRaw<[{ count: bigint }]>(
          Prisma.sql`
            SELECT COUNT(*)::int as count
            FROM "JournalEntry"
            WHERE "userId" = ${userId} AND "deletedAt" IS NULL
              AND "search_vector" @@ plainto_tsquery('english', ${trimmed})
              ${tagCondition}
          `,
        ),
      ]);
      const total = Number(countResult[0]?.count ?? 0);
      const data = mapRowsToResults(entries);
      return { data, total, page, pageSize: limit };
    } catch {
      // Fallback to ILIKE if FTS column missing or query fails
    }
  }

  const textWhere = trimmed.length > 0
    ? {
        OR: [
          { title: { contains: trimmed, mode: "insensitive" as const } },
          { rawContent: { contains: trimmed, mode: "insensitive" as const } },
          { arasContent: { contains: trimmed, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(tagWhere ?? {}),
        ...textWhere,
      },
      orderBy: { entryDate: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        entryDate: true,
        title: true,
        rawContent: true,
        arasContent: true,
      },
    }),
    prisma.journalEntry.count({
      where: {
        userId,
        deletedAt: null,
        ...(tagWhere ?? {}),
        ...textWhere,
      },
    }),
  ]);

  const data = mapRowsToResults(entries);
  return {
    data,
    total,
    page,
    pageSize: limit,
  };
}

function mapRowsToResults(
  rows: Array<{ id: string; entryDate: Date; title: string | null; rawContent: string; arasContent: string | null }>
): SearchResultItem[] {
  return rows.map((e) => {
    let overviewSummary: string | undefined;
    if (e.arasContent) {
      try {
        const aras = JSON.parse(e.arasContent) as { aras?: { summary?: string } };
        overviewSummary = aras.aras?.summary;
      } catch {
        // ignore
      }
    }
    return {
      id: e.id,
      entryDate: e.entryDate instanceof Date ? e.entryDate.toISOString().slice(0, 10) : String(e.entryDate).slice(0, 10),
      title: e.title,
      rawContent: e.rawContent,
      overviewSummary,
    };
  });
}
