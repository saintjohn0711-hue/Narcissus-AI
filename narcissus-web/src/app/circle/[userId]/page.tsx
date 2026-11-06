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

  const heroPhoto = profile?.photos?.[0]?.url ?? null;

  return (
    <div className="circle-page relative min-h-screen overflow-hidden">
      <div className="circle-atmosphere" aria-hidden="true">
        <div className="circle-atmosphere-wash" />
        <div className="circle-atmosphere-grain" />
        <div className="circle-neon-bar" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-10 sm:px-8">
        <AppNav />

        <p className="mb-6 text-sm">
          <Link href="/circle" className="text-[#c49a8e] hover:text-[var(--ink)]">
            ← Back to Circle
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
            <div className="overflow-hidden border border-[var(--line)] bg-[#120c0d]/80">
              <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="relative aspect-[4/5] bg-[#0a0708] md:aspect-auto md:min-h-[420px]">
                  {heroPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroPhoto}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-[var(--muted)]">
                      No photo yet
                    </div>
                  )}
                  <div className="circle-photo-overlay absolute inset-0 md:hidden" />
                </div>

                <div className="flex flex-col justify-end p-6 sm:p-8">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#c49a8e]">
                    {vibeLabel(profile.vibe)}
                    {profile.linked ? " · Linked" : ""}
                    {profile.isSelf ? " · You" : ""}
                  </p>
                  <h1
                    className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
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
                    <div className="mt-5 flex flex-wrap gap-2">
                      {profile.lookingFor.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-sm border border-[rgba(232,120,88,0.35)] bg-[rgba(180,48,56,0.18)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#f3c9b4]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {profile.isSelf && (
                    <Link
                      href="/circle/me"
                      className="mt-6 inline-block text-sm text-[var(--accent-strong)] hover:underline"
                    >
                      Edit profile
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {profile.photos.length > 1 && (
              <section className="mt-8">
                <h2
                  className="mb-4 text-2xl text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  More photos
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {profile.photos.slice(1).map((ph) => (
                    <figure
                      key={ph.id}
                      className="overflow-hidden border border-[var(--line)]"
                    >
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
              </section>
            )}

            {profile.photos.length === 0 && (
              <p className="mt-6 text-sm text-[var(--muted)]">No photos yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
