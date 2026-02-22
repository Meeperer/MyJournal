import { getAuthenticatedUser } from "@/lib/auth";
import { parseEntryDate } from "@/lib/date";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { jsonOk, json400, json401, json404, json429 } from "@/lib/api-response";
import {
  getEntryVersions,
  findEntryByDate,
  findEntryById,
} from "@/lib/entries";

/** GET /api/entries/versions?date=YYYY-MM-DD - list versions for the entry on that date */
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
  const dateStr = searchParams.get("date");
  const entryId = searchParams.get("entryId");

  let targetEntryId: string | null = null;
  if (entryId) {
    const entry = await findEntryById(auth.user.id, entryId);
    if (!entry) return json404("Entry not found");
    targetEntryId = entry.id;
  } else if (dateStr != null && dateStr.length > 0) {
    const date = parseEntryDate(dateStr);
    if (!date) return json400("Invalid date");
    const entry = await findEntryByDate(auth.user.id, date);
    if (!entry) return json404("Entry not found");
    targetEntryId = entry.id;
  } else {
    return json400("Provide date or entryId");
  }

  const versions = await getEntryVersions(auth.user.id, targetEntryId);
  return jsonOk(versions);
}
