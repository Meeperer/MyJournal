/** Format a Date as YYYY-MM-DD for API and keys */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD string to Date at UTC midnight, or null if invalid/missing. */
export function parseEntryDate(dateStr: string | null): Date | null {
  if (dateStr == null || dateStr.length === 0) return null;
  const d = new Date(dateStr + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}
