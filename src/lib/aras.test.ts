import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateArasOutput, processEntryWithGroq } from "./aras";

describe("validateArasOutput", () => {
  const valid = {
    corrected_entry: "Fixed text.",
    aras: {
      activity: "Did things.",
      reflection: "Felt calm.",
      analysis: "Pattern.",
      summary: "Summary here.",
    },
    hover_preview: ["Bullet one", "Bullet two"],
  };

  it("returns object for valid structure", () => {
    expect(validateArasOutput(valid)).toEqual(valid);
  });

  it("returns null for non-object", () => {
    expect(validateArasOutput(null)).toBe(null);
    expect(validateArasOutput("string")).toBe(null);
  });

  it("returns null when corrected_entry is missing or not string", () => {
    expect(validateArasOutput({ ...valid, corrected_entry: 1 })).toBe(null);
    expect(validateArasOutput({ ...valid, corrected_entry: undefined })).toBe(null);
  });

  it("returns null when aras is missing or invalid", () => {
    expect(validateArasOutput({ ...valid, aras: null })).toBe(null);
    expect(validateArasOutput({ ...valid, aras: { activity: "x", reflection: "x", analysis: "x" } })).toBe(null);
  });

  it("returns null when hover_preview is not string array", () => {
    expect(validateArasOutput({ ...valid, hover_preview: "not array" })).toBe(null);
    expect(validateArasOutput({ ...valid, hover_preview: [1, 2] })).toBe(null);
  });

  it("handles empty hover_preview", () => {
    expect(validateArasOutput({ ...valid, hover_preview: [] })).toEqual({
      ...valid,
      hover_preview: [],
    });
  });

  it("returns null for malformed JSON-like object", () => {
    expect(validateArasOutput({ corrected_entry: "x", aras: {}, hover_preview: [] })).toBe(null);
  });
});

describe("processEntryWithGroq", () => {
  const env = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns null when GROQ_API_KEY is unset in non-production", async () => {
    const prev = process.env.NODE_ENV;
    (process.env as NodeJS.ProcessEnv & { NODE_ENV?: string }).NODE_ENV = "development";
    delete process.env.GROQ_API_KEY;
    const result = await processEntryWithGroq("hello", "2025-01-15");
    (process.env as NodeJS.ProcessEnv & { NODE_ENV?: string }).NODE_ENV = prev;
    if (env !== undefined) process.env.GROQ_API_KEY = env;
    expect(result).toBe(null);
  });

  it("calls fetch with correct prompt shape", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          corrected_entry: "Hi.",
          aras: { activity: "a", reflection: "r", analysis: "a", summary: "s" },
          hover_preview: ["x"],
        }) } }],
      }),
    } as Response);

    const result = await processEntryWithGroq("hello", "2025-01-15", "Title");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
        body: expect.stringContaining("2025-01-15"),
      }),
    );
    expect(result).not.toBe(null);
    if (env !== undefined) process.env.GROQ_API_KEY = env;
  });

  it("returns null on malformed AI response", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not valid json" } }],
      }),
    } as Response);

    const result = await processEntryWithGroq("hello", "2025-01-15");
    expect(result).toBe(null);
    if (env !== undefined) process.env.GROQ_API_KEY = env;
  });

  it("returns null when API returns non-ok", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => "error" } as Response);

    const result = await processEntryWithGroq("hello", "2025-01-15");
    expect(result).toBe(null);
    if (env !== undefined) process.env.GROQ_API_KEY = env;
  });
});
