"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDateKey } from "@/lib/date";

type DayCell = {
  date: Date;
  inCurrentMonth: boolean;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthMatrix(year: number, monthIndex: number): DayCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstDayOfWeek = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const cells: DayCell[] = [];

  // Leading days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i -= 1) {
    const date = new Date(year, monthIndex - 1, daysInPrevMonth - i);
    cells.push({ date, inCurrentMonth: false });
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({ date, inCurrentMonth: true });
  }

  // Trailing days from next month to fill full weeks (42 cells max: 6 rows * 7)
  const totalCells = Math.ceil(cells.length / 7) * 7;
  const extra = totalCells - cells.length;
  for (let i = 1; i <= extra; i += 1) {
    const date = new Date(year, monthIndex + 1, i);
    cells.push({ date, inCurrentMonth: false });
  }

  return cells;
}

type DayPreview = { hover_preview?: string[]; summary?: string; mood?: string | null; firstTag?: string | null };

type CalendarProps = {
  selectedDate?: Date | null;
  onDateSelect?: (date: Date, event?: React.MouseEvent<HTMLButtonElement>) => void;
  /** Bump to refetch previews (e.g. after saving an entry) */
  previewsVersion?: number;
  /** When set, only show days that have an entry with this tag */
  activeTag?: string | null;
};

// Stable initial values so server and client render the same (avoids hydration mismatch from new Date()).
const INITIAL_YEAR = 2025;
const INITIAL_MONTH = 0; // January

export function Calendar(props: CalendarProps = {}) {
  const { selectedDate = null, onDateSelect, previewsVersion = 0, activeTag = null } = props;
  const [today, setToday] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(INITIAL_MONTH);
  const [visibleYear, setVisibleYear] = useState(INITIAL_YEAR);
  const [previews, setPreviews] = useState<Record<string, DayPreview>>({});
  const [previewsLoading, setPreviewsLoading] = useState(true);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [focusedDateKey, setFocusedDateKey] = useState<string | null>(null);
  const hoverLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = startOfDay(new Date());
    setToday(now);
    setVisibleMonth(now.getMonth());
    setVisibleYear(now.getFullYear());
  }, []);

  const fetchPreviews = useCallback(async (year: number, month: number) => {
    setPreviewsLoading(true);
    try {
      const tagParam = activeTag ? `&tag=${encodeURIComponent(activeTag)}` : "";
      const res = await fetch(`/api/entries/previews?year=${year}&month=${month}${tagParam}`);
      if (!res.ok) {
        setPreviews({});
        return;
      }
      const data = await res.json();
      const next: Record<string, DayPreview> = {};
      if (Array.isArray(data)) {
        data.forEach((item: { entryDate: string; hover_preview?: string[]; summary?: string; mood?: string | null; firstTag?: string | null }) => {
          const key = formatDateKey(new Date(item.entryDate));
          next[key] = {
            hover_preview: item.hover_preview,
            summary: item.summary,
            mood: item.mood ?? null,
            firstTag: item.firstTag ?? null,
          };
        });
      } else if (data && typeof data === "object") {
        Object.assign(next, data);
      }
      setPreviews(next);
    } catch {
      setPreviews({});
    } finally {
      setPreviewsLoading(false);
    }
  }, [activeTag]);

  useEffect(() => {
    fetchPreviews(visibleYear, visibleMonth);
  }, [visibleYear, visibleMonth, previewsVersion, activeTag, fetchPreviews]);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimeoutRef.current) clearTimeout(hoverLeaveTimeoutRef.current);
    };
  }, []);

  const monthMatrix = useMemo(
    () => getMonthMatrix(visibleYear, visibleMonth),
    [visibleYear, visibleMonth],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(visibleYear, visibleMonth, 1)),
    [visibleMonth, visibleYear],
  );

  const goToPreviousMonth = () => {
    setVisibleMonth((prev) => {
      if (prev === 0) {
        setVisibleYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setVisibleMonth((prev) => {
      if (prev === 11) {
        setVisibleYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const goToToday = () => {
    if (today) {
      setVisibleYear(today.getFullYear());
      setVisibleMonth(today.getMonth());
    }
  };

  const isToday = (date: Date) =>
    today != null && startOfDay(date).getTime() === today.getTime();

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className="card-warm animate-card flex w-full flex-col gap-8 overflow-visible p-6 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            Your journal
          </span>
          <h1 className="text-headline text-3xl sm:text-4xl">
            {monthLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="btn-secondary inline-flex h-10 items-center justify-center px-4 text-sm transition"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="btn-primary inline-flex h-10 items-center justify-center px-5 text-sm"
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="btn-secondary inline-flex h-10 items-center justify-center px-4 text-sm transition"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-1">
            {label}
          </div>
        ))}
      </div>

      {/* Date grid: ~44px min touch targets for accessibility on small viewports. */}
      <div
        className="grid min-h-[240px] grid-cols-7 gap-2 overflow-visible text-sm"
        style={{
          gridAutoRows: "minmax(44px, 1fr)",
          gridTemplateColumns: "repeat(7, minmax(44px, 1fr))",
        }}
        aria-busy={previewsLoading}
        aria-live="polite"
      >
        {monthMatrix.map((cell) => {
          const dayNumber = cell.date.getDate();
          const isCurrentMonth = cell.inCurrentMonth;
          const isCurrentDay = isToday(cell.date);
          const isSelected =
            selectedDate != null && startOfDay(cell.date).getTime() === startOfDay(selectedDate).getTime();
          const dateKey = formatDateKey(cell.date);
          const dayData = previews[dateKey];
          const hasEntry = dayData !== undefined;
          const bulletList = dayData?.hover_preview?.slice(0, 3) ?? [];
          const summaryFallback = dayData?.summary;
          const moodLabel = dayData?.mood?.trim() || null;
          const firstTagLabel = dayData?.firstTag ?? null;
          const isHoveredOrFocused = hoveredDateKey === dateKey || focusedDateKey === dateKey;
          const showTooltip = isHoveredOrFocused && (hasEntry || true); // show for all dates on hover
          const tooltipId = `calendar-tooltip-${dateKey}`;

          return (
            <div
              key={cell.date.toISOString()}
              className="relative flex"
              onMouseEnter={() => {
                if (hoverLeaveTimeoutRef.current) {
                  clearTimeout(hoverLeaveTimeoutRef.current);
                  hoverLeaveTimeoutRef.current = null;
                }
                setHoveredDateKey(dateKey);
              }}
              onMouseLeave={() => {
                hoverLeaveTimeoutRef.current = setTimeout(() => setHoveredDateKey(null), 120);
              }}
            >
              {showTooltip && (
                <div
                  id={tooltipId}
                  className="calendar-tooltip absolute bottom-full left-1/2 z-[100] mb-1.5 w-max max-w-[280px] -translate-x-1/2 px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-[var(--body)]"
                  role="tooltip"
                  aria-live="polite"
                >
                  {hasEntry ? (
                    <>
                      {bulletList.length > 0 ? (
                        <ul className="list-inside list-disc space-y-0.5">
                          {bulletList.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      ) : summaryFallback ? (
                        <p className="line-clamp-3">{summaryFallback}</p>
                      ) : null}
                      {(moodLabel || firstTagLabel) && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[var(--muted)]">
                          {moodLabel && <span aria-label="Mood">{moodLabel}</span>}
                          {moodLabel && firstTagLabel && <span aria-hidden>·</span>}
                          {firstTagLabel && (
                            <span className="rounded bg-[var(--border)]/60 px-1.5 py-0.5 text-[0.65rem] font-medium" aria-label="Tag">
                              {firstTagLabel}
                            </span>
                          )}
                        </p>
                      )}
                      {!bulletList.length && !summaryFallback && !moodLabel && !firstTagLabel && (
                        <p className="text-[var(--muted)]">Journal entry — click to open</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[var(--muted)]">No entry — click to add</p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => onDateSelect?.(cell.date, e)}
                onFocus={() => setFocusedDateKey(dateKey)}
                onBlur={() => setFocusedDateKey(null)}
                aria-describedby={showTooltip ? tooltipId : undefined}
                className={[
                  "flex aspect-square w-full min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius)] border text-sm font-medium transition-all duration-200 touch-manipulation",
                  "calendar-date-cell hover:scale-[1.06] hover:shadow-md hover:z-10",
                  isCurrentMonth
                    ? "border-[var(--border)] bg-[var(--bg-paper)] text-[var(--headline)] hover:bg-[var(--bg-card)] hover:shadow-[var(--shadow-soft)]"
                    : "border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--bg-paper)]",
                  isCurrentDay
                    ? "!border-[var(--accent)] !bg-[var(--accent)] !text-white shadow-[var(--shadow-warm)]"
                    : "",
                  hasEntry && !isCurrentDay && !isSelected
                    ? "calendar-cell-has-entry"
                    : "",
                  isSelected && !isCurrentDay
                    ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] shadow-[0_0_24px_var(--accent-glow)]"
                    : "",
                ].join(" ")}
              >
                <span>{dayNumber}</span>
                {hasEntry && (
                  <span className="flex items-center justify-center gap-0.5" aria-hidden>
                    {moodLabel && (
                      <span className="flex h-4 min-w-[1rem] items-center justify-center rounded bg-[var(--border)]/50 px-0.5 text-[0.6rem] font-medium leading-none" title={moodLabel}>
                        {moodLabel.slice(0, 1)}
                      </span>
                    )}
                    {firstTagLabel && (
                      <span className="max-w-[3ch] truncate rounded bg-[var(--border)]/50 px-0.5 text-[0.55rem] leading-tight" title={firstTagLabel}>
                        {firstTagLabel.slice(0, 4)}
                      </span>
                    )}
                    {!moodLabel && !firstTagLabel && (
                      <span className="h-1 w-1 rounded-full bg-current opacity-90" />
                    )}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

