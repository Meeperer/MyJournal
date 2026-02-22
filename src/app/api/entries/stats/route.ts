import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { getStreak, getCounts } from "@/lib/stats";
import { jsonOk, json401, json404, json429 } from "@/lib/api-response";

/** GET /api/entries/stats - streak and period counts for the current user */
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

  const [streak, thisWeek, thisMonth] = await Promise.all([
    getStreak(auth.user.id),
    getCounts(auth.user.id, "week"),
    getCounts(auth.user.id, "month"),
  ]);

  return jsonOk({
    streak: { current: streak.current, longest: streak.longest },
    thisWeek: thisWeek.count,
    thisMonth: thisMonth.count,
  });
}
