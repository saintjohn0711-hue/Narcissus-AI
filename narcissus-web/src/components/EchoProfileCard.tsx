"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareCodePanel } from "@/components/ShareCodePanel";
import { authClient } from "@/lib/auth-client";
import { PERSON_LABEL } from "@/lib/artOfX";
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
 * One composition: identity + highlights + Circle code + linked viewers.
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
      <article className="overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/50">
        <div className="relative px-6 py-10 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(600px 220px at 0% 0%, rgba(232,168,124,0.16), transparent 60%), linear-gradient(135deg, rgba(22,19,16,0.2), transparent)",
            }}
          />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              Echo
            </p>
            <h2
              className="mt-3 text-3xl text-[var(--ink)] sm:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Your account card
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#c4b7a8]">
              Sign in to see highlights, Circle codes, and cloud-save status for
              your Narcissus account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="rounded-sm bg-[var(--accent)]/90 px-4 py-2.5 text-sm font-medium text-[#1a120c] transition hover:bg-[var(--accent-strong)]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-sm border border-[var(--line)] px-4 py-2.5 text-sm text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
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
      label: PERSON_LABEL.plural,
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
    <article className="echo-card overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/55">
      {/* Identity band */}
      <div className="relative border-b border-[var(--line)] px-5 py-6 sm:px-8 sm:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 240px at 8% -20%, rgba(232,168,124,0.22), transparent 55%), radial-gradient(420px 180px at 100% 0%, rgba(90,70,50,0.28), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="h-16 w-16 object-cover ring-1 ring-[var(--accent)]/30 sm:h-[4.5rem] sm:w-[4.5rem]"
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center bg-[#1a1511] text-xl tracking-wide text-[var(--accent-strong)] ring-1 ring-[var(--accent)]/25 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
                aria-hidden
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
                Echo · Account
              </p>
              <h2
                className="mt-1 truncate text-3xl text-[var(--ink)] sm:text-4xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {displayName}
              </h2>
              {email && (
                <p className="mt-1 truncate text-sm text-[#c4b7a8]" title={email}>
                  {email}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="self-start rounded-sm border border-[var(--line)] px-3.5 py-2 text-sm text-[#c4b7a8] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)] disabled:opacity-50 sm:self-center"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>

      {/* Highlights */}
      <div className="border-b border-[var(--line)] px-5 py-5 sm:px-8">
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
                    className={`mt-1.5 text-xl tabular-nums ${
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
                "border border-[var(--line)] bg-[#0f0d0b]/55 px-3 py-3 transition hover:border-[var(--accent)]/35";
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
        {echo?.circle.discoverable && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Circle discovery is on
            {echo.circle.displayName
              ? ` as “${echo.circle.displayName}”`
              : ""}
            .{" "}
            <Link
              href="/circle/me"
              className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
            >
              Edit profile
            </Link>
          </p>
        )}
      </div>

      {/* Circle code (embedded) */}
      <div className="border-b border-[var(--line)] px-5 py-6 sm:px-8">
        <ShareCodePanel signedIn={signedIn} variant="embedded" />
      </div>

      {/* Linked viewers */}
      <div className="px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            className="text-2xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Linked viewers
          </h3>
          <div className="flex gap-3 text-sm">
            <Link
              href="/circle"
              className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
            >
              Open Circle
            </Link>
            <Link
              href="/circle/me"
              className="text-[#c4b7a8] underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              My Circle profile
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-[#c4b7a8]">
          People linked via Circle code. Profile view only — vault stays private.
        </p>

        {links.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No links yet.</p>
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
      </div>
    </article>
  );
}
