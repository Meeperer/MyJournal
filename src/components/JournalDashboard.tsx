"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar } from "./Calendar";
import { JournalEntryPanel } from "./JournalEntryPanel";
import { OnThisDayModal } from "./OnThisDayModal";
import { SearchEntries } from "./SearchEntries";
import { TagsCloud } from "./TagsCloud";
import { TemplatesList } from "./TemplatesList";
import { useToast } from "./Toast";

type OriginRect = { left: number; top: number; width: number; height: number };

type StatsData = {
  streak: { current: number; longest: number };
  thisWeek: number;
  thisMonth: number;
};

export function JournalDashboard() {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const [previewsVersion, setPreviewsVersion] = useState(0);
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [onThisDayOpen, setOnThisDayOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateBodyToApply, setTemplateBodyToApply] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/entries/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats(null);
      }
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, previewsVersion]);

  const handleDateSelect = (date: Date, event?: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event?.currentTarget?.getBoundingClientRect();
    if (rect) setOriginRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    else setOriginRect(null);
    setSelectedDate(date);
  };

  useEffect(() => {
    if (selectedDate == null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !overviewModalOpen) setSelectedDate(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDate, overviewModalOpen]);

  useEffect(() => {
    if (selectedDate == null) return;
    const duration = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 650;
    const t = setTimeout(() => {
      document.getElementById("entry-content")?.focus({ preventScroll: true });
    }, duration);
    return () => clearTimeout(t);
  }, [selectedDate]);

  const paperOriginX = originRect ? `${originRect.left + originRect.width / 2}px` : "50%";
  const paperOriginY = originRect ? `${originRect.top + originRect.height / 2}px` : "50%";

  return (
    <div className="flex w-full flex-col gap-8">
      <SearchEntries
        activeTag={activeTag}
        onSelectDate={(date) => handleDateSelect(date)}
      />
      <TagsCloud activeTag={activeTag} onTagSelect={setActiveTag} />
      {!statsLoading && stats && (
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
          <p className="text-headline-2 text-sm font-semibold">
            <span className="text-[var(--muted)] font-normal">Streak: </span>
            {stats.streak.current} day{stats.streak.current !== 1 ? "s" : ""}
          </p>
          <p className="text-body-soft text-sm">
            You wrote <strong className="text-[var(--headline-2)]">{stats.thisWeek}</strong> day{stats.thisWeek !== 1 ? "s" : ""} this week
          </p>
          <p className="text-body-soft text-sm">
            <strong className="text-[var(--headline-2)]">{stats.thisMonth}</strong> day{stats.thisMonth !== 1 ? "s" : ""} this month
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setOnThisDayOpen(true)}
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          On this day
        </button>
        <button
          type="button"
          onClick={() => setTemplatesOpen(true)}
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          Templates
        </button>
      </div>
      <Calendar
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        previewsVersion={previewsVersion}
        activeTag={activeTag}
      />
      <OnThisDayModal
        open={onThisDayOpen}
        onClose={() => setOnThisDayOpen(false)}
        onSelectDate={(date) => {
          setOnThisDayOpen(false);
          handleDateSelect(date);
        }}
      />
      <TemplatesList
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onUseTemplate={(body) => {
          setTemplateBodyToApply(body);
          setSelectedDate(new Date());
          setTemplatesOpen(false);
        }}
      />
      {selectedDate != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-entry-title"
        >
          <button
            type="button"
            className="animate-paper-overlay absolute inset-0 backdrop-blur-[6px] min-h-[44px] min-w-[44px] touch-manipulation"
            style={{ backgroundColor: "var(--modal-overlay)" }}
            onClick={() => setSelectedDate(null)}
            aria-label="Close modal"
          />
          {isMobile ? (
            <div className="flex w-full max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-warm)] pb-[env(safe-area-inset-bottom)] slide-in-from-bottom">
              <div className="flex shrink-0 justify-center py-2" aria-hidden>
                <span className="h-1 w-8 rounded-full bg-[var(--border)]" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <JournalEntryPanel
                  selectedDate={selectedDate}
                  onClose={() => setSelectedDate(null)}
                  templateBodyToApply={templateBodyToApply}
                  onClearTemplateToApply={() => setTemplateBodyToApply(null)}
                  onOpenTemplates={() => setTemplatesOpen(true)}
                  onEntrySaved={() => {
                    setPreviewsVersion((v) => v + 1);
                    showToast("Entry saved successfully.");
                  }}
                  onEntryDeleted={() => {
                    setPreviewsVersion((v) => v + 1);
                    showToast("Entry deleted.");
                  }}
                  onSaveError={(message) => showToast(message)}
                  onOverviewModalOpenChange={setOverviewModalOpen}
                />
              </div>
            </div>
          ) : (
            <div
              className="fixed inset-0 pointer-events-none flex items-center justify-center p-4"
              style={{ perspective: "1200px" }}
              aria-hidden
            >
              <div
                className={`animate-paper-unfold paper-modal-surface pointer-events-auto flex w-full flex-col overflow-hidden h-[78vh] min-h-[420px] max-w-4xl rounded-[var(--radius-lg)] transition-opacity duration-200 ${overviewModalOpen ? "journal-modal-dimmed" : ""}`}
                style={
                  {
                    "--paper-origin-x": paperOriginX,
                    "--paper-origin-y": paperOriginY,
                  } as React.CSSProperties
                }
              >
                <JournalEntryPanel
                  selectedDate={selectedDate}
                  onClose={() => setSelectedDate(null)}
                  templateBodyToApply={templateBodyToApply}
                  onClearTemplateToApply={() => setTemplateBodyToApply(null)}
                  onOpenTemplates={() => setTemplatesOpen(true)}
                  onEntrySaved={() => {
                    setPreviewsVersion((v) => v + 1);
                    showToast("Entry saved successfully.");
                  }}
                  onEntryDeleted={() => {
                    setPreviewsVersion((v) => v + 1);
                    showToast("Entry deleted.");
                  }}
                  onSaveError={(message) => showToast(message)}
                  onOverviewModalOpenChange={setOverviewModalOpen}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
