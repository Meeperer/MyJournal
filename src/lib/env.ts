/**
 * Server-side env validation. GROQ_API_KEY must never be exposed to the client.
 * Fail fast in production if missing; warn in development.
 */

const isProd = process.env.NODE_ENV === "production";

export function validateGroqApiKey(): void {
  const key = process.env.GROQ_API_KEY;
  if (key && key.length > 0) return;
  if (isProd) {
    throw new Error("GROQ_API_KEY is required in production. Set the environment variable and restart.");
  }
  console.warn("[env] GROQ_API_KEY is not set. ARAS processing will be skipped.");
}

/** In production, require NEXTAUTH_SECRET and DATABASE_URL. In dev, warn if NEXTAUTH_SECRET missing. */
export function validateRequiredEnv(): void {
  if (!isProd) {
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length === 0) {
      console.warn("[env] NEXTAUTH_SECRET is not set. Sessions may be insecure in development.");
    }
    return;
  }
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.trim().length === 0) {
    throw new Error("NEXTAUTH_SECRET is required in production. Set the environment variable and restart.");
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim().length === 0) {
    throw new Error("DATABASE_URL is required in production. Set the environment variable and restart.");
  }
}

/** Call once at server startup (e.g. from instrumentation or first API use). */
let validated = false;
export function ensureGroqApiKey(): void {
  if (validated) return;
  validateGroqApiKey();
  validated = true;
}
