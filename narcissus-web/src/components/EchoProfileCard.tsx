"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareCodePanel } from "@/components/ShareCodePanel";
import { authClient } from "@/lib/auth-client";
import { resetStoreMode } from "@/lib/artOfXStore";
import type { CircleLinkRow } from "@/lib/circle";

type EchoPayload = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: string;
  };
  highlights: {
    partners: number;
    scenes: number;
    circleConnections: number;
    cloudSave: boolean;
    memberSince: string;
  };
  circle: {
    displayName: string | null;
    discoverable: boolean;
  };
};

type HighlightStat = {
  label: string;
  value: string;
  href?: string;
  tone?: "ok" | "muted";
};

function initialsFrom(name: string, email: string): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (base.includes("@")) {
    return base.slice(0, 2).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase() || "?";
}

function formatMemberSince(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

/**
 * Echo — polished Narcissus account profile card.
 * Clear hierarchy: identity → highlights → share code → linked viewers → sign out.
 */
export function EchoProfileCard({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [echo, setEcho] = useState<EchoPayload | null>(null);
  const [links, setLinks] = useState<CircleLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) {
      setEcho(null);
      setLinks([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [echoRes, linksRes] = await Promise.all([
        fetch("/api/account/echo"),
        fetch("/api/circle/links"),
      ]);
      const echoData = (await echoRes.json()) as EchoPayload & { error?: string };
      const linksData = (await linksRes.json()) as {
        links?: CircleLinkRow[];
        error?: string;
      };
      if (!echoRes.ok) {
        setError(echoData.error || "Could not load Echo");
        return;
      }
      setEcho(echoData);
      setLinks(linksData.links || []);
    } catch {
      setError("Could not load Echo");
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      resetStoreMode();
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  async function unlink(id: string) {
    const res = await fetch(`/api/circle/links?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      setEcho((prev) =>
        prev
          ? {
              ...prev,
              highlights: {
                ...prev.highlights,
                circleConnections: Math.max(
                  0,
                  prev.highlights.circleConnections - 1,
                ),
              },
            }
          : prev,
      );
    }
  }

  const displayName = useMemo(() => {
    if (echo?.user.name) return echo.user.name;
    if (session?.user?.name) return session.user.name;
    return session?.user?.email?.split("@")[0] || "Guest";
  }, [echo, session]);

  const email = echo?.user.email || session?.user?.email || "";
  const image = echo?.user.image || session?.user?.image || null;
  const initials = initialsFrom(displayName, email);

  if (!signedIn) {
    return (
      <article className="echo-card overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/55">
        <div className="relative px-6 py-12 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(620px 240px at 0% 0%, rgba(232,168,124,0.18), transparent 60%), linear-gradient(135deg, rgba(22,19,16,0.25), transparent)",
            }}
          />
          <div className="relative">
            <p className="echo-section-label text-[10px] uppercase text-[var(--muted)]">
              Echo
            </p>
            <h2
              className="mt-3 text-3xl text-[var(--ink)] sm:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Sign in to open your card
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#c4b7a8]">
              Highlights, Circle codes, cloud-save status, and linked viewers
              live here once you’re on an 18+ Narcissus account.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="rounded-sm bg-[var(--accent)]/90 px-5 py-2.5 text-sm font-medium text-[#1a120c] transition hover:bg-[var(--accent-strong)]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-sm border border-[var(--line)] px-5 py-2.5 text-sm text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  const h = echo?.highlights;
  const stats: HighlightStat[] = [
    {
      label: "Partners",
      value: h ? String(h.partners) : "—",
      href: "/art-of-x/partners",
    },
    {
      label: "Scenes",
      value: h ? String(h.scenes) : "—",
      href: "/art-of-x/stories",
    },
    {
      label: "Circle links",
      value: h ? String(h.circleConnections) : "—",
      href: "/circle",
    },
    {
      label: "Member since",
      value: h ? formatMemberSince(h.memberSince) : "—",
    },
    {
      label: "Cloud save",
      value: h?.cloudSave ? "On" : "Off",
      tone: h?.cloudSave ? "ok" : "muted",
    },
  ];

  return (
    <article className="echo-card overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/60">
      {/* 1. Identity */}
      <section
        aria-labelledby="echo-identity"
        className="relative border-b border-[var(--line)] px-5 py-7 sm:px-8 sm:py-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 260px at 6% -25%, rgba(232,168,124,0.24), transparent 55%), radial-gradient(420px 180px at 100% 0%, rgba(90,70,50,0.3), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="h-[4.5rem] w-[4.5rem] object-cover ring-1 ring-[var(--accent)]/35 sm:h-20 sm:w-20"
              />
            ) : (
              <div
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center bg-[#1a1511] text-2xl tracking-wide text-[var(--accent-strong)] ring-1 ring-[var(--accent)]/30 sm:h-20 sm:w-20 sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
                aria-hidden
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="echo-section-label text-[10px] uppercase text-[var(--muted)]">
                Profile
              </p>
              <h2
                id="echo-identity"
                className="mt-1 truncate text-3xl text-[var(--ink)] sm:text-4xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {displayName}
              </h2>
              {email && (
                <p className="mt-1.5 truncate text-sm text-[#c4b7a8]" title={email}>
                  {email}
                </p>
              )}
              {echo?.circle.discoverable && (
                <p className="mt-2 text-xs text-[var(--ok)]">
                  <span
                    className="echo-cloud-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--ok)] align-middle"
                    aria-hidden
                  />
                  On Circle discovery
                  {echo.circle.displayName
                    ? ` as “${echo.circle.displayName}”`
                    : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <Link
              href="/circle/me"
              className="rounded-sm border border-[var(--accent)]/35 bg-[var(--accent)]/12 px-3.5 py-2 text-sm text-[var(--accent-strong)] transition hover:bg-[var(--accent)]/22"
            >
              Circle profile
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="echo-signout rounded-sm border border-[var(--line)] bg-[#0f0d0b]/40 px-3.5 py-2 text-sm text-[#c4b7a8] hover:border-[var(--danger)]/45 hover:text-[var(--danger)] disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Highlights */}
      <section
        aria-labelledby="echo-highlights"
        className="border-b border-[var(--line)] px-5 py-6 sm:px-8"
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="echo-highlights"
            className="text-xl text-[var(--ink)] sm:text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Highlights
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Saved across Art of X and Circle
          </p>
        </div>

        {loading && !echo ? (
          <p className="text-sm text-[var(--muted)]">Loading highlights…</p>
        ) : error && !echo ? (
          <p className="text-sm text-[var(--danger)]">{error}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat) => {
              const inner = (
                <>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    {stat.label}
                  </dt>
                  <dd
                    className={`mt-1.5 text-2xl tabular-nums ${
                      stat.tone === "ok"
                        ? "text-[var(--ok)]"
                        : "text-[var(--ink)]"
                    }`}
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {stat.value}
                    {stat.tone === "ok" && (
                      <span
                        className="echo-cloud-dot ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--ok)] align-middle"
                        aria-hidden
                      />
                    )}
                  </dd>
                </>
              );
              const className =
                "echo-stat border border-[var(--line)] bg-[#0f0d0b]/55 px-3 py-3.5 hover:border-[var(--accent)]/40 hover:bg-[#14110e]/8";
              return stat.href ? (
                <Link key={stat.label} href={stat.href} className={className}>
                  {inner}
                </Link>
              ) : (
                <div key={stat.label} className={className}>
                  {inner}
                </div>
              );
            })}
          </dl>
        )}
      </section>

      {/* 3. Share code */}
      <section
        aria-labelledby="echo-share"
        className="border-b border-[var(--line)] px-5 py-6 sm:px-8"
      >
        <p
          id="echo-share"
          className="echo-section-label mb-3 text-[10px] uppercase text-[var(--muted)]"
        >
          Share
        </p>
        <ShareCodePanel signedIn={signedIn} variant="embedded" />
      </section>

      {/* 4. Linked viewers */}
      <section
        aria-labelledby="echo-links"
        className="border-b border-[var(--line)] px-5 py-6 sm:px-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="echo-links"
            className="text-xl text-[var(--ink)] sm:text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Linked viewers
          </h3>
          <div className="flex gap-3 text-sm">
            <Link
              href="/circle"
              className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
            >
              Browse Circle
            </Link>
            <Link
              href="/circle/me"
              className="text-[#c4b7a8] underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              Edit profile
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-[#c4b7a8]">
          People linked via Circle code. Profile view only — vault stays private.
        </p>

        {links.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--muted)]">
            No links yet. Share your Circle code above, or redeem someone
            else’s.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {links.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] pb-3 last:border-0"
              >
                {l.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.photoUrl}
                    alt=""
                    className="h-12 w-12 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center bg-[#1a1612] text-xs text-[var(--muted)]">
                    —
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/circle/${l.otherUserId}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--accent-strong)]"
                  >
                    {l.displayName}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    You are the{" "}
                    {l.role === "owner" ? "shared account" : "viewer"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void unlink(l.id)}
                  className="text-xs text-[var(--danger)] hover:underline"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Account actions */}
      <footer className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0908]/45 px-5 py-5 sm:px-8">
        <p className="text-xs text-[var(--muted)]">
          Signed in on Narcissus · Echo keeps your trail private to you
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="echo-signout rounded-sm border border-[var(--line)] px-4 py-2 text-sm text-[#c4b7a8] hover:border-[var(--danger)]/50 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out of Echo"}
        </button>
      </footer>
    </article>
  );
}
