import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockEntry = {
  id: "entry-1",
  userId: "user-1",
  entryDate: new Date("2025-01-15T00:00:00.000Z"),
  title: "Test",
  rawContent: "Hello",
  mood: null,
  tags: null,
  arasContent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    journalEntry: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    entryVersion: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/entries", () => ({
  findEntryByDate: vi.fn(),
  saveEntryWithVersion: vi.fn(),
  softDeleteEntryByDate: vi.fn(),
}));

vi.mock("@/lib/aras", () => ({
  processEntryWithGroq: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  RATE_LIMIT_ERROR: "Too many requests. Please slow down.",
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { findEntryByDate, saveEntryWithVersion } from "@/lib/entries";

const authUser = { user: { id: "user-1", email: "test@example.com" } };

describe("GET /api/entries", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authUser);
    vi.mocked(findEntryByDate).mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ reason: "unauthorized" });
    const res = await GET(new Request("http://localhost/api/entries"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when date is missing", async () => {
    const res = await GET(new Request("http://localhost/api/entries"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("date");
  });

  it("returns 400 when date is invalid", async () => {
    const res = await GET(new Request("http://localhost/api/entries?date=invalid"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with null when no entry", async () => {
    const res = await GET(new Request("http://localhost/api/entries?date=2025-01-15"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBe(null);
  });

  it("returns 200 with entry when found", async () => {
    vi.mocked(findEntryByDate).mockResolvedValue({
      ...mockEntry,
      entryDate: "2025-01-15",
      createdAt: mockEntry.createdAt.toISOString(),
      updatedAt: mockEntry.updatedAt.toISOString(),
      deletedAt: null,
    } as Awaited<ReturnType<typeof findEntryByDate>>);
    const res = await GET(new Request("http://localhost/api/entries?date=2025-01-15"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id", "entry-1");
  });
});

describe("POST /api/entries", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authUser);
    vi.mocked(saveEntryWithVersion).mockResolvedValue({
      id: mockEntry.id,
      entryDate: mockEntry.entryDate,
      title: mockEntry.title,
      rawContent: mockEntry.rawContent,
      arasContent: mockEntry.arasContent,
      mood: mockEntry.mood,
      tags: mockEntry.tags,
      createdAt: mockEntry.createdAt,
      updatedAt: mockEntry.updatedAt,
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ reason: "unauthorized" });
    const res = await POST(
      new Request("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2025-01-15", rawContent: "Hi" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (missing rawContent)", async () => {
    const res = await POST(
      new Request("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2025-01-15" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for extra fields (strict)", async () => {
    const res = await POST(
      new Request("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2025-01-15",
          rawContent: "Hi",
          extra: "not allowed",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 and saves entry on valid request", async () => {
    const res = await POST(
      new Request("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2025-01-15",
          rawContent: "Today was good.",
          title: "Day",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("rawContent");
    expect(saveEntryWithVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        rawContent: "Today was good.",
        title: "Day",
      }),
    );
  });

  it("calls saveEntryWithVersion with payload so version can be created when updating existing entry", async () => {
    vi.mocked(saveEntryWithVersion).mockClear();
    await POST(
      new Request("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2025-01-15", rawContent: "Updated content" }),
      }),
    );
    expect(saveEntryWithVersion).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(saveEntryWithVersion).mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      userId: authUser.user.id,
      rawContent: "Updated content",
      entryDate: new Date("2025-01-15T00:00:00.000Z"),
    });
  });
});
