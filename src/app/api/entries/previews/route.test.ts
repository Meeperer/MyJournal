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

describe("GET /api/entries/previews", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authUser);
    vi.mocked(prisma.journalEntry.findMany).mockResolvedValue([]);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ reason: "unauthorized" });
    const res = await GET(new Request("http://localhost/api/entries/previews?year=2025&month=0"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when year or month missing", async () => {
    const res = await GET(new Request("http://localhost/api/entries/previews"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when month is invalid", async () => {
    const res = await GET(new Request("http://localhost/api/entries/previews?year=2025&month=12"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with empty array when no entries", async () => {
    const res = await GET(new Request("http://localhost/api/entries/previews?year=2025&month=0"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns 200 with preview items when entries exist", async () => {
    vi.mocked(prisma.journalEntry.findMany).mockResolvedValue([
      {
        entryDate: new Date("2025-01-15T00:00:00.000Z"),
        arasContent: JSON.stringify({ hover_preview: ["Point one", "Point two"] }),
      },
    ] as Awaited<ReturnType<typeof prisma.journalEntry.findMany>>);
    const res = await GET(new Request("http://localhost/api/entries/previews?year=2025&month=0"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].entryDate).toBe("2025-01-15T00:00:00.000Z");
    expect(data[0].hover_preview).toEqual(["Point one", "Point two"]);
  });
});
