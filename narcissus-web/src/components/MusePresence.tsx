"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";
import {
  displayName,
  mainPhoto,
  type PartnerRecord,
} from "@/lib/artOfX";
import {
  loadCachedPortrait,
  loadPresenceStyle,
  MUSE_PRESENCE_STYLES,
  saveCachedPortrait,
  savePresenceStyle,
  type MusePresenceStyle,
} from "@/lib/musePresence";

type MusePresenceProps = {
  partner: PartnerRecord;
  /** Fill the chat hero rail (taller, sticky on desktop). */
  variant?: "rail" | "compact";
};

export function MusePresence({
  partner,
  variant = "rail",
}: MusePresenceProps) {
  const photo = mainPhoto(partner);
  const photos = partner.photos || [];
  const [style, setStyle] = useState<MusePresenceStyle>("realistic");
  const [generated, setGenerated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    const next = loadPresenceStyle(partner.id);
    setStyle(next);
    setGenerated(loadCachedPortrait(partner.id, next));
    setGenError(null);
    setPhotoIndex(
      Math.min(
        Math.max(0, partner.mainPhotoIndex ?? 0),
        Math.max(0, photos.length - 1),
      ),
    );
  }, [partner.id, partner.mainPhotoIndex, photos.length]);

  const livePhoto = useMemo(() => {
    if (!photos.length) return photo;
    return photos[photoIndex] || photo;
  }, [photos, photoIndex, photo]);

  const displaySrc = useMemo(() => {
    if (style !== "realistic" && generated) return generated;
    return livePhoto;
  }, [style, generated, livePhoto]);

  function pickStyle(next: MusePresenceStyle) {
    setStyle(next);
    savePresenceStyle(partner.id, next);
    setGenError(null);
    if (next === "realistic") {
      setGenerated(null);
      return;
    }
    setGenerated(loadCachedPortrait(partner.id, next));
  }

  async function generateStyled() {
    if (!livePhoto || style === "realistic" || busy) return;
    setBusy(true);
    setGenError(null);
    try {
      const res = await fetch("/api/art-of-x/muse-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          photo: livePhoto,
          name: displayName(partner),
          looks: partner.looks,
        }),
      });
      if (!res.ok) {
        let message = "Couldn’t restyle — using live photo filters.";
        try {
          const data = (await res.json()) as {
            message?: string;
            error?: string;
          };
          if (data.error === "xai_not_configured") {
            message = "Add XAI_API_KEY for AI restyles — filters still work.";
          } else if (data.message) {
            message = data.message;
          }
        } catch {
          // keep default
        }
        setGenError(message);
        return;
      }
      const data = (await res.json()) as { image?: string };
      if (data.image) {
        setGenerated(data.image);
        saveCachedPortrait(partner.id, style, data.image);
      }
    } catch {
      setGenError("Restyle failed — CSS look stays on.");
    } finally {
      setBusy(false);
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setParallax({ x: nx * 8, y: ny * 5 });
  }

  function onPointerLeave() {
    setParallax({ x: 0, y: 0 });
  }

  return (
    <aside
      className={`muse-presence muse-presence--${variant} flex h-full flex-col`}
      aria-label={`${displayName(partner)} living portrait`}
    >
      <div
        className={`muse-presence-stage muse-presence-style-${style}`}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className="muse-presence-glow" aria-hidden />
        {displaySrc ? (
          <div
            className="muse-presence-parallax"
            style={{
              transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt=""
              className="muse-presence-photo"
              draggable={false}
            />
          </div>
        ) : (
          <div className="muse-presence-empty">
            <div className="muse-presence-silhouette" aria-hidden />
            <span
              className="relative z-[1] text-5xl font-semibold text-[var(--ink)]/85"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {partner.name.slice(0, 1).toUpperCase()}
            </span>
            <p className="relative z-[1] mt-3 max-w-[14rem] text-center text-xs leading-relaxed text-[var(--soft)]">
              Add photos on Muses — this panel becomes her living portrait.
            </p>
          </div>
        )}
        <div className="muse-presence-veil" aria-hidden />
        <div className="muse-presence-nameplate">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--glow)]/90">
            Living Muse
          </p>
          <p
            className="mt-1 text-2xl leading-tight text-[var(--ink)] sm:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {displayName(partner)}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--soft)]">
            {style === "realistic"
              ? "Breathing photo"
              : MUSE_PRESENCE_STYLES.find((s) => s.id === style)?.label}
          </p>
        </div>
      </div>

      {photos.length > 1 && style === "realistic" && (
        <div
          className="muse-presence-thumbs flex gap-2 overflow-x-auto px-1 pt-3"
          role="list"
          aria-label="Portrait photos"
        >
          {photos.map((src, i) => (
            <button
              key={i}
              type="button"
              role="listitem"
              onClick={() => setPhotoIndex(i)}
              className={`h-12 w-12 shrink-0 overflow-hidden border transition ${
                i === photoIndex
                  ? "border-[var(--glow)]/60"
                  : "border-[var(--line)] opacity-75 hover:opacity-100"
              }`}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === photoIndex ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="muse-presence-looks mt-4 space-y-2.5 border-t border-[var(--line)] pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
            Look
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            Pick a style for her
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-1.5"
          role="group"
          aria-label="Portrait style"
        >
          {MUSE_PRESENCE_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickStyle(s.id)}
              title={s.blurb}
              className={`rounded-sm border px-2.5 py-2 text-left text-xs transition ${
                style === s.id
                  ? "border-[var(--glow)]/55 bg-[var(--glow)]/12 text-[var(--ink)] shadow-[0_0_20px_rgba(0,229,255,0.08)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]/45 hover:text-[var(--soft)]"
              }`}
            >
              <span className="block font-medium">{s.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug opacity-75">
                {s.blurb}
              </span>
            </button>
          ))}
        </div>
        {style !== "realistic" && livePhoto && (
          <button
            type="button"
            onClick={() => void generateStyled()}
            disabled={busy}
            className="w-full rounded-sm border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2 text-xs font-medium text-[var(--accent-strong)] transition hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/16 disabled:opacity-50"
          >
            {busy
              ? "Restyling…"
              : generated
                ? "Regenerate AI look"
                : "Generate AI look"}
          </button>
        )}
        {genError && (
          <p className="text-[11px] leading-snug text-[var(--accent)]">
            {genError}
          </p>
        )}
      </div>
    </aside>
  );
}
