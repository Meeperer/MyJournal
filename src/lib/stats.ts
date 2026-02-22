/**
 * Streak and period counts from journal entries. Uses distinct entry dates only (no soft-deleted).
 */

import { prisma } from "@/lib/prisma";

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + n);
  return out;
}

export type StreakResult = { current: number; longest: number };

/**
 * Current streak: consecutive days with an entry ending at "today" or the most recent entry date.
 * Longest streak: longest run of consecutive days with an entry in the user's history.
 */
export async function getStreak(userId: string): Promise<StreakResult> {
  const entries = await prisma.journalEntry.findMany({
    where: { userId, deletedAt: null },
    select: { entryDate: true },
  });
  const dateSet = new Set(entries.map((e) => toDateKey(e.entryDate)));
  if (dateSet.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(dateSet).sort();
  const todayKey = toDateKey(new Date());

  // Current streak: from today (or latest date) count backwards while consecutive
  let current = 0;
  const startKey = dateSet.has(todayKey) ? todayKey : sorted[sorted.length - 1];
  if (startKey) {
    let d = new Date(startKey + "T12:00:00.000Z");
    while (dateSet.has(toDateKey(d))) {
      current++;
      d = addDays(d, -1);
    }
  }

  // Longest streak: scan sorted dates for longest consecutive run
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00.000Z");
    const curr = new Date(sorted[i] + "T12:00:00.000Z");
    const diffDays = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  return { current, longest };
}

export type PeriodCountResult = { count: number };

/**
 * Count of distinct days with an entry in the given period.
 * Week: from start of current week (Sunday) through end of today.
 * Month: from start of current month through end of today.
 */
export async function getCounts(
  userId: string,
  period: "week" | "month"
): Promise<PeriodCountResult> {
  const now = new Date();
  let start: Date;
  if (period === "week") {
    const day = now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      entryDate: { gte: start, lte: end },
    },
    select: { entryDate: true },
  });
  const distinctDays = new Set(entries.map((e) => toDateKey(e.entryDate)));
  return { count: distinctDays.size };
}
