"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { authClient } from "@/lib/auth-client";
import {
  CIRCLE_LOOKING_FOR,
  CIRCLE_MAX_PHOTOS,
  CIRCLE_VIBES,
  vibeLabel,
  type CirclePhotoPublic,
  type CircleProfilePublic,
} from "@/lib/circle";

export default function CircleMePage() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [vibe, setVibe] = useState("single");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [discoverable, setDiscoverable] = useState(false);
  const [photos, setPhotos] = useState<CirclePhotoPublic[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setError(null);
    try {
      const res = await fetch("/api/circle/profile");
      const data = (await res.json()) as {
        profile?: CircleProfilePublic & {
          photos: Array<CirclePhotoPublic & { hidden?: boolean }>;
        };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Load failed");
        return;
      }
      const p = data.profile!;
      setUserId(p.userId);
      setDisplayName(p.displayName);
      setBio(p.bio);
      setVibe(p.vibe);
      setLookingFor(p.lookingFor || []);
      setDiscoverable(p.discoverable);
      setPhotos(p.photos || []);
    } catch {
      setError("Load failed");
    }
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleTag(tag: string) {
    setLookingFor((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/circle/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          vibe,
          lookingFor,
          discoverable,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(
          data.error === "display_name_required_for_discovery"
            ? "Add a display name before appearing in discovery."
            : data.error || "Save failed",
        );
        return;
      }
      setMsg("Saved.");
      await load();
    } catch {
      setError("Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/circle/photos", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(
          data.error === "photo_limit"
            ? `Max ${CIRCLE_MAX_PHOTOS} photos.`
            : data.error === "blob_not_configured"
              ? data.message || "Photo storage not configured."
              : data.error || "Upload failed",
        );
        return;
      }
      setMsg("Photo added.");
      await load();
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function hidePhoto(id: string, hidden: boolean) {
    await fetch("/api/circle/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId: id, hidden }),
    });
    await load();
  }

  async function deletePhoto(id: string) {
    await fetch(`/api/circle/photos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
  }

  if (!isPending && !signedIn) {
    return (
      <div className="circle-page relative min-h-screen overflow-hidden">
        <div className="circle-atmosphere" aria-hidden="true">
          <div className="circle-atmosphere-wash" />
          <div className="circle-atmosphere-grain" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-10">
          <AppNav />
          <p className="text-[#c4b7a8]">
            Sign in to manage your Circle profile.{" "}
            <Link href="/sign-in" className="text-[var(--accent-strong)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="circle-page relative min-h-screen overflow-hidden">
      <div className="circle-atmosphere" aria-hidden="true">
        <div className="circle-atmosphere-wash" />
        <div className="circle-atmosphere-grain" />
        <div className="circle-neon-bar" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-10">
        <AppNav />
        <header className="mb-8">
          <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#c49a8e]">
            Adults only · Circle
          </p>
          <h1
            className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your Circle profile
          </h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-[#c4b7a8]">
            Opt in to appear in discovery. Strong photos and a short bio help you
            get found. Max {CIRCLE_MAX_PHOTOS} photos, 4&nbsp;MB each.
          </p>
          {userId && (
            <Link
              href={`/circle/${userId}`}
              className="mt-2 inline-block text-sm text-[var(--accent-strong)] hover:underline"
            >
              Preview public view →
            </Link>
          )}
        </header>

        <form onSubmit={onSave} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--muted)]">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={48}
              className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--muted)]">Short bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={600}
              rows={4}
              className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--muted)]">Vibe</span>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
            >
              {CIRCLE_VIBES.map((v) => (
                <option key={v} value={v}>
                  {vibeLabel(v)}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="mb-2 text-sm text-[var(--muted)]">Looking for</legend>
            <div className="flex flex-wrap gap-2">
              {CIRCLE_LOOKING_FOR.map((tag) => {
                const on = lookingFor.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-sm border px-2.5 py-1 text-xs tracking-wide transition ${
                      on
                        ? "border-[var(--accent)]/50 bg-[var(--accent)]/20 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[#c4b7a8] hover:border-[var(--accent)]/30"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 text-sm text-[#c4b7a8]">
            <input
              type="checkbox"
              checked={discoverable}
              onChange={(e) => setDiscoverable(e.target.checked)}
              className="mt-1"
            />
            <span>
              Appear in Circle discovery (opt-in). Linked viewers can still see
              your profile when not discoverable.
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="rounded-sm bg-[var(--accent)]/90 px-4 py-2.5 text-sm font-medium text-[#1a120c] transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>

        <section className="mt-10 border-t border-[var(--line)] pt-8">
          <h2
            className="text-2xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Photos
          </h2>
          <p className="mt-2 text-sm text-[#c4b7a8]">
            Post pictures of yourself for Circle. Hide or delete anytime.
          </p>

          <label className="mt-4 inline-block cursor-pointer rounded-sm border border-[var(--line)] px-3 py-2 text-sm text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]">
            Add photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy || photos.length >= CIRCLE_MAX_PHOTOS}
              onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            />
          </label>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((ph) => (
              <li key={ph.id} className="relative border border-[var(--line)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ph.url}
                  alt=""
                  className={`aspect-square w-full object-cover ${ph.hidden ? "opacity-40" : ""}`}
                />
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/55 p-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => void hidePhoto(ph.id, !ph.hidden)}
                    className="flex-1 text-[#c4b7a8] hover:text-[var(--ink)]"
                  >
                    {ph.hidden ? "Show" : "Hide"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePhoto(ph.id)}
                    className="flex-1 text-[var(--danger)] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {msg && <p className="mt-4 text-sm text-[var(--ok)]">{msg}</p>}
        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </div>
  );
}
