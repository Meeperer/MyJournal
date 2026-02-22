import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { json400, json401, json404, json429 } from "@/lib/api-response";
import { parseGetExportQuery } from "@/lib/validation";
import {
  buildExportEntry,
  toJsonExport,
  toMarkdownExport,
  streamJsonExport,
  streamMarkdownExport,
  STREAM_BATCH_SIZE,
} from "@/lib/export-entries";
import type { ExportEntry } from "@/lib/export-entries";

/** GET /api/entries/export?format=json|markdown&scope=single|full&date=YYYY-MM-DD (required for single) */
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
  const parsed = parseGetExportQuery(searchParams);
  if (!parsed.success) {
    return json400(parsed.error);
  }
  const { format, scope, date: dateStr } = parsed.data;

  const filename =
    scope === "single" && dateStr != null
      ? `journal-${dateStr}.${format === "json" ? "json" : "md"}`
      : `journal-export-${new Date().toISOString().slice(0, 10)}.${format === "json" ? "json" : "md"}`;

  const contentType =
    format === "json" ? "application/json" : "text/markdown; charset=utf-8";
  const headers = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };

  const userId = auth.user.id;

  if (scope === "full") {
    async function* streamEntries(): AsyncGenerator<ExportEntry> {
      let cursor: string | undefined;
      while (true) {
        const batch = await prisma.journalEntry.findMany({
          where: { userId, deletedAt: null },
          orderBy: { entryDate: "asc" },
          take: STREAM_BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          select: { id: true, entryDate: true, title: true, rawContent: true, arasContent: true },
        });
        if (batch.length === 0) break;
        for (const e of batch) {
          yield buildExportEntry(
            e.entryDate.toISOString().slice(0, 10),
            e.title,
            e.rawContent,
            e.arasContent
          );
        }
        cursor = batch[batch.length - 1]?.id;
        if (batch.length < STREAM_BATCH_SIZE) break;
      }
    }
    const stream = format === "json" ? streamJsonExport(streamEntries()) : streamMarkdownExport(streamEntries());
    return new Response(stream, { status: 200, headers });
  }

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(scope === "single" && dateStr ? { entryDate: new Date(dateStr + "T00:00:00.000Z") } : {}),
    },
    orderBy: { entryDate: "asc" },
  });

  if (scope === "single" && entries.length === 0) {
    return json404("Entry not found");
  }

  const exportEntries = entries.map((e) =>
    buildExportEntry(
      e.entryDate.toISOString().slice(0, 10),
      e.title,
      e.rawContent,
      e.arasContent
    )
  );

  const body =
    format === "json" ? toJsonExport(exportEntries) : toMarkdownExport(exportEntries);

  return new Response(body, { status: 200, headers });
}
