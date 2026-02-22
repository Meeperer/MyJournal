import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstTag, tagFilterForPrisma } from "@/lib/tags";
import { parseGetPreviewsQuery } from "@/lib/validation";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { jsonOk, json400, json401, json404, json429 } from "@/lib/api-response";

/** GET /api/entries/previews?year=2025&month=1 - hover previews for calendar (month 0–11) */
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
  const parsed = parseGetPreviewsQuery(searchParams);
  if (!parsed.success) {
    return json400(parsed.error);
  }

  const { year: y, month: m, tag: tagParam } = parsed.data;
  const tagWhere = tagFilterForPrisma(tagParam ?? null);

  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId: auth.user.id,
      entryDate: { gte: start, lte: end },
      deletedAt: null,
      ...(tagWhere ?? {}),
    },
    select: { entryDate: true, arasContent: true, mood: true, tags: true },
  });

  type DayPreview = { hover_preview?: string[]; summary?: string; mood?: string | null; firstTag?: string | null };
  type PreviewItem = { entryDate: string; hover_preview?: string[]; summary?: string; mood?: string | null; firstTag?: string | null };
  const items: PreviewItem[] = [];
  for (const e of entries) {
    const day: DayPreview = {};
    if (e.arasContent) {
      try {
        const aras = JSON.parse(e.arasContent) as {
          hover_preview?: string[];
          aras?: { summary?: string };
        };
        if (Array.isArray(aras.hover_preview)) day.hover_preview = aras.hover_preview;
        if (typeof aras.aras?.summary === "string" && aras.aras.summary.trim())
          day.summary = aras.aras.summary.trim();
      } catch {
        // skip invalid JSON
      }
    }
    day.mood = e.mood ?? null;
    day.firstTag = firstTag(e.tags);
    items.push({
      entryDate: e.entryDate.toISOString(),
      ...day,
    });
  }

  return jsonOk(items);
}
