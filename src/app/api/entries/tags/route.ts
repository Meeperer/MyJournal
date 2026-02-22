import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { parseTags } from "@/lib/tags";
import { jsonOk, json401, json404, json429 } from "@/lib/api-response";

/** GET /api/entries/tags - distinct tags from all non-deleted entries for the current user */
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

  const entries = await prisma.journalEntry.findMany({
    where: { userId: auth.user.id, deletedAt: null },
    select: { tags: true },
  });
  const set = new Set<string>();
  for (const e of entries) {
    for (const t of parseTags(e.tags)) {
      set.add(t);
    }
  }
  const tags = Array.from(set).sort();
  return jsonOk({ tags });
}
