import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { json400, json401, json404, json429 } from "@/lib/api-response";

const MAX_DAYS_RANGE = 31;

/** GET /api/entries/export/pdf?date=YYYY-MM-DD (single) or ?from=YYYY-MM-DD&to=YYYY-MM-DD (range, max 31 days) */
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
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  let start: Date;
  let end: Date;
  let filename: string;

  if (dateStr && !fromStr && !toStr) {
    const d = new Date(dateStr + "T00:00:00.000Z");
    if (Number.isNaN(d.getTime())) return json400("Invalid date");
    start = d;
    end = new Date(d);
    end.setUTCHours(23, 59, 59, 999);
    filename = `journal-${dateStr}.pdf`;
  } else if (fromStr && toStr) {
    const from = new Date(fromStr + "T00:00:00.000Z");
    const to = new Date(toStr + "T00:00:00.000Z");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return json400("Invalid from or to");
    if (from > to) return json400("from must be before or equal to to");
    const days = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (days > MAX_DAYS_RANGE) return json400(`Date range must not exceed ${MAX_DAYS_RANGE} days`);
    start = from;
    end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);
    filename = `journal-${fromStr}-to-${toStr}.pdf`;
  } else {
    return json400("Provide date (single) or from and to (range)");
  }

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId: auth.user.id,
      deletedAt: null,
      entryDate: { gte: start, lte: end },
    },
    orderBy: { entryDate: "asc" },
    select: { entryDate: true, title: true, rawContent: true, arasContent: true },
  });

  if (entries.length === 0) return json404("No entries in range");

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const lineHeight = 6;
  let y = margin;

  function addNewPageIfNeeded(need: number) {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function addText(text: string, fontSize = 11) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, pageW - 2 * margin);
    for (const line of lines) {
      addNewPageIfNeeded(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  for (const e of entries) {
    addNewPageIfNeeded(30);
    const dateLabel = e.entryDate.toISOString().slice(0, 10);
    doc.setFont("helvetica", "bold");
    addText(`${dateLabel} – ${e.title ?? "Untitled"}`, 14);
    doc.setFont("helvetica", "normal");
    y += 4;
    addText(e.rawContent ?? "");
    if (e.arasContent) {
      try {
        const aras = JSON.parse(e.arasContent) as { aras?: { summary?: string } };
        if (aras.aras?.summary) {
          y += 4;
          doc.setFont("helvetica", "italic");
          addText(`Summary: ${aras.aras.summary}`, 9);
          doc.setFont("helvetica", "normal");
        }
      } catch {
        // ignore
      }
    }
    y += 12;
  }

  const blob = doc.output("arraybuffer");
  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
