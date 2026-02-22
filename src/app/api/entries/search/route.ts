import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { jsonOk, json400, json401, json404, json429 } from "@/lib/api-response";
import { searchEntries } from "@/lib/search-entries";

/** GET /api/entries/search?q=...&page=1&pageSize=20 */
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const tag = searchParams.get("tag") ?? undefined;
  if (q.length > 200) {
    return json400("Search query must be 200 characters or less");
  }
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
  );

  if (Number.isNaN(page) || Number.isNaN(pageSize)) {
    return json400("Invalid page or pageSize");
  }

  const result = await searchEntries({
    userId: auth.user.id,
    query: q,
    tag: tag || undefined,
    page,
    pageSize,
  });

  return jsonOk(result);
}
