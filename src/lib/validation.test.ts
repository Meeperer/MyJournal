import { describe, it, expect } from "vitest";
import {
  parsePostEntryBody,
  parseRegisterBody,
  parseGetExportQuery,
  parseRestoreVersionBody,
  sanitizeRawContent,
} from "./validation";

describe("sanitizeRawContent", () => {
  it("trims whitespace", () => {
    expect(sanitizeRawContent("  hello  ")).toBe("hello");
  });

  it("removes script tags", () => {
    expect(sanitizeRawContent("Hi <script>alert(1)</script> there")).toBe("Hi  there");
  });

  it("strips HTML tags", () => {
    expect(sanitizeRawContent("<p>text</p>")).toBe("text");
  });

  it("normalizes line breaks to \\n", () => {
    expect(sanitizeRawContent("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("enforces max 5000 characters", () => {
    const long = "a".repeat(6000);
    expect(sanitizeRawContent(long).length).toBe(5000);
  });

  it("returns empty string for whitespace-only", () => {
    expect(sanitizeRawContent("   \n\t  ")).toBe("");
  });
});

describe("parsePostEntryBody / postEntryBodySchema", () => {
  it("accepts valid body", () => {
    const body = {
      date: "2025-01-15",
      rawContent: "Today I wrote tests.",
      title: "Day one",
      mood: "Calm",
      tags: ["work", "gratitude"],
    };
    const result = parsePostEntryBody(body);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBe("2025-01-15");
      expect(result.data.rawContent).toBe("Today I wrote tests.");
      expect(result.data.title).toBe("Day one");
      expect(result.data.tags).toEqual(["work", "gratitude"]);
    }
  });

  it("rejects invalid date", () => {
    const result = parsePostEntryBody({
      date: "2025-1-5",
      rawContent: "x",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(400);
  });

  it("rejects missing rawContent", () => {
    const result = parsePostEntryBody({
      date: "2025-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rawContent over 5000 chars", () => {
    const result = parsePostEntryBody({
      date: "2025-01-15",
      rawContent: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown extra fields (strict)", () => {
    const result = parsePostEntryBody({
      date: "2025-01-15",
      rawContent: "hello",
      extraField: "not allowed",
    });
    expect(result.success).toBe(false);
  });

  it("accepts tags as comma-separated string", () => {
    const result = parsePostEntryBody({
      date: "2025-01-15",
      rawContent: "hi",
      tags: "a, b, c",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tags).toEqual(["a", "b", "c"]);
  });
});

describe("parseRegisterBody / registerBodySchema", () => {
  it("accepts valid email and password", () => {
    const result = parseRegisterBody({ email: "user@example.com", password: "password123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.password).toBe("password123");
    }
  });

  it("rejects invalid email", () => {
    const result = parseRegisterBody({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(400);
  });

  it("rejects short password", () => {
    const result = parseRegisterBody({ email: "a@b.co", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects extra fields (strict)", () => {
    const result = parseRegisterBody({
      email: "a@b.co",
      password: "password123",
      extra: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("parseGetExportQuery", () => {
  const params = (obj: Record<string, string>) => ({
    get: (k: string) => obj[k] ?? null,
  });

  it("accepts valid format, scope, date for single", () => {
    const result = parseGetExportQuery(params({ format: "json", scope: "single", date: "2025-01-15" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe("json");
      expect(result.data.scope).toBe("single");
      expect(result.data.date).toBe("2025-01-15");
    }
  });

  it("rejects single scope without date", () => {
    const result = parseGetExportQuery(params({ format: "json", scope: "single" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("date");
  });

  it("rejects invalid format", () => {
    const result = parseGetExportQuery(params({ format: "xml", scope: "full" }));
    expect(result.success).toBe(false);
  });
});

describe("parseRestoreVersionBody", () => {
  it("accepts valid versionId", () => {
    const result = parseRestoreVersionBody({ versionId: "v-123" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.versionId).toBe("v-123");
  });

  it("rejects missing versionId", () => {
    const result = parseRestoreVersionBody({});
    expect(result.success).toBe(false);
  });

  it("rejects empty versionId", () => {
    const result = parseRestoreVersionBody({ versionId: "" });
    expect(result.success).toBe(false);
  });
});
