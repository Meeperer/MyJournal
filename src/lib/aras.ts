/**
 * ARAS Journal Processor — system prompt and Groq integration.
 * Processes raw journal entries into corrected text, ARAS structure, and hover preview.
 * Never expose GROQ_API_KEY to client. Validate AI output structure before use.
 */

const GROQ_TIMEOUT_MS = 10_000;

export const ARAS_SYSTEM_PROMPT = `🎯 Role

You are an AI writing assistant integrated into a journaling web application.

Your job is to process a user's raw journal entry and:

1. Lightly improve grammar (without changing tone or meaning).
2. Rewrite the entry using the ARAS Method:
   - Activity
   - Reflection
   - Analysis
   - Summary
3. Generate a short bullet-point daily overview for calendar hover preview.

⚠️ Strict Rules (Very Important)

DO NOT invent emotions.
DO NOT assume feelings not explicitly stated.
DO NOT add new events.
DO NOT exaggerate.
DO NOT change the user's personality or writing style.
Only fix small grammatical issues (tense, clarity, punctuation).
Preserve the original emotional tone.
If the user did not mention feelings, do not fabricate them.
If something is unclear, keep it neutral instead of guessing.
No motivational advice.
No extra commentary outside requested structure.
Stay grounded only in the provided journal text.

📤 Required Output Format (STRICT JSON)

Return output in this exact JSON structure only, no other text:

{
  "corrected_entry": "Lightly grammar-corrected version of the original text without altering tone.",
  "aras": {
    "activity": "What the user did. Only based on facts stated.",
    "reflection": "What the user expressed feeling or thinking. Only if explicitly mentioned.",
    "analysis": "Gentle interpretation of patterns or meaning, but strictly grounded in text.",
    "summary": "2-3 sentence concise recap of the day."
  },
  "hover_preview": [
    "Short bullet point 1 (max 10 words)",
    "Short bullet point 2 (max 10 words)",
    "Short bullet point 3 (optional, max 10 words)"
  ]
}

🧾 Processing Instructions

1️⃣ Grammar Correction: Fix punctuation and obvious spelling; improve sentence flow slightly. Do NOT rewrite stylistically. Keep natural voice intact.

2️⃣ ARAS Method:
- Activity: What happened, what the user did. Neutral, objective tone.
- Reflection: Only feelings/thoughts explicitly written. If none, keep neutral.
- Analysis: Mild patterns grounded in text. No diagnosing or coaching.
- Summary: 2–3 concise sentences. Accurate recap only.

3️⃣ Hover Preview: Bullet points, max 10 words each. No emotions unless stated. Quick factual overview.

🛑 If information is not clearly present: do not infer, assume, or expand. When uncertain, stay minimal.`;

export type ArasOutput = {
  corrected_entry: string;
  aras: {
    activity: string;
    reflection: string;
    analysis: string;
    summary: string;
  };
  hover_preview: string[];
};

function buildUserMessage(date: string, title: string | undefined, journal_entry: string): string {
  const parts = [`date: ${date}`];
  if (title) parts.push(`title: ${title}`);
  parts.push(`journal_entry:\n${journal_entry}`);
  return parts.join("\n\n");
}

/** Validate AI response structure. Never trust AI output blindly. */
export function validateArasOutput(value: unknown): ArasOutput | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.corrected_entry !== "string") return null;
  const aras = o.aras;
  if (!aras || typeof aras !== "object") return null;
  const a = aras as Record<string, unknown>;
  if (
    typeof a.activity !== "string" ||
    typeof a.reflection !== "string" ||
    typeof a.analysis !== "string" ||
    typeof a.summary !== "string"
  ) {
    return null;
  }
  const hover = o.hover_preview;
  if (!Array.isArray(hover) || !hover.every((x) => typeof x === "string")) return null;
  return {
    corrected_entry: o.corrected_entry,
    aras: {
      activity: a.activity,
      reflection: a.reflection,
      analysis: a.analysis,
      summary: a.summary,
    },
    hover_preview: hover,
  };
}

export async function processEntryWithGroq(
  journalEntry: string,
  date: string,
  title?: string | null,
): Promise<ArasOutput | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("GROQ_API_KEY is required in production.");
    }
    console.warn("GROQ_API_KEY not set; skipping ARAS processing");
    return null;
  }

  const trimmed = journalEntry?.trim();
  if (!trimmed) return null;

  const userMessage = buildUserMessage(date, title ?? undefined, trimmed);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: ARAS_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq ARAS request failed:", response.status, errText.slice(0, 200));
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    let jsonStr = content;
    const codeMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const extracted = codeMatch?.[1];
    if (extracted) jsonStr = extracted.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Groq ARAS: invalid JSON in response");
      return null;
    }

    return validateArasOutput(parsed);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        console.error("Groq ARAS: request timeout after", GROQ_TIMEOUT_MS / 1000, "s");
      } else {
        console.error("Groq ARAS error:", err.message);
      }
    }
    return null;
  }
}
