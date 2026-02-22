"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResultItem } from "@/types";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function SearchEntries({
  onSelectDate,
  activeTag = null,
}: {
  onSelectDate?: (date: Date) => void;
  activeTag?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string, p: number) => {
      if (!q.trim() && !activeTag) {
        setResults([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      try {
        const tagParam = activeTag ? `&tag=${encodeURIComponent(activeTag)}` : "";
        const res = await fetch(
          `/api/entries/search?q=${encodeURIComponent(q.trim())}&page=${p}&pageSize=${PAGE_SIZE}${tagParam}`
        );
      if (res.ok) {
        const data = await res.json();
        setResults(data.data ?? []);
        setTotal(data.total ?? 0);
        setPage(p);
      } else {
        setResults([]);
        setTotal(0);
      }
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTag]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setQuery(inputValue);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  useEffect(() => {
    search(query, 1);
  }, [query, activeTag]); // eslint-disable-line react-hooks/exhaustive-deps -- run when query or activeTag changes; page changes handled below

  const goToPage = useCallback(
    (p: number) => {
      if (query.trim()) search(query, p);
    },
    [query, search]
  );

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const hasResults = results.length > 0;

  return (
    <section className="card-warm flex w-full flex-col gap-4 p-4 sm:p-6">
      <h2 className="text-headline text-lg font-semibold">Search entries</h2>
      <input
        type="search"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search by title, content, or overview…"
        className="input-warm min-h-[44px] w-full rounded-[var(--radius)] px-4 py-2.5 text-sm"
        aria-label="Search entries"
      />
      {loading && (
        <p className="text-body-soft text-sm" role="status" aria-live="polite">
          Searching…
        </p>
      )}
      {!loading && query.trim() && !hasResults && (
        <p className="text-body-soft text-sm">No matches.</p>
      )}
      {!loading && hasResults && (
        <>
          <p className="text-body-soft text-sm">
            {total} result{total !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-2">
            {results.map((item) => (
              <li key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-paper)] p-3">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(item.entryDate + "T00:00:00.000Z");
                    if (!Number.isNaN(d.getTime())) onSelectDate?.(d);
                  }}
                  className="min-h-[44px] w-full touch-manipulation text-left text-sm"
                >
                  <span className="font-medium text-[var(--headline)]">
                    {item.entryDate}
                    {item.title ? ` – ${item.title}` : ""}
                  </span>
                  {item.overviewSummary && (
                    <p className="text-body-soft mt-1 line-clamp-2 text-xs">{item.overviewSummary}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="btn-secondary min-h-[44px] min-w-[44px] px-3 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-body-soft text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary min-h-[44px] min-w-[44px] px-3 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
