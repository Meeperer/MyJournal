/**
 * Entry business logic: soft delete, versioning, queries.
 * Kept separate from API routes for testability and reuse.
 */

import { prisma } from "@/lib/prisma";
import type { JournalEntryRecord, EntryVersionRecord } from "@/types";

const notDeleted = { deletedAt: null };

/** Get entry by user and date; excludes soft-deleted. Uses same unique key as upsert. */
export async function findEntryByDate(
  userId: string,
  entryDate: Date
): Promise<JournalEntryRecord | null> {
  const entry = await prisma.journalEntry.findUnique({
    where: {
      userId_entryDate: { userId, entryDate },
    },
  });
  if (!entry || entry.deletedAt != null) return null;
  return dbEntryToRecord(entry);
}

/** Get entry by id for the user; excludes soft-deleted. */
export async function findEntryById(
  userId: string,
  entryId: string
): Promise<JournalEntryRecord | null> {
  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId, ...notDeleted },
  });
  return entry ? dbEntryToRecord(entry) : null;
}

/** Soft-delete: set deletedAt. Returns true if found and not already deleted. */
export async function softDeleteEntry(
  userId: string,
  entryId: string
): Promise<boolean> {
  const updated = await prisma.journalEntry.updateMany({
    where: { id: entryId, userId, ...notDeleted },
    data: { deletedAt: new Date() },
  });
  return updated.count > 0;
}

/** Permanent delete (admin/future). Use with care. */
export async function permanentDeleteEntry(
  userId: string,
  entryId: string
): Promise<boolean> {
  const deleted = await prisma.journalEntry.deleteMany({
    where: { id: entryId, userId },
  });
  return deleted.count > 0;
}

/** Save a version snapshot before updating the entry. Call before upsert. */
export async function createEntryVersion(
  entryId: string,
  rawContent: string,
  correctedContent: string
): Promise<void> {
  await prisma.entryVersion.create({
    data: { entryId, rawContent, correctedContent },
  });
}

/** List versions for an entry (chronological, newest first). */
export async function getEntryVersions(
  userId: string,
  entryId: string
): Promise<EntryVersionRecord[]> {
  const versions = await prisma.entryVersion.findMany({
    where: { entryId, entry: { userId, ...notDeleted } },
    orderBy: { createdAt: "desc" },
  });
  return versions.map((v) => ({
    id: v.id,
    entryId: v.entryId,
    rawContent: v.rawContent,
    correctedContent: v.correctedContent,
    createdAt: v.createdAt.toISOString(),
  }));
}

/** Get a single version by id if it belongs to user's entry. */
export async function getEntryVersionById(
  userId: string,
  versionId: string
): Promise<EntryVersionRecord | null> {
  const v = await prisma.entryVersion.findFirst({
    where: {
      id: versionId,
      entry: { userId, ...notDeleted },
    },
  });
  return v
    ? {
        id: v.id,
        entryId: v.entryId,
        rawContent: v.rawContent,
        correctedContent: v.correctedContent,
        createdAt: v.createdAt.toISOString(),
      }
    : null;
}

/** Restore entry content from a previous version (rawContent only; user can re-save to regenerate overview). */
export async function restoreEntryFromVersion(
  userId: string,
  versionId: string
): Promise<JournalEntryRecord | null> {
  const v = await getEntryVersionById(userId, versionId);
  if (!v) return null;
  const entry = await prisma.journalEntry.updateMany({
    where: { id: v.entryId, userId, ...notDeleted },
    data: { rawContent: v.rawContent },
  });
  if (entry.count === 0) return null;
  const updated = await prisma.journalEntry.findUnique({
    where: { id: v.entryId },
  });
  return updated ? dbEntryToRecord(updated) : null;
}

function dbEntryToRecord(e: {
  id: string;
  userId: string;
  entryDate: Date;
  title: string | null;
  rawContent: string;
  arasContent: string | null;
  mood: string | null;
  tags: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): JournalEntryRecord {
  return {
    id: e.id,
    userId: e.userId,
    entryDate: e.entryDate.toISOString().slice(0, 10),
    title: e.title,
    rawContent: e.rawContent,
    arasContent: e.arasContent,
    mood: e.mood,
    tags: e.tags,
    deletedAt: e.deletedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** Soft-delete by user and date. Returns true if an entry was deleted. */
export async function softDeleteEntryByDate(
  userId: string,
  entryDate: Date
): Promise<boolean> {
  const entry = await prisma.journalEntry.findFirst({
    where: { userId, entryDate, ...notDeleted },
    select: { id: true },
  });
  if (!entry) return false;
  return softDeleteEntry(userId, entry.id);
}

/** Get entry by user and date for internal use (e.g. versioning). Includes soft-deleted. */
export async function findEntryByDateIncludeDeleted(
  userId: string,
  entryDate: Date
) {
  return prisma.journalEntry.findUnique({
    where: {
      userId_entryDate: { userId, entryDate },
    },
  });
}

export type OnThisDayItem = {
  id: string;
  entryDate: string;
  title: string | null;
  snippet: string;
};

/**
 * Entries on this calendar day in past years (same month/day, year < current year).
 * Returns id, entryDate, title, and a short snippet for display.
 */
export async function getOnThisDay(
  userId: string,
  month: number,
  day: number
): Promise<OnThisDayItem[]> {
  const currentYear = new Date().getFullYear();
  const pastDates: Date[] = [];
  for (let y = currentYear - 1; y >= currentYear - 10; y--) {
    const d = new Date(y, month, day);
    if (d.getMonth() === month && d.getDate() === day) pastDates.push(d);
  }
  if (pastDates.length === 0) return [];
  const entries = await prisma.journalEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      entryDate: { in: pastDates },
    },
    select: { id: true, entryDate: true, title: true, rawContent: true, arasContent: true },
    orderBy: { entryDate: "desc" },
  });
  return entries.map((e) => {
    let snippet = (e.title ?? "").trim();
    if (e.rawContent?.trim()) {
      const raw = e.rawContent.trim().slice(0, 200);
      snippet = snippet ? `${snippet} — ${raw}` : raw;
    }
    if (!snippet && e.arasContent) {
      try {
        const aras = JSON.parse(e.arasContent) as { aras?: { summary?: string } };
        snippet = aras.aras?.summary?.trim().slice(0, 200) ?? "";
      } catch {
        // ignore
      }
    }
    return {
      id: e.id,
      entryDate: e.entryDate.toISOString().slice(0, 10),
      title: e.title,
      snippet: snippet || "No preview",
    };
  });
}

export type SaveEntryWithVersionPayload = {
  userId: string;
  entryDate: Date;
  title: string | null;
  rawContent: string;
  mood: string | null;
  tags: string | null;
  arasContent: string | null;
};

/**
 * Save entry and optionally create a version snapshot in a single transaction.
 * If an existing non-deleted entry exists, a version is created before the upsert.
 */
export async function saveEntryWithVersion(
  payload: SaveEntryWithVersionPayload
): Promise<{
  id: string;
  entryDate: Date;
  title: string | null;
  rawContent: string;
  arasContent: string | null;
  mood: string | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}> {
  const { userId, entryDate, title, rawContent, mood, tags, arasContent } = payload;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.journalEntry.findUnique({
      where: { userId_entryDate: { userId, entryDate } },
    });
    if (existing && !existing.deletedAt) {
      await tx.entryVersion.create({
        data: {
          entryId: existing.id,
          rawContent: existing.rawContent,
          correctedContent: existing.arasContent ?? existing.rawContent,
        },
      });
    }
    const entry = await tx.journalEntry.upsert({
      where: { userId_entryDate: { userId, entryDate } },
      create: {
        userId,
        entryDate,
        title,
        rawContent,
        mood,
        tags,
        arasContent,
      },
      update: {
        title,
        rawContent,
        mood,
        tags,
        arasContent,
      },
    });
    return {
      id: entry.id,
      entryDate: entry.entryDate,
      title: entry.title,
      rawContent: entry.rawContent,
      arasContent: entry.arasContent,
      mood: entry.mood,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  });
}
