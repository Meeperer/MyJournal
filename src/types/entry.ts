/**
 * Centralized entry types. Use for API, services, and UI.
 */

export type JournalEntryRecord = {
  id: string;
  userId: string;
  entryDate: string; // ISO date
  title: string | null;
  rawContent: string;
  arasContent: string | null;
  mood: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** For API responses: omit internal fields if needed */
export type JournalEntryPublic = Omit<JournalEntryRecord, "userId">;

export type EntryVersionRecord = {
  id: string;
  entryId: string;
  rawContent: string;
  correctedContent: string;
  createdAt: string;
};

export type EntryVersionPublic = EntryVersionRecord;
