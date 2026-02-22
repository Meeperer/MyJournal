-- Add full-text search column for JournalEntry (title, rawContent, arasContent)
-- Generated column so it updates automatically on insert/update.
ALTER TABLE "JournalEntry"
ADD COLUMN "search_vector" tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("rawContent", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("arasContent", '')), 'B')
) STORED;

CREATE INDEX "JournalEntry_search_vector_idx"
ON "JournalEntry" USING GIN ("search_vector");
