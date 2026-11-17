"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

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
  /** Accessible name for the type-in select */
  label?: string;
  removeLabel?: string;
};

type FlatOption = { tag: string; cat: string };

/**
 * Type-in select / combobox for large acts & kinks catalogs.
 * Matches Muse chat select chrome: one field you type into, dropdown results,
 * selected list easy to scan — not a dense checkbox wall.
 */
export function CatalogMultiSelect({
  groups,
  selected,
  onToggle,
  searchPlaceholder = "Type to find and add…",
  emptySelectedHint = "Nothing selected yet — type below to add.",
  allowCustom = false,
  customPlaceholder = "Add custom…",
  compact = false,
  label = "Add from catalog",
  removeLabel = "Remove",
}: CatalogMultiSelectProps) {
  const listId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const q = query.trim().toLowerCase();

  const available = useMemo(() => {
    const out: FlatOption[] = [];
    for (const g of groups) {
      for (const tag of g.tags) {
        if (!selectedSet.has(tag)) out.push({ tag, cat: g.cat });
      }
    }
    return out;
  }, [groups, selectedSet]);

  const filtered = useMemo(() => {
    if (!q) return available.slice(0, compact ? 12 : 24);
    return available.filter(
      (o) =>
        o.tag.toLowerCase().includes(q) || o.cat.toLowerCase().includes(q),
    );
  }, [available, q, compact]);

  const filteredGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const o of filtered) {
      const list = map.get(o.cat) || [];
      list.push(o.tag);
      map.set(o.cat, list);
    }
    return [...map.entries()].map(([cat, tags]) => ({ cat, tags }));
  }, [filtered]);

  const exactMatch = useMemo(() => {
    if (!query.trim()) return false;
    const needle = query.trim().toLowerCase();
    return groups.some((g) =>
      g.tags.some((t) => t.toLowerCase() === needle),
    );
  }, [groups, query]);

  const canAddCustom =
    allowCustom &&
    Boolean(query.trim()) &&
    !exactMatch &&
    !selectedSet.has(query.trim().replace(/\s+/g, " ").slice(0, 80));

  const optionCount = filtered.length + (canAddCustom ? 1 : 0);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open, filtered.length, canAddCustom]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function addTag(tag: string) {
    const clean = tag.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!clean) return;
    if (!selectedSet.has(clean)) onToggle(clean);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function addCustom() {
    if (!canAddCustom) return;
    addTag(query);
  }

  function pickByIndex(idx: number) {
    if (canAddCustom && idx === 0) {
      addCustom();
      return;
    }
    const offset = canAddCustom ? 1 : 0;
    const opt = filtered[idx - offset];
    if (opt) addTag(opt.tag);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, optionCount - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && optionCount > 0) {
        pickByIndex(activeIdx);
      } else if (canAddCustom) {
        addCustom();
      } else if (filtered[0]) {
        addTag(filtered[0].tag);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
  }

  let flatIdx = 0;

  return (
    <div
      ref={rootRef}
      className={`catalog-select ${compact ? "catalog-select--compact" : ""}`}
      data-testid="catalog-multi-select"
    >
      <div className="catalog-select-chosen">
        <p className="catalog-select-chosen-label">
          Selected · {selected.length}
        </p>
        {selected.length === 0 ? (
          <p className="catalog-select-empty">{emptySelectedHint}</p>
        ) : (
          <ul className="catalog-select-chosen-list">
            {selected.map((tag) => (
              <li key={tag} className="catalog-select-chosen-row">
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => onToggle(tag)}
                  className="catalog-select-remove"
                  data-testid="catalog-remove"
                >
                  {removeLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="catalog-select-field">
        <label className="catalog-select-field-label" htmlFor={inputId}>
          {label}
        </label>
        <div
          className={`catalog-select-control ${open ? "catalog-select-control--open" : ""}`}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && optionCount > 0
                ? `${listId}-opt-${activeIdx}`
                : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={
              allowCustom
                ? searchPlaceholder || customPlaceholder
                : searchPlaceholder
            }
            className="catalog-select-input"
            data-testid="catalog-select-input"
            autoComplete="off"
          />
          <button
            type="button"
            className="catalog-select-chevron"
            tabIndex={-1}
            aria-label={open ? "Close options" : "Open options"}
            onClick={() => {
              setOpen((v) => !v);
              inputRef.current?.focus();
            }}
          >
            <span aria-hidden>{open ? "▴" : "▾"}</span>
          </button>
        </div>

        {open && (
          <div
            id={listId}
            role="listbox"
            className="catalog-select-menu"
            data-testid="catalog-select-menu"
          >
            {optionCount === 0 ? (
              <p className="catalog-select-menu-empty">
                {q
                  ? allowCustom
                    ? "No catalog match — press Enter to add custom."
                    : "No matches."
                  : "Everything here is already selected."}
              </p>
            ) : (
              <>
                {canAddCustom && (
                  <button
                    type="button"
                    id={`${listId}-opt-0`}
                    role="option"
                    aria-selected={activeIdx === 0}
                    className={`catalog-select-option catalog-select-option--custom ${
                      activeIdx === 0 ? "catalog-select-option--active" : ""
                    }`}
                    onMouseEnter={() => setActiveIdx(0)}
                    onClick={addCustom}
                    data-testid="catalog-custom-add"
                  >
                    <span className="catalog-select-option-cat">Custom</span>
                    <span>
                      Add “{query.trim().replace(/\s+/g, " ").slice(0, 80)}”
                    </span>
                  </button>
                )}
                {filteredGroups.map((g) => (
                  <div key={g.cat} className="catalog-select-group">
                    <p className="catalog-select-group-label">{g.cat}</p>
                    {g.tags.map((tag) => {
                      const idx = (canAddCustom ? 1 : 0) + flatIdx;
                      flatIdx += 1;
                      return (
                        <button
                          key={tag}
                          type="button"
                          id={`${listId}-opt-${idx}`}
                          role="option"
                          aria-selected={activeIdx === idx}
                          className={`catalog-select-option ${
                            activeIdx === idx
                              ? "catalog-select-option--active"
                              : ""
                          }`}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => addTag(tag)}
                        >
                          <span>{tag}</span>
                          <span className="catalog-select-option-hint">Add</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
