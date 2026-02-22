import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  RATE_LIMIT_ERROR: "Too many requests.",
}));

vi.mock("@/lib/search-entries", () => ({
  searchEntries: vi.fn(() =>
    Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }),
  ),
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { searchEntries } from "@/lib/search-entries";

const authUser = { user: { id: "user-1", email: "test@example.com" } };

describe("GET /api/entries/search", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authUser);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ reason: "unauthorized" });
    const res = await GET(new Request("http://localhost/api/entries/search?q=test"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when q is longer than 200 chars", async () => {
    const res = await GET(new Request("http://localhost/api/entries/search?q=" + "a".repeat(201)));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("200");
  });

  it("returns 400 when page is invalid", async () => {
    const res = await GET(new Request("http://localhost/api/entries/search?q=test&page=abc"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with searchEntries result", async () => {
    vi.mocked(searchEntries).mockResolvedValue({
      data: [
        {
          id: "e-1",
          entryDate: "2025-01-15",
          title: "Test",
          rawContent: "Content",
          overviewSummary: undefined,
          highlight: undefined,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    const res = await GET(new Request("http://localhost/api/entries/search?q=test"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(searchEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        query: "test",
        page: 1,
        pageSize: 20,
      }),
    );
  });
});
