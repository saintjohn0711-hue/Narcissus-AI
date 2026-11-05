"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { authClient } from "@/lib/auth-client";
import { vibeLabel, type CircleProfilePublic } from "@/lib/circle";

export default function CircleProfilePage() {
  const params = useParams();
  const userId = String(params.userId || "");
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const [profile, setProfile] = useState<CircleProfilePublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    if (!signedIn || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetch(`/api/circle/profiles/${encodeURIComponent(userId)}`)
      .then(async (r) => {
        const d = (await r.json()) as {
          profile?: CircleProfilePublic;
          error?: string;
        };
        if (!r.ok) {
          setError(
            d.error === "not_found_or_private"
              ? "Profile not found or private."
              : d.error || "Could not load profile",
          );
          return;
        }
        setProfile(d.profile || null);
      })
      .catch(() => setError("Could not load profile"))
      .finally(() => setLoading(false));
  }, [signedIn, isPending, userId]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-10">
      <AppNav />

      <p className="mb-6 text-sm">
        <Link href="/circle" className="text-[var(--muted)] hover:text-[var(--ink)]">
          ← Circle
        </Link>
      </p>

      {!isPending && !signedIn && (
        <p className="text-[#c4b7a8]">
          Sign in to view Circle profiles.{" "}
          <Link href="/sign-in" className="text-[var(--accent-strong)] hover:underline">
            Sign in
          </Link>
        </p>
      )}

      {loading && signedIn && (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {profile && (
        <>
          <header className="mb-8">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              Adults only · {vibeLabel(profile.vibe)}
              {profile.linked ? " · Linked" : ""}
              {profile.isSelf ? " · You" : ""}
            </p>
            <h1
              className="text-5xl font-semibold tracking-tight text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {profile.displayName || "Circle member"}
            </h1>
            {profile.bio && (
              <p className="mt-4 text-base font-light leading-relaxed text-[#c4b7a8]">
                {profile.bio}
              </p>
            )}
            {profile.lookingFor.length > 0 && (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Looking for{" "}
                <span className="text-[var(--ink)]">
                  {profile.lookingFor.join(" · ")}
                </span>
              </p>
            )}
            {profile.isSelf && (
              <Link
                href="/circle/me"
                className="mt-4 inline-block text-sm text-[var(--accent-strong)] hover:underline"
              >
                Edit profile
              </Link>
            )}
          </header>

          {profile.photos.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {profile.photos.map((ph) => (
                <figure key={ph.id} className="overflow-hidden border border-[var(--line)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ph.url}
                    alt={ph.caption || ""}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  {ph.caption && (
                    <figcaption className="px-3 py-2 text-xs text-[var(--muted)]">
                      {ph.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
