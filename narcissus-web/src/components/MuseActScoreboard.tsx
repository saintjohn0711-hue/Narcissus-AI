"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  PERSON_LABEL,
  genderLabel,
  type PersonType,
} from "@/lib/artOfX";
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
  "Power",
];

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

function Chip({
  on,
  tone,
  children,
  onClick,
  testId,
}: {
  on: boolean;
  tone: "glow" | "accent";
  children: ReactNode;
  onClick: () => void;
  testId?: string;
}) {
  const active =
    tone === "glow"
      ? "border-[var(--glow)]/60 bg-[var(--glow)]/14 text-[var(--glow)] shadow-[0_0_18px_rgba(0,229,255,0.12)]"
      : "border-[var(--accent)]/55 bg-[var(--accent)]/14 text-[var(--accent-strong)] shadow-[0_0_16px_rgba(229,195,178,0.1)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`echo-stats-chip rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] transition ${
        on
          ? active
          : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--glow)]/35 hover:text-[var(--soft)]"
      }`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

/**
 * Echo scoreboard — Muse sexual-activity stats + overscore, layout that pops.
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

  const maxCat = useMemo(
    () => Math.max(1, ...board.byCategory.map((c) => c.actLogs)),
    [board.byCategory],
  );
  const maxPair = useMemo(
    () =>
      Math.max(
        1,
        ...board.pairs.map(
          (p) =>
            Math.max(p.given?.museCount ?? 0, p.received?.museCount ?? 0) || 0,
        ),
      ),
    [board.pairs],
  );
  const maxMuse = useMemo(
    () => Math.max(1, ...board.topMuses.map((m) => m.contribution)),
    [board.topMuses],
  );
  const topActs = board.byAct.slice(0, 10);
  const maxTopAct = Math.max(1, ...topActs.map((a) => a.museCount));

  function setType(type: PersonType | "All") {
    setFilters((f) => ({ ...f, type }));
  }

  function setOutlet(outlet: OutletId | null) {
    setFilters((f) => ({ ...f, outlet, gender: "All" }));
  }

  const directionWhole =
    board.givenTotal + board.receivedTotal + board.sharedTotal || 1;

  return (
    <section
      aria-labelledby="echo-muse-stats"
      className="echo-muse-stats border-b border-[var(--line)] px-5 py-7 sm:px-8"
      data-testid="echo-muse-stats"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="echo-section-label text-[10px] uppercase text-[var(--glow)]">
            Muse ledger · Echo
          </p>
          <h3
            id="echo-muse-stats"
            className="mt-1 text-2xl tracking-tight text-[var(--ink)] sm:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Muse overscore
          </h3>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--soft)]">
            Sharp read on everything logged across your{" "}
            {PERSON_LABEL.pluralLower} — filter Real / Dream / outlet, then
            watch given vs received light up.
          </p>
        </div>
        <Link
          href="/art-of-x/partners"
          className="rounded-sm border border-[var(--glow)]/35 bg-[var(--glow)]/8 px-3.5 py-2 text-sm text-[var(--glow)] transition hover:border-[var(--glow)]/60 hover:bg-[var(--glow)]/14"
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
          {/* Hero overscore */}
          <div
            className="echo-overscore relative overflow-hidden border border-[var(--glow)]/35 bg-[#060b16]/85 px-4 py-6 sm:px-6"
            data-testid="echo-overscore-hero"
          >
            <div className="echo-overscore-grid" aria-hidden />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(520px 200px at 8% -10%, rgba(0,229,255,0.22), transparent 55%), radial-gradient(380px 180px at 92% 110%, rgba(229,195,178,0.16), transparent 52%), linear-gradient(135deg, rgba(10,18,36,0.4), transparent 60%)",
              }}
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="echo-tier-badge"
                    data-tier={board.tier.id}
                    data-testid="echo-overscore-tier"
                  >
                    {board.tier.label}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    {filterSummary(filters)}
                  </span>
                </div>
                <p
                  className="echo-overscore-value mt-2 text-6xl tabular-nums text-[var(--ink)] sm:text-7xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                  data-testid="echo-overscore-value"
                >
                  {board.overscore}
                </p>
                <p className="mt-2 max-w-md text-sm text-[var(--soft)]">
                  {board.tier.blurb}
                </p>
                <div className="echo-tier-track mt-4 max-w-md">
                  <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span>{board.tierProgress.current.label}</span>
                    <span>
                      {board.tierProgress.next
                        ? `${board.tierProgress.pointsToNext} to ${board.tierProgress.next.label}`
                        : "Max tier"}
                    </span>
                  </div>
                  <div
                    className="echo-tier-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(board.tierProgress.ratio * 100)}
                    aria-label="Progress to next overscore tier"
                  >
                    <span
                      className="echo-tier-fill"
                      style={{
                        width: `${Math.round(board.tierProgress.ratio * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <dl className="echo-kpi-strip grid grid-cols-3 gap-2 sm:grid-cols-3 lg:min-w-[17rem]">
                {[
                  {
                    label: "Muses",
                    value: `${board.musesWithActs}/${board.museTotal}`,
                  },
                  { label: "Act logs", value: String(board.actLogs) },
                  { label: "Distinct", value: String(board.distinctActs) },
                ].map((k) => (
                  <div key={k.label} className="echo-kpi">
                    <dt>{k.label}</dt>
                    <dd>{k.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="relative mt-4 text-[11px] text-[var(--muted)]">
              Score = act weight × Muse type (Real×3 · Dream×2 · Wanted×1) +
              diversity bonus.
            </p>
          </div>

          {/* Direction pulse */}
          <div className="echo-direction-pulse mt-4 grid gap-2 sm:grid-cols-3">
            <div className="echo-dir-card echo-dir-card--given">
              <p className="label">Given</p>
              <p className="value" data-testid="echo-stats-given-total">
                {board.givenTotal}
              </p>
              <div className="echo-mini-bar">
                <span style={{ width: `${pct(board.givenTotal, directionWhole)}%` }} />
              </div>
            </div>
            <div className="echo-dir-card echo-dir-card--received">
              <p className="label">Received</p>
              <p className="value" data-testid="echo-stats-received-total">
                {board.receivedTotal}
              </p>
              <div className="echo-mini-bar">
                <span
                  style={{
                    width: `${pct(board.receivedTotal, directionWhole)}%`,
                  }}
                />
              </div>
            </div>
            <div className="echo-dir-card echo-dir-card--shared">
              <p className="label">Shared / scene</p>
              <p className="value" data-testid="echo-stats-shared-total">
                {board.sharedTotal}
              </p>
              <div className="echo-mini-bar">
                <span
                  style={{ width: `${pct(board.sharedTotal, directionWhole)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 flex flex-col gap-3">
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filter by Muse type"
            >
              {TYPE_FILTERS.map((t) => (
                <Chip
                  key={t}
                  on={filters.type === t}
                  tone="glow"
                  onClick={() => setType(t)}
                  testId={`echo-stats-type-${t.toLowerCase()}`}
                >
                  {t === "All" ? "All types" : t}
                </Chip>
              ))}
            </div>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filter by outlet"
            >
              <Chip
                on={filters.outlet === null}
                tone="accent"
                onClick={() => setOutlet(null)}
                testId="echo-stats-outlet-all"
              >
                All outlets
              </Chip>
              {OUTLETS.map((o) => (
                <Chip
                  key={o.id}
                  on={filters.outlet === o.id}
                  tone="accent"
                  onClick={() => setOutlet(o.id)}
                  testId={`echo-stats-outlet-${o.id}`}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {board.actLogs === 0 ? (
            <p className="mt-6 text-sm text-[var(--muted)]">
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
              {/* Category heat */}
              <div className="mt-7">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--glow)]">
                    Category heat
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    Logs by act family
                  </p>
                </div>
                <ul className="echo-cat-heat grid gap-2 sm:grid-cols-2">
                  {board.byCategory.map((cat) => (
                    <li key={cat.cat} className="echo-cat-row">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-[var(--ink)]">
                          {cat.cat}
                        </span>
                        <span className="tabular-nums text-[12px] text-[var(--soft)]">
                          {cat.actLogs}
                          <span className="text-[var(--muted)]">
                            {" "}
                            · {cat.distinctActs} kinds
                          </span>
                        </span>
                      </div>
                      <div className="echo-heat-track mt-1.5">
                        <span
                          className="echo-heat-fill"
                          style={{
                            width: `${pct(cat.actLogs, maxCat)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Given vs received */}
              {board.pairs.length > 0 && (
                <div className="mt-7">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--glow)]">
                      Given vs received
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      Muse counts · electric = given · rose = received
                    </p>
                  </div>
                  <ul className="echo-pair-board flex flex-col gap-2">
                    {board.pairs.map((pair) => {
                      const g = pair.given?.museCount ?? 0;
                      const r = pair.received?.museCount ?? 0;
                      return (
                        <li
                          key={pair.stem}
                          className="echo-pair-row"
                          data-testid={`echo-stats-pair-${pair.stem.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <div>
                              <p className="text-[14px] text-[var(--ink)]">
                                {pair.stem}
                              </p>
                              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                {pair.cat}
                              </p>
                            </div>
                            <div className="flex gap-4 text-[13px] tabular-nums">
                              <span>
                                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                                  Given{" "}
                                </span>
                                <span className="text-[var(--glow)]">{g}</span>
                              </span>
                              <span>
                                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                                  Received{" "}
                                </span>
                                <span className="text-[var(--accent-strong)]">
                                  {r}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="echo-dual-bars mt-2">
                            <div className="echo-dual-track">
                              <span
                                className="echo-dual-given"
                                style={{ width: `${pct(g, maxPair)}%` }}
                              />
                            </div>
                            <div className="echo-dual-track">
                              <span
                                className="echo-dual-recv"
                                style={{ width: `${pct(r, maxPair)}%` }}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Top acts mosaic + top Muses */}
              <div className="mt-7 grid gap-5 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--glow)]">
                    Hottest acts
                  </p>
                  <ul className="echo-act-mosaic">
                    {topActs.map((row, i) => (
                      <li
                        key={row.tag}
                        className="echo-act-tile"
                        style={
                          {
                            "--heat": String(pct(row.museCount, maxTopAct) / 100),
                            animationDelay: `${i * 40}ms`,
                          } as CSSProperties
                        }
                      >
                        <span className="rank">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-[var(--ink)]">
                            {row.tag}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            {row.cat}
                            {row.direction !== "shared"
                              ? ` · ${row.direction}`
                              : ""}
                          </p>
                        </div>
                        <span className="tabular-nums text-[14px] text-[var(--glow)]">
                          {row.museCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-2">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Top Muses by act rank
                  </p>
                  {board.topMuses.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No ranked Muses.</p>
                  ) : (
                    <ol className="echo-muse-leaders flex flex-col gap-2">
                      {board.topMuses.map((m, i) => (
                        <li key={m.id} className="echo-muse-leader">
                          <span className="idx">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-[var(--ink)]">
                              {m.name}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              {m.type} · {genderLabel(m.gender)} · {m.actCount}{" "}
                              acts
                            </p>
                            <div className="echo-heat-track mt-1.5">
                              <span
                                className="echo-heat-fill echo-heat-fill--accent"
                                style={{
                                  width: `${pct(m.contribution, maxMuse)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="tabular-nums text-[13px] text-[var(--accent-strong)]">
                            {m.contribution}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              {/* Shared acts */}
              {board.shared.length > 0 && (
                <div className="mt-7">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    Shared / scene acts
                  </p>
                  <ul className="echo-shared-grid">
                    {board.shared.slice(0, 12).map((row) => (
                      <li key={row.tag} className="echo-shared-chip">
                        <span className="truncate text-[13px] text-[var(--ink)]">
                          {row.tag}
                        </span>
                        <span className="shrink-0 tabular-nums text-[12px] text-[var(--glow)]">
                          {row.museCount}
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

              {/* Split by type / outlet */}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="echo-split-panel">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--glow)]">
                    By type
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {board.byType.map((t) => (
                      <li key={t.type}>
                        <div className="flex justify-between text-[13px] text-[var(--soft)]">
                          <span>{t.type}</span>
                          <span className="tabular-nums text-[var(--ink)]">
                            {t.actLogs} acts · {t.muses} Muses
                          </span>
                        </div>
                        <div className="echo-heat-track mt-1">
                          <span
                            className="echo-heat-fill"
                            style={{
                              width: `${pct(t.actLogs, Math.max(1, board.actLogs))}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="echo-split-panel">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    By outlet
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {board.byOutlet
                      .filter((o) => o.muses > 0 || o.actLogs > 0)
                      .map((o) => (
                        <li key={o.outlet}>
                          <div className="flex justify-between text-[13px] text-[var(--soft)]">
                            <span>{o.label}</span>
                            <span className="tabular-nums text-[var(--ink)]">
                              {o.actLogs} acts · {o.muses} Muses
                            </span>
                          </div>
                          <div className="echo-heat-track mt-1">
                            <span
                              className="echo-heat-fill echo-heat-fill--accent"
                              style={{
                                width: `${pct(o.actLogs, Math.max(1, board.actLogs))}%`,
                              }}
                            />
                          </div>
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
