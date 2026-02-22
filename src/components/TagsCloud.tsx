"use client";

import { useCallback, useEffect, useState } from "react";

type TagsCloudProps = {
  activeTag: string | null;
  onTagSelect: (tag: string | null) => void;
};

export function TagsCloud({ activeTag, onTagSelect }: TagsCloudProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/entries/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(Array.isArray(data?.tags) ? data.tags : []);
      } else {
        setTags([]);
      }
    } catch {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  if (loading || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-body-soft text-xs font-medium uppercase tracking-wider">Tags</span>
      <button
        type="button"
        onClick={() => onTagSelect(null)}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
          activeTag === null
            ? "bg-[var(--accent)] text-[var(--btn-text)]"
            : "bg-[var(--border)]/50 text-[var(--body)] hover:bg-[var(--border)]"
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onTagSelect(activeTag === tag ? null : tag)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            activeTag === tag
              ? "bg-[var(--accent)] text-[var(--btn-text)]"
              : "bg-[var(--border)]/50 text-[var(--body)] hover:bg-[var(--border)]"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
