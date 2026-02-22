/**
 * Runs once at server startup. Validates required env (GROQ, NEXTAUTH_SECRET, DATABASE_URL in production).
 */
import { ensureGroqApiKey, validateRequiredEnv } from "@/lib/env";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    ensureGroqApiKey();
    validateRequiredEnv();
  }
}
