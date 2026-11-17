"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";

export type CatalogGroup = { cat: string; tags: string[] };

type CatalogMultiSelectProps = {
  groups: CatalogGroup[];
  selected: string[];
  onToggle: (tag: string) => void;
  searchPlaceholder?: string;
  emptySelectedHint?: string;
  /** Allow free-text entries outside the catalog */
  allowCustom?: boolean;
  customPlaceholder?: string;
  /** Tighter chrome for Muse card inline acts panel */
  compact?: boolean;
  /** Accessible name for the filter field */
  label?: string;
  removeLabel?: string;
};

/**
 * Labeled pick boxes for large acts & kinks catalogs.
 * Primary interaction matches Muse voice / Dynamics / Stories chips:
 * tap a box with the label inside to add or remove. Optional type-to-filter
 * narrows long lists; custom entries stay available when allowCustom.
 */
export function CatalogMultiSelect({
  groups,
  selected,
  onToggle,
  searchPlaceholder = "Filter boxes…",
  emptySelectedHint = "Nothing selected yet — tap a box below.",
  allowCustom = false,
  customPlaceholder = "Add custom…",
  compact = false,
  label = "Filter catalog",
  removeLabel = "Remove",
}: CatalogMultiSelectProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const q = query.trim().toLowerCase();

  const catalogTags = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const tag of g.tags) set.add(tag);
    }
    return set;
  }, [groups]);

  /** Selected tags that aren't in the catalog (customs + legacy) */
  const customSelected = useMemo(
    () => selected.filter((t) => !catalogTags.has(t)),
    [selected, catalogTags],
  );

  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        cat: g.cat,
        tags: g.tags.filter(
          (tag) =>
            tag.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.tags.length > 0);
  }, [groups, q]);

  const visibleCustomSelected = useMemo(() => {
    if (!q) return customSelected;
    return customSelected.filter((t) => t.toLowerCase().includes(q));
  }, [customSelected, q]);

  const exactMatch = useMemo(() => {
    if (!query.trim()) return false;
    const needle = query.trim().toLowerCase();
    return (
      groups.some((g) => g.tags.some((t) => t.toLowerCase() === needle)) ||
      selected.some((t) => t.toLowerCase() === needle)
    );
  }, [groups, query, selected]);

  const canAddCustom =
    allowCustom &&
    Boolean(query.trim()) &&
    !exactMatch &&
    !selectedSet.has(query.trim().replace(/\s+/g, " ").slice(0, 80));

  const boxCount =
    filteredGroups.reduce((n, g) => n + g.tags.length, 0) +
    visibleCustomSelected.length;

  function addCustom() {
    if (!canAddCustom) return;
    const clean = query.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!clean) return;
    onToggle(clean);
    setQuery("");
  }

  function onFilterKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canAddCustom) {
        addCustom();
        return;
      }
      const first = filteredGroups[0]?.tags[0];
      if (first && !selectedSet.has(first)) onToggle(first);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
    }
  }

  return (
    <div
      className={`catalog-picks ${compact ? "catalog-picks--compact" : ""}`}
      data-testid="catalog-multi-select"
    >
      <div className="catalog-picks-summary">
        <p className="catalog-picks-summary-label">
          Selected · {selected.length}
        </p>
        {selected.length === 0 ? (
          <p className="catalog-picks-empty">{emptySelectedHint}</p>
        ) : (
          <div
            className="catalog-picks-selected-row"
            data-testid="catalog-selected-chips"
          >
            {selected.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(tag)}
                className="catalog-pick-box catalog-pick-box--on catalog-pick-box--selected"
                aria-pressed="true"
                title={`${removeLabel} ${tag}`}
                data-testid="catalog-remove"
              >
                <span className="catalog-pick-box-label">{tag}</span>
                <span className="catalog-pick-box-x" aria-hidden>
                  ×
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="catalog-picks-filter">
        <label className="catalog-picks-filter-label" htmlFor={inputId}>
          {label}
        </label>
        <div className="catalog-picks-filter-control">
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onFilterKeyDown}
            placeholder={
              allowCustom
                ? `${searchPlaceholder} · Enter adds custom`
                : searchPlaceholder
            }
            className="catalog-picks-filter-input"
            data-testid="catalog-select-input"
            autoComplete="off"
          />
          {canAddCustom && (
            <button
              type="button"
              className="catalog-picks-custom-add"
              onClick={addCustom}
              data-testid="catalog-custom-add"
            >
              Add “{query.trim().replace(/\s+/g, " ").slice(0, 40)}”
            </button>
          )}
        </div>
      </div>

      {boxCount === 0 && !canAddCustom ? (
        <p className="catalog-picks-none">
          {q ? "No matching boxes." : "Catalog is empty."}
        </p>
      ) : (
        <div className="catalog-picks-groups" data-testid="catalog-pick-boxes">
          {visibleCustomSelected.length > 0 && (
            <div className="catalog-picks-group">
              <p className="catalog-picks-group-label">Yours</p>
              <div className="catalog-picks-grid">
                {visibleCustomSelected.map((tag) => (
                  <button
                    key={`custom-${tag}`}
                    type="button"
                    onClick={() => onToggle(tag)}
                    className="catalog-pick-box catalog-pick-box--on"
                    aria-pressed="true"
                    data-testid="catalog-pick-box"
                  >
                    <span className="catalog-pick-box-label">{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {filteredGroups.map((g) => (
            <div key={g.cat} className="catalog-picks-group">
              <p className="catalog-picks-group-label">{g.cat}</p>
              <div className="catalog-picks-grid">
                {g.tags.map((tag) => {
                  const on = selectedSet.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onToggle(tag)}
                      className={`catalog-pick-box ${on ? "catalog-pick-box--on" : ""}`}
                      aria-pressed={on}
                      data-testid="catalog-pick-box"
                    >
                      <span className="catalog-pick-box-label">{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
