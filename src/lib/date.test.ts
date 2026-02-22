import { describe, it, expect } from "vitest";
import { formatDateKey, parseEntryDate } from "./date";

describe("formatDateKey", () => {
  it("returns YYYY-MM-DD for valid date", () => {
    expect(formatDateKey(new Date(2025, 0, 1))).toBe("2025-01-01");
    expect(formatDateKey(new Date(2024, 11, 31))).toBe("2024-12-31");
    expect(formatDateKey(new Date(2025, 8, 9))).toBe("2025-09-09");
  });

  it("pads month and day with zero", () => {
    expect(formatDateKey(new Date(2025, 0, 5))).toBe("2025-01-05");
    expect(formatDateKey(new Date(2025, 9, 3))).toBe("2025-10-03");
  });

  it("is consistent across timezones (uses local date parts)", () => {
    const utcMidnight = new Date(Date.UTC(2025, 0, 15, 0, 0, 0, 0));
    const y = utcMidnight.getFullYear();
    const m = utcMidnight.getMonth();
    const d = utcMidnight.getDate();
    expect(formatDateKey(new Date(y, m, d))).toBe("2025-01-15");
  });

  it("handles edge cases", () => {
    expect(formatDateKey(new Date(2000, 0, 1))).toBe("2000-01-01");
    expect(formatDateKey(new Date(1999, 11, 31))).toBe("1999-12-31");
  });

  it("invalid date still returns a string (caller should validate date)", () => {
    const invalid = new Date("not-a-date");
    const result = formatDateKey(invalid);
    expect(typeof result).toBe("string");
  });
});

describe("parseEntryDate", () => {
  it("returns Date for valid YYYY-MM-DD", () => {
    const d = parseEntryDate("2025-01-15");
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toContain("2025-01-15");
  });

  it("returns null for null or empty", () => {
    expect(parseEntryDate(null)).toBeNull();
    expect(parseEntryDate("")).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(parseEntryDate("2025-1-5")).toBeNull();
    expect(parseEntryDate("not-a-date")).toBeNull();
  });
});
