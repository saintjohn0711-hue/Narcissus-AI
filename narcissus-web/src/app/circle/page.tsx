"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { authClient } from "@/lib/auth-client";
import {
  CIRCLE_LOOKING_FOR,
  CIRCLE_VIBES,
  vibeLabel,
} from "@/lib/circle";

type DiscoverItem = {
  userId: string;
  displayName: string;
  bio: string;
  lookingFor: string[];
  vibe: string;
  photoUrl: string | null;
  updatedAt?: string;
};

function isRecentlyActive(iso?: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 1000 * 60 * 60 * 72; // 72h
}

export default function CircleDiscoverPage() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const [profiles, setProfiles] = useState<DiscoverItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vibeFilter, setVibeFilter] = useState<string>("all");
  const [lookingFilters, setLookingFilters] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!signedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetch("/api/circle/discover")
      .then(async (r) => {
        const d = (await r.json()) as {
          profiles?: DiscoverItem[];
          error?: string;
        };
        if (!r.ok) {
          setError(d.error || "Could not load Circle");
          return;
        }
        setProfiles(d.profiles || []);
      })
      .catch(() => setError("Could not load Circle"))
      .finally(() => setLoading(false));
  }, [signedIn, isPending]);

  function toggleLooking(tag: string) {
    setLookingFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (vibeFilter !== "all" && p.vibe !== vibeFilter) return false;
      if (
        lookingFilters.length > 0 &&
        !lookingFilters.every((tag) => p.lookingFor.includes(tag))
      ) {
        return false;
      }
      if (!q) return true;
      const hay = `${p.displayName} ${p.bio} ${p.lookingFor.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [profiles, vibeFilter, lookingFilters, query]);

  const activeFilterCount =
    (vibeFilter !== "all" ? 1 : 0) + lookingFilters.length + (query.trim() ? 1 : 0);

  return (
    <div className="circle-page relative min-h-screen overflow-hidden">
      <div className="circle-atmosphere" aria-hidden="true">
        <div className="circle-atmosphere-wash" />
        <div className="circle-atmosphere-grain" />
        <div className="circle-neon-bar" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-10 sm:px-8 lg:px-10">
        <AppNav />

        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#c49a8e]">
              Adults only · Swingers discovery
            </p>
            <h1
              className="text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Circle
            </h1>
            <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-[#c4b7a8]">
              Browse photo-forward profiles from swingers who opted in. Filter
              by vibe and what they’re looking for — then link via Circle code
              on Echo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/circle/me"
              className="rounded-sm border border-[rgba(232,120,88,0.45)] bg-[rgba(180,48,56,0.22)] px-3.5 py-2 text-sm text-[#f3c9b4] transition hover:bg-[rgba(180,48,56,0.34)]"
            >
              My profile
            </Link>
            <Link
              href="/account"
              className="rounded-sm border border-[var(--line)] px-3.5 py-2 text-sm text-[#c4b7a8] transition hover:border-[rgba(232,120,88,0.4)] hover:text-[var(--ink)]"
            >
              Share code
            </Link>
          </div>
        </header>

        {!isPending && !signedIn && (
          <div className="border border-[var(--line)] bg-[#120c0d]/70 p-10 text-center">
            <p className="text-lg text-[#c4b7a8]" style={{ fontFamily: "var(--font-display), serif" }}>
              Sign in with an 18+ account to browse Circle.
            </p>
            <Link
              href="/sign-in"
              className="mt-5 inline-block rounded-sm bg-[var(--accent)]/90 px-5 py-2.5 text-sm font-medium text-[#1a120c] transition hover:bg-[var(--accent-strong)]"
            >
              Sign in
            </Link>
          </div>
        )}

        {signedIn && (
          <div className="mb-8 border border-[var(--line)] bg-[#100b0c]/75 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#c49a8e]">
                  Browse
                </p>
                <p className="mt-1 text-sm text-[#c4b7a8]">
                  {loading
                    ? "Loading members…"
                    : `${filtered.length} profile${filtered.length === 1 ? "" : "s"}`}
                  {activeFilterCount > 0 && !loading
                    ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} on`
                    : ""}
                </p>
              </div>
              {(activeFilterCount > 0 || query) && (
                <button
                  type="button"
                  onClick={() => {
                    setVibeFilter("all");
                    setLookingFilters([]);
                    setQuery("");
                  }}
                  className="text-xs text-[#c49a8e] underline-offset-2 hover:text-[var(--ink)] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            <label className="mt-4 block">
              <span className="sr-only">Search profiles</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, bio, tags…"
                className="w-full rounded-sm border border-[var(--line)] bg-[#0a0708] px-3 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[rgba(232,120,88,0.5)]"
              />
            </label>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                Looking for
              </p>
              <div className="flex flex-wrap gap-2">
                {CIRCLE_LOOKING_FOR.map((tag) => {
                  const on = lookingFilters.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleLooking(tag)}
                      className={`circle-filter-chip rounded-sm border px-2.5 py-1 text-xs tracking-wide ${
                        on
                          ? "is-on"
                          : "border-[var(--line)] text-[#c4b7a8] hover:border-[rgba(232,120,88,0.35)]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                Vibe
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVibeFilter("all")}
                  className={`circle-filter-chip rounded-sm border px-2.5 py-1 text-xs tracking-wide ${
                    vibeFilter === "all"
                      ? "is-on"
                      : "border-[var(--line)] text-[#c4b7a8] hover:border-[rgba(232,120,88,0.35)]"
                  }`}
                >
                  All
                </button>
                {CIRCLE_VIBES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVibeFilter(v)}
                    className={`circle-filter-chip rounded-sm border px-2.5 py-1 text-xs tracking-wide ${
                      vibeFilter === v
                        ? "is-on"
                        : "border-[var(--line)] text-[#c4b7a8] hover:border-[rgba(232,120,88,0.35)]"
                    }`}
                  >
                    {vibeLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

        {signedIn && loading && (
          <p className="text-sm text-[var(--muted)]">Loading members…</p>
        )}

        {signedIn && !loading && profiles.length === 0 && !error && (
          <div className="border border-[var(--line)] bg-[#120c0d]/70 p-8">
            <p className="text-[#c4b7a8]">
              No discoverable profiles yet. Be the first — opt in on your Circle
              profile, or redeem a share code on{" "}
              <Link
                href="/account"
                className="text-[var(--accent-strong)] hover:underline"
              >
                Echo
              </Link>
              .
            </p>
          </div>
        )}

        {signedIn && !loading && profiles.length > 0 && filtered.length === 0 && (
          <div className="border border-[var(--line)] bg-[#120c0d]/70 p-8">
            <p className="text-[#c4b7a8]">
              No profiles match these filters. Try clearing a tag or vibe.
            </p>
          </div>
        )}

        {signedIn && filtered.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => {
              const active = isRecentlyActive(p.updatedAt);
              return (
                <li key={p.userId} className="circle-member-card">
                  <Link
                    href={`/circle/${p.userId}`}
                    className="group relative block overflow-hidden border border-[var(--line)] bg-[#120c0d]"
                  >
                    <div className="aspect-[3/4] bg-[#0a0708]">
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photoUrl}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#1a1214] to-[#0a0708] text-sm text-[var(--muted)]">
                          No photo yet
                        </div>
                      )}
                      <div className="circle-photo-overlay absolute inset-0" />
                    </div>

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                      <span className="rounded-sm bg-black/55 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#f3c9b4] backdrop-blur-[2px]">
                        {vibeLabel(p.vibe)}
                      </span>
                      {active && (
                        <span className="inline-flex items-center gap-1.5 rounded-sm bg-black/55 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--ok)] backdrop-blur-[2px]">
                          <span
                            className="circle-status-dot h-1.5 w-1.5 rounded-full bg-[var(--ok)]"
                            aria-hidden
                          />
                          Active
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <h2
                        className="text-2xl leading-tight text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        {p.displayName}
                      </h2>
                      {p.bio && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#d4c4b4]">
                          {p.bio}
                        </p>
                      )}
                      {p.lookingFor.length > 0 && (
                        <p className="mt-2.5 line-clamp-1 text-[10px] uppercase tracking-[0.12em] text-[#c49a8e]">
                          {p.lookingFor.slice(0, 3).join(" · ")}
                          {p.lookingFor.length > 3 ? "…" : ""}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
