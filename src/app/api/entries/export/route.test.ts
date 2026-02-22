import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    journalEntry: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  RATE_LIMIT_ERROR: "Too many requests.",
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const authUser = { user: { id: "user-1", email: "test@example.com" } };

const mockEntry = (date: string) => ({
  id: "e-1",
  userId: "user-1",
  entryDate: new Date(date + "T00:00:00.000Z"),
  title: "Title",
  rawContent: "Content",
  arasContent: null,
  mood: null,
  tags: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("GET /api/entries/export", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authUser);
    vi.mocked(prisma.journalEntry.findMany).mockResolvedValue([mockEntry("2025-01-15")]);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ reason: "unauthorized" });
    const res = await GET(new Request("http://localhost/api/entries/export?format=json&scope=single&date=2025-01-15"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when format is invalid", async () => {
    const res = await GET(new Request("http://localhost/api/entries/export?format=xml&scope=single&date=2025-01-15"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 when scope is invalid", async () => {
    const res = await GET(new Request("http://localhost/api/entries/export?format=json&scope=all&date=2025-01-15"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when scope is single but date missing", async () => {
    const res = await GET(new Request("http://localhost/api/entries/export?format=json&scope=single"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("date");
  });

  it("returns 404 when single scope and no entry for date", async () => {
    vi.mocked(prisma.journalEntry.findMany).mockResolvedValue([]);
    const res = await GET(new Request("http://localhost/api/entries/export?format=json&scope=single&date=2025-01-15"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found");
  });

  it("returns 200 with streamed body when full scope has many entries", async () => {
    const batchSize = 100;
    const many = Array.from({ length: batchSize }, (_, i) =>
      mockEntry(`2025-01-${String((i % 28) + 1).padStart(2, "0")}`),
    );
    vi.mocked(prisma.journalEntry.findMany)
      .mockResolvedValueOnce(many as Awaited<ReturnType<typeof prisma.journalEntry.findMany>>)
      .mockResolvedValueOnce([]);
    const res = await GET(new Request("http://localhost/api/entries/export?format=json&scope=full"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("journal-export");
    const text = await res.text();
    expect(text).toBeTruthy();
  });

  it("returns 200 with Content-Disposition for single json export", async () => {
    const res = await GET(new Request("http://localhost/api/entries/export?format=json&scope=single&date=2025-01-15"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("journal-2025-01-15.json");
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const text = await res.text();
    expect(text).toBeTruthy();
  });

  it("returns 200 with markdown and single scope", async () => {
    const res = await GET(new Request("http://localhost/api/entries/export?format=markdown&scope=single&date=2025-01-15"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("journal-2025-01-15.md");
    expect(res.headers.get("Content-Type")).toContain("text/markdown");
  });

  it("returns 200 for full scope", async () => {
    const res = await GET(new Request("http://localhost/api/entries/export?format=json&scope=full"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("journal-export");
  });
});
