"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { authClient } from "@/lib/auth-client";
import { vibeLabel } from "@/lib/circle";

type DiscoverItem = {
  userId: string;
  displayName: string;
  bio: string;
  lookingFor: string[];
  vibe: string;
  photoUrl: string | null;
};

export default function CircleDiscoverPage() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const [profiles, setProfiles] = useState<DiscoverItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Adults only · Discovery
          </p>
          <h1
            className="text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Circle
          </h1>
          <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-[#c4b7a8]">
            Find other swingers who opted into discovery. Post your own profile
            and photos — 18+ accounts only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/circle/me"
            className="rounded-sm border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3 py-1.5 text-sm text-[var(--accent-strong)] transition hover:bg-[var(--accent)]/25"
          >
            My profile
          </Link>
          <Link
            href="/account"
            className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-sm text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
          >
            Share code
          </Link>
        </div>
      </header>

      {!isPending && !signedIn && (
        <div className="border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-8 text-center">
          <p className="text-[#c4b7a8]">
            Sign in with an 18+ account to browse Circle.
          </p>
          <Link
            href="/sign-in"
            className="mt-4 inline-block text-[var(--accent-strong)] underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </div>
      )}

      {signedIn && loading && (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {signedIn && !loading && profiles.length === 0 && !error && (
        <div className="border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-8">
          <p className="text-[#c4b7a8]">
            No discoverable profiles yet. Be the first — opt in on your Circle
            profile, or redeem a share code on{" "}
            <Link href="/account" className="text-[var(--accent-strong)] hover:underline">
              Echo
            </Link>
            .
          </p>
        </div>
      )}

      {signedIn && profiles.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <li key={p.userId}>
              <Link
                href={`/circle/${p.userId}`}
                className="group block overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/40 transition hover:border-[var(--accent)]/50"
              >
                <div className="aspect-[4/5] bg-[#12100e]">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photoUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                      No photo yet
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2
                      className="text-xl text-[var(--ink)] group-hover:text-[var(--accent-strong)]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {p.displayName}
                    </h2>
                    <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
                      {vibeLabel(p.vibe)}
                    </span>
                  </div>
                  {p.bio && (
                    <p className="mt-2 line-clamp-2 text-sm text-[#c4b7a8]">
                      {p.bio}
                    </p>
                  )}
                  {p.lookingFor.length > 0 && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Looking for {p.lookingFor.slice(0, 4).join(" · ")}
                      {p.lookingFor.length > 4 ? "…" : ""}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
