"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PERSON_LABEL, type PersonType } from "@/lib/artOfX";
import { fetchPartners } from "@/lib/artOfXStore";
import {
  DEFAULT_ACT_FILTERS,
  buildMuseActScoreboard,
  filterSummary,
  type MuseActFilters,
} from "@/lib/museActStats";
import { OUTLETS, type OutletId } from "@/lib/outlets";

type MuseActScoreboardProps = {
  signedIn: boolean;
};

const TYPE_FILTERS: Array<PersonType | "All"> = [
  "All",
  "Real",
  "Dream",
  "Wanted",
];

/**
 * Echo scoreboard — overall Muse sexual-activity stats + overscore.
 * Reads the same Muse ledger used on Art of X (cloud when signed in).
 */
export function MuseActScoreboard({ signedIn }: MuseActScoreboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MuseActFilters>(DEFAULT_ACT_FILTERS);
  const [partners, setPartners] = useState<
    Awaited<ReturnType<typeof fetchPartners>>
  >([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPartners()
      .then((list) => {
        if (!cancelled) setPartners(list);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load Muse activity");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const board = useMemo(
    () => buildMuseActScoreboard(partners, filters),
    [partners, filters],
  );

  function setType(type: PersonType | "All") {
    setFilters((f) => ({ ...f, type }));
  }

  function setOutlet(outlet: OutletId | null) {
    setFilters((f) => ({ ...f, outlet, gender: "All" }));
  }

  return (
    <section
      aria-labelledby="echo-muse-stats"
      className="echo-muse-stats border-b border-[var(--line)] px-5 py-6 sm:px-8"
      data-testid="echo-muse-stats"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3
            id="echo-muse-stats"
            className="text-xl text-[var(--ink)] sm:text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Muse overscore
          </h3>
          <p className="mt-1 text-sm text-[#c4b7a8]">
            Everything logged across your {PERSON_LABEL.pluralLower} — filter by
            Real / Dream / outlet.
          </p>
        </div>
        <Link
          href="/art-of-x/partners"
          className="text-sm text-[var(--accent-strong)] underline-offset-2 hover:underline"
        >
          Open {PERSON_LABEL.plural}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading activity…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      ) : (
        <>
          <div className="echo-overscore relative overflow-hidden border border-[var(--glow)]/30 bg-[#0a0e18]/70 px-4 py-5 sm:px-5">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(420px 160px at 0% 0%, rgba(90,160,255,0.18), transparent 55%), radial-gradient(320px 140px at 100% 100%, rgba(232,168,124,0.12), transparent 50%)",
              }}
            />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--glow)]">
                  Overscore · {board.tier.label}
                </p>
                <p
                  className="mt-1 text-5xl tabular-nums text-[var(--ink)] sm:text-6xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                  data-testid="echo-overscore-value"
                >
                  {board.overscore}
                </p>
                <p className="mt-2 max-w-md text-sm text-[#c4b7a8]">
                  {board.tier.blurb}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-right">
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    Muses
                  </dt>
                  <dd className="mt-0.5 text-lg tabular-nums text-[var(--ink)]">
                    {board.musesWithActs}
                    <span className="text-[var(--muted)]">
                      /{board.museTotal}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    Act logs
                  </dt>
                  <dd className="mt-0.5 text-lg tabular-nums text-[var(--ink)]">
                    {board.actLogs}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    Distinct
                  </dt>
                  <dd className="mt-0.5 text-lg tabular-nums text-[var(--ink)]">
                    {board.distinctActs}
                  </dd>
                </div>
              </dl>
            </div>
            <p className="relative mt-3 text-[11px] text-[var(--muted)]">
              Score = act weight × Muse type (Real×3 · Dream×2 · Wanted×1) +
              diversity. {filterSummary(filters)}.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filter by Muse type"
            >
              {TYPE_FILTERS.map((t) => {
                const on = filters.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] transition ${
                      on
                        ? "border-[var(--glow)]/55 bg-[var(--glow)]/12 text-[var(--glow)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--glow)]/30 hover:text-[#c4b7a8]"
                    }`}
                    data-testid={`echo-stats-type-${t.toLowerCase()}`}
                  >
                    {t === "All" ? "All types" : t}
                  </button>
                );
              })}
            </div>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filter by outlet"
            >
              <button
                type="button"
                onClick={() => setOutlet(null)}
                className={`rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] transition ${
                  filters.outlet === null
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/12 text-[var(--accent-strong)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[#c4b7a8]"
                }`}
                data-testid="echo-stats-outlet-all"
              >
                All outlets
              </button>
              {OUTLETS.map((o) => {
                const on = filters.outlet === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOutlet(o.id)}
                    className={`rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] transition ${
                      on
                        ? "border-[var(--accent)]/50 bg-[var(--accent)]/12 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[#c4b7a8]"
                    }`}
                    data-testid={`echo-stats-outlet-${o.id}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {board.actLogs === 0 ? (
            <p className="mt-5 text-sm text-[var(--muted)]">
              No acts in this filter yet. Open a Muse on{" "}
              <Link
                href="/art-of-x/partners"
                className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
              >
                {PERSON_LABEL.plural}
              </Link>{" "}
              and tap the acts row to log.
            </p>
          ) : (
            <>
              {board.pairs.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Given vs received
                  </p>
                  <ul className="mt-2 flex flex-col border border-[var(--line)] bg-[#0f0d0b]/55">
                    {board.pairs.map((pair) => (
                      <li
                        key={pair.stem}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)]/70 px-3 py-2.5 last:border-0"
                        data-testid={`echo-stats-pair-${pair.stem.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="min-w-0">
                          <p className="text-[14px] text-[#f0e6dc]">
                            {pair.stem}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                            {pair.cat}
                          </p>
                        </div>
                        <div className="flex gap-4 text-right text-[13px] tabular-nums">
                          <span title="You've given this">
                            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Given{" "}
                            </span>
                            <span className="text-[var(--glow)]">
                              {pair.given?.museCount ?? 0}
                            </span>
                          </span>
                          <span title="You've received this">
                            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Received{" "}
                            </span>
                            <span className="text-[var(--accent-strong)]">
                              {pair.received?.museCount ?? 0}
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {board.shared.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Shared / scene acts
                  </p>
                  <ul className="mt-2 flex flex-col border border-[var(--line)] bg-[#0f0d0b]/55">
                    {board.shared.slice(0, 12).map((row) => (
                      <li
                        key={row.tag}
                        className="flex items-baseline justify-between gap-3 border-b border-[var(--line)]/70 px-3 py-2 last:border-0"
                      >
                        <span className="min-w-0 truncate text-[13px] text-[#f0e6dc]">
                          {row.tag}
                          <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            {row.cat}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-[13px] text-[var(--ink)]">
                          {row.museCount}
                          <span className="text-[var(--muted)]">
                            {" "}
                            Muse{row.museCount === 1 ? "" : "s"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {board.shared.length > 12 && (
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      +{board.shared.length - 12} more shared acts in this
                      filter
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="border border-[var(--line)] bg-[#0f0d0b]/40 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    By type
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {board.byType.map((t) => (
                      <li
                        key={t.type}
                        className="flex justify-between text-[13px] text-[#c4b7a8]"
                      >
                        <span>{t.type}</span>
                        <span className="tabular-nums text-[var(--ink)]">
                          {t.actLogs} acts · {t.muses} Muses
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-[var(--line)] bg-[#0f0d0b]/40 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    By outlet
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {board.byOutlet
                      .filter((o) => o.muses > 0 || o.actLogs > 0)
                      .map((o) => (
                        <li
                          key={o.outlet}
                          className="flex justify-between text-[13px] text-[#c4b7a8]"
                        >
                          <span>{o.label}</span>
                          <span className="tabular-nums text-[var(--ink)]">
                            {o.actLogs} acts · {o.muses} Muses
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
