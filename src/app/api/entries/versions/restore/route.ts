import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { jsonOk, json400, json401, json404, json429 } from "@/lib/api-response";
import { parseRestoreVersionBody } from "@/lib/validation";
import { restoreEntryFromVersion } from "@/lib/entries";

/** POST /api/entries/versions/restore - restore entry content from a version. Body: { versionId: string } */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json400("Invalid JSON");
  }
  const parsed = parseRestoreVersionBody(body);
  if (!parsed.success) {
    return json400(parsed.error);
  }
  const { versionId } = parsed.data;

  const restored = await restoreEntryFromVersion(auth.user.id, versionId);
  if (!restored) {
    return json404("Version or entry not found");
  }

  return jsonOk({
    id: restored.id,
    entryDate: restored.entryDate,
    title: restored.title,
    rawContent: restored.rawContent,
    arasContent: restored.arasContent,
    mood: restored.mood,
    tags: restored.tags,
    createdAt: restored.createdAt,
    updatedAt: restored.updatedAt,
  });
}
