"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  displayName,
  mainPhoto,
  type PartnerRecord,
} from "@/lib/artOfX";
import {
  buildStyledCssFallback,
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

type MatchSource = "xai" | "local" | null;

export function MusePresence({
  partner,
  variant = "rail",
}: MusePresenceProps) {
  const photo = mainPhoto(partner);
  const photos = partner.photos || [];
  const [style, setStyle] = useState<MusePresenceStyle>("realistic");
  const [generated, setGenerated] = useState<string | null>(null);
  const [matchSource, setMatchSource] = useState<MatchSource>(null);
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [photoIndex, setPhotoIndex] = useState(0);
  const autoKey = useRef<string>("");

  const livePhoto = useMemo(() => {
    if (!photos.length) return photo;
    return photos[photoIndex] || photo;
  }, [photos, photoIndex, photo]);

  useEffect(() => {
    const next = loadPresenceStyle(partner.id);
    setStyle(next);
    const cached = loadCachedPortrait(partner.id, next, mainPhoto(partner));
    setGenerated(cached);
    // v3 cache only persists xAI results — local cel is never saved.
    setMatchSource(cached ? "xai" : null);
    setGenError(null);
    setPhotoIndex(
      Math.min(
        Math.max(0, partner.mainPhotoIndex ?? 0),
        Math.max(0, photos.length - 1),
      ),
    );
    autoKey.current = "";
  }, [partner.id, partner.mainPhotoIndex, photos.length]);

  const displaySrc = useMemo(() => {
    if (style !== "realistic" && generated) return generated;
    return livePhoto;
  }, [style, generated, livePhoto]);

  const aiMatched =
    Boolean(generated) &&
    matchSource === "xai" &&
    (style === "anime" || style === "cartoon");

  const companionLiving =
    style === "cartoon" && Boolean(generated) && matchSource === "xai";

  async function applyLocalFallback(
    targetStyle: MusePresenceStyle,
    sourcePhoto: string,
    message: string,
  ): Promise<boolean> {
    if (targetStyle !== "anime" && targetStyle !== "cartoon") return false;
    const fallback = await buildStyledCssFallback(
      sourcePhoto,
      targetStyle === "cartoon" ? "cartoon" : "anime",
    );
    if (!fallback) return false;
    setGenerated(fallback);
    setMatchSource("local");
    // Do not persist provisional cel as if it were a finished Companion.
    // Leave cache empty so a later keyed session can auto-generate for real.
    setGenError(
      targetStyle === "cartoon"
        ? `${message} Provisional cel sketch only — not a finished Ani companion. Set XAI_API_KEY for the real illustrated avatar.`
        : `${message} Provisional cel sketch only — not a finished anime match. Set XAI_API_KEY for the real illustrated look.`,
    );
    return true;
  }

  async function generateStyled(
    targetStyle: MusePresenceStyle,
    sourcePhoto: string,
  ) {
    if (!sourcePhoto || targetStyle === "realistic" || busy) return;
    setBusy(true);
    setGenError(null);
    try {
      const res = await fetch("/api/art-of-x/muse-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: targetStyle,
          photo: sourcePhoto,
          name: displayName(partner),
          looks: partner.looks,
        }),
      });
      if (!res.ok) {
        let message = "Couldn’t restyle.";
        try {
          const data = (await res.json()) as {
            message?: string;
            error?: string;
          };
          if (data.error === "xai_not_configured") {
            message =
              targetStyle === "cartoon"
                ? "No XAI_API_KEY — Companion needs xAI for Ani-style anime."
                : targetStyle === "anime"
                  ? "No XAI_API_KEY — Anime match needs xAI."
                  : "No XAI_API_KEY — CSS look stays on.";
          } else if (data.message) {
            message = data.message;
          }
        } catch {
          // keep default
        }
        const used = await applyLocalFallback(
          targetStyle,
          sourcePhoto,
          message,
        );
        if (!used) setGenError(message);
        return;
      }
      const data = (await res.json()) as {
        image?: string;
        source?: string;
      };
      if (data.image) {
        setGenerated(data.image);
        setMatchSource("xai");
        saveCachedPortrait(partner.id, targetStyle, data.image, sourcePhoto);
        setGenError(null);
      }
    } catch {
      const used = await applyLocalFallback(
        targetStyle,
        sourcePhoto,
        targetStyle === "cartoon"
          ? "AI companion restyle failed."
          : "AI anime restyle failed.",
      );
      if (!used) setGenError("Restyle failed — CSS look stays on.");
    } finally {
      setBusy(false);
    }
  }

  function pickStyle(next: MusePresenceStyle) {
    setStyle(next);
    savePresenceStyle(partner.id, next);
    setGenError(null);
    if (next === "realistic") {
      setGenerated(null);
      setMatchSource(null);
      return;
    }
    const cached = loadCachedPortrait(partner.id, next, livePhoto);
    setGenerated(cached);
    setMatchSource(cached ? "xai" : null);
    const meta = MUSE_PRESENCE_STYLES.find((s) => s.id === next);
    if (
      meta?.autoGenerate &&
      livePhoto &&
      !cached &&
      autoKey.current !== `${partner.id}:${next}:${livePhoto.length}`
    ) {
      autoKey.current = `${partner.id}:${next}:${livePhoto.length}`;
      void generateStyled(next, livePhoto);
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: nx * -10, y: ny * -8 });
  }

  function onPointerLeave() {
    setParallax({ x: 0, y: 0 });
  }

  const styleLabel =
    MUSE_PRESENCE_STYLES.find((s) => s.id === style)?.label ?? style;

  return (
    <aside
      className={`muse-presence muse-presence--${variant} flex h-full flex-col`}
      aria-label={`${displayName(partner)} living portrait`}
    >
      <div
        className={`muse-presence-stage muse-presence-style-${style}${
          style === "anime" && aiMatched
            ? " muse-presence-style-anime-matched"
            : ""
        }${
          style === "cartoon" && aiMatched
            ? " muse-presence-style-cartoon-matched"
            : ""
        }${companionLiving ? " muse-presence--companion-living" : ""}`}
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
            {companionLiving && (
              <>
                <span className="muse-presence-eye-shimmer" aria-hidden />
                <span className="muse-presence-blink" aria-hidden />
              </>
            )}
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
            {busy
              ? style === "cartoon"
                ? "Summoning companion…"
                : "Matching her look…"
              : style === "realistic"
                ? "Breathing photo"
                : matchSource === "local" &&
                    (style === "cartoon" || style === "anime")
                  ? `${styleLabel} · provisional`
                  : styleLabel}
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
            onClick={() => void generateStyled(style, livePhoto)}
            disabled={busy}
            className="w-full rounded-sm border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2 text-xs font-medium text-[var(--accent-strong)] transition hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/16 disabled:opacity-50"
          >
            {busy
              ? style === "anime"
                ? "Matching anime…"
                : style === "cartoon"
                  ? "Summoning companion…"
                  : "Restyling…"
              : generated && matchSource === "xai"
                ? "Regenerate AI look"
                : style === "anime"
                  ? "Match anime to her photo"
                  : style === "cartoon"
                    ? "Make Ani companion from her photo"
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
