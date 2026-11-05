"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ShareCodePanel } from "@/components/ShareCodePanel";
import { authClient } from "@/lib/auth-client";
import type { CircleLinkRow } from "@/lib/circle";

/**
 * Account surface — share code + linked viewers.
 * Echo account card (highlights) can land here or replace the header strip;
 * keep ShareCodePanel wired when Echo ships.
 */
export default function AccountPage() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const [links, setLinks] = useState<CircleLinkRow[]>([]);

  useEffect(() => {
    if (!signedIn) {
      setLinks([]);
      return;
    }
    void fetch("/api/circle/links")
      .then((r) => r.json())
      .then((d: { links?: CircleLinkRow[] }) => setLinks(d.links || []))
      .catch(() => setLinks([]));
  }, [signedIn]);

  async function unlink(id: string) {
    const res = await fetch(`/api/circle/links?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-10">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Adults only · Account
        </p>
        <h1
          className="text-5xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Echo
        </h1>
        <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-[#c4b7a8]">
          Your Narcissus account card — Circle share codes, linked viewers, and
          a door into discovery. Highlights land here as Echo grows.
        </p>
        {!isPending && signedIn && (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Signed in as{" "}
            <span className="text-[var(--ink)]">
              {session?.user?.name || session?.user?.email}
            </span>
          </p>
        )}
      </header>

      <div className="flex flex-col gap-8">
        <ShareCodePanel signedIn={signedIn} />

        <section className="border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              className="text-2xl text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Linked viewers
            </h2>
            <Link
              href="/circle"
              className="text-sm text-[var(--accent-strong)] underline-offset-2 hover:underline"
            >
              Open Circle →
            </Link>
          </div>
          <p className="mt-2 text-sm text-[#c4b7a8]">
            People you linked via Circle code (or who linked to you). Mutual
            connection in Circle — profile view only.
          </p>

          {!signedIn ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Sign in to see links.</p>
          ) : links.length === 0 ? (
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
                      You are the {l.role === "owner" ? "shared account" : "viewer"}
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

        <section className="border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-5">
          <h2
            className="text-2xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your Circle profile
          </h2>
          <p className="mt-2 text-sm text-[#c4b7a8]">
            Opt into discovery, post photos of yourself, and set what you’re
            looking for.
          </p>
          <Link
            href="/circle/me"
            className="mt-4 inline-block rounded-sm border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-2 text-sm text-[var(--accent-strong)] transition hover:bg-[var(--accent)]/25"
          >
            Edit Circle profile
          </Link>
        </section>
      </div>
    </div>
  );
}
