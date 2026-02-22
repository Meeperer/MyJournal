import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { getOnThisDay } from "@/lib/entries";
import { jsonOk, json400, json401, json404, json429 } from "@/lib/api-response";

/** GET /api/entries/on-this-day?month=0&day=15 - entries on this day in past years (month 0-11) */
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
  const monthStr = searchParams.get("month");
  const dayStr = searchParams.get("day");
  const month = monthStr != null ? parseInt(monthStr, 10) : NaN;
  const day = dayStr != null ? parseInt(dayStr, 10) : NaN;
  if (Number.isNaN(month) || month < 0 || month > 11 || Number.isNaN(day) || day < 1 || day > 31) {
    return json400("Invalid month (0-11) or day (1-31)");
  }

  const items = await getOnThisDay(auth.user.id, month, day);
  return jsonOk({ items });
}
