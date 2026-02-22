import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  RATE_LIMIT_ERROR: "Too many requests.",
}));

vi.mock("@/lib/entries", () => ({
  restoreEntryFromVersion: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { restoreEntryFromVersion } from "@/lib/entries";

const authUser = { user: { id: "user-1", email: "test@example.com" } };

const mockRestored = {
  id: "entry-1",
  entryDate: new Date("2025-01-15"),
  title: "Title",
  rawContent: "Content",
  arasContent: null,
  mood: null,
  tags: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("POST /api/entries/versions/restore", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authUser);
    vi.mocked(restoreEntryFromVersion).mockResolvedValue(
      mockRestored as Awaited<ReturnType<typeof restoreEntryFromVersion>>,
    );
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ reason: "unauthorized" });
    const res = await POST(
      new Request("http://localhost/api/entries/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: "v-1" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is not JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/entries/versions/restore", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when versionId is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/entries/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 when versionId is empty string", async () => {
    const res = await POST(
      new Request("http://localhost/api/entries/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when version or entry not found", async () => {
    vi.mocked(restoreEntryFromVersion).mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/entries/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: "nonexistent" }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with restored entry on success", async () => {
    const res = await POST(
      new Request("http://localhost/api/entries/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: "v-1" }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("entry-1");
    expect(data.rawContent).toBe("Content");
    expect(restoreEntryFromVersion).toHaveBeenCalledWith("user-1", "v-1");
  });
});
