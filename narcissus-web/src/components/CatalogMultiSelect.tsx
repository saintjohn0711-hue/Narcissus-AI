"use client";

import { useMemo, useState } from "react";

export type CatalogGroup = { cat: string; tags: string[] };

type CatalogMultiSelectProps = {
  groups: CatalogGroup[];
  selected: string[];
  onToggle: (tag: string) => void;
  searchPlaceholder?: string;
  emptySelectedHint?: string;
};

/**
 * Searchable grouped catalog for acts / kinks.
 * Selected items as a scannable list; catalog as quiet check rows (not pill clusters).
 */
export function CatalogMultiSelect({
  groups,
  selected,
  onToggle,
  searchPlaceholder = "Search…",
  emptySelectedHint = "Nothing selected yet — pick from the catalog below.",
}: CatalogMultiSelectProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    return groups
      .map((g) => ({
        cat: g.cat,
        tags: q
          ? g.tags.filter(
              (t) =>
                t.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q),
            )
          : g.tags,
      }))
      .filter((g) => g.tags.length > 0);
  }, [groups, q]);

  return (
    <div className="space-y-4">
      <div className="border border-[var(--line)] bg-[#0f0d0b]/55 px-3 py-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          Selected · {selected.length}
        </p>
        {selected.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{emptySelectedHint}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {selected.map((tag) => (
              <li
                key={tag}
                className="flex items-center justify-between gap-3 border-b border-[var(--line)]/70 py-1.5 last:border-0"
              >
                <span className="text-sm text-[#f7f1e8]/92%">{tag}</span>
                <button
                  type="button"
                  onClick={() => onToggle(tag)}
                  className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[var(--danger)] underline-offset-2 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="grid gap-1.5 text-xs text-[#c4b7a8]">
        <span className="uppercase tracking-[0.18em] text-[var(--muted)]">
          Catalog
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm"
        />
      </label>

      <div className="max-h-64 space-y-4 overflow-y-auto pr-1 sm:max-h-72">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No matches.</p>
        ) : (
          filtered.map((g) => (
            <div key={g.cat}>
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                {g.cat}
              </p>
              <ul className="divide-y divide-[var(--line)] border border-[var(--line)]">
                {g.tags.map((tag) => {
                  const on = selectedSet.has(tag);
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        onClick={() => onToggle(tag)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                          on
                            ? "bg-[var(--accent)]/12 text-[var(--accent-strong)]"
                            : "text-[#c4b7a8] hover:bg-[#1a1612] hover:text-[var(--ink)]"
                        }`}
                        aria-pressed={on}
                      >
                        <span>{tag}</span>
                        <span
                          className={`text-[10px] uppercase tracking-[0.16em] ${
                            on ? "text-[var(--accent-strong)]" : "text-[var(--muted)]"
                          }`}
                        >
                          {on ? "On" : "Add"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
