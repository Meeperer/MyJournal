import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  RATE_LIMIT_ERROR: "Too many requests.",
}));

vi.mock("@/lib/entries", () => ({
  getEntryVersions: vi.fn(),
  findEntryByDate: vi.fn(),
  findEntryById: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { getEntryVersions, findEntryByDate, findEntryById } from "@/lib/entries";

const authUser = { user: { id: "user-1", email: "test@example.com" } };

describe("GET /api/entries/versions", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authUser);
    vi.mocked(findEntryByDate).mockResolvedValue({
      id: "entry-1",
      userId: "user-1",
      entryDate: new Date("2025-01-15"),
      title: "T",
      rawContent: "C",
      arasContent: null,
      mood: null,
      tags: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof findEntryByDate>>);
    vi.mocked(getEntryVersions).mockResolvedValue([
      { id: "v-1", entryId: "entry-1", rawContent: "r", correctedContent: "c", createdAt: new Date() },
    ] as Awaited<ReturnType<typeof getEntryVersions>>);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ reason: "unauthorized" });
    const res = await GET(new Request("http://localhost/api/entries/versions?date=2025-01-15"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when neither date nor entryId provided", async () => {
    const res = await GET(new Request("http://localhost/api/entries/versions"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("date");
  });

  it("returns 400 when date is invalid", async () => {
    const res = await GET(new Request("http://localhost/api/entries/versions?date=invalid"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when entry not found for date", async () => {
    vi.mocked(findEntryByDate).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/entries/versions?date=2025-01-15"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with versions list when entry found by date", async () => {
    const res = await GET(new Request("http://localhost/api/entries/versions?date=2025-01-15"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(getEntryVersions).toHaveBeenCalledWith("user-1", "entry-1");
  });

  it("returns 200 when entryId provided", async () => {
    vi.mocked(findEntryById).mockResolvedValue({
      id: "entry-2",
      userId: "user-1",
      entryDate: new Date(),
      title: null,
      rawContent: "",
      arasContent: null,
      mood: null,
      tags: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof findEntryById>>);
    const res = await GET(new Request("http://localhost/api/entries/versions?entryId=entry-2"));
    expect(res.status).toBe(200);
    expect(findEntryById).toHaveBeenCalledWith("user-1", "entry-2");
  });
});
