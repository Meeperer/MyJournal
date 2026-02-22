import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { jsonOk, json401, json404, json429 } from "@/lib/api-response";

/** GET /api/prompts/daily - prompt of the day (rotated by day of year). Auth required. */
export async function GET() {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  const prompts = await prisma.prompt.findMany({
    orderBy: { createdAt: "asc" },
    select: { text: true },
  });
  if (prompts.length === 0) {
    return jsonOk({ text: null });
  }
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000)
  );
  const index = dayOfYear % prompts.length;
  const prompt = prompts[index];
  return jsonOk({ text: prompt?.text ?? null });
}
