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
};

export function MusePresence({ partner }: MusePresenceProps) {
  const photo = mainPhoto(partner);
  const [style, setStyle] = useState<MusePresenceStyle>("realistic");
  const [generated, setGenerated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const next = loadPresenceStyle(partner.id);
    setStyle(next);
    setGenerated(loadCachedPortrait(partner.id, next));
    setGenError(null);
  }, [partner.id]);

  const displaySrc = useMemo(() => {
    if (style !== "realistic" && generated) return generated;
    return photo;
  }, [style, generated, photo]);

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
    if (!photo || style === "realistic" || busy) return;
    setBusy(true);
    setGenError(null);
    try {
      const res = await fetch("/api/art-of-x/muse-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          photo,
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
    setParallax({ x: nx * 6, y: ny * 4 });
  }

  function onPointerLeave() {
    setParallax({ x: 0, y: 0 });
  }

  return (
    <aside className="muse-presence flex flex-col">
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
            <span
              className="text-5xl font-semibold text-[var(--ink)]/80"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {partner.name.slice(0, 1).toUpperCase()}
            </span>
            <p className="mt-3 max-w-[12rem] text-center text-xs leading-relaxed text-[var(--soft)]">
              Add photos on Muses for a living portrait here.
            </p>
          </div>
        )}
        <div className="muse-presence-veil" aria-hidden />
        <div className="muse-presence-nameplate">
          <p
            className="text-lg leading-tight text-[var(--ink)] sm:text-xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {displayName(partner)}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--soft)]">
            {style === "realistic"
              ? "Living photo"
              : MUSE_PRESENCE_STYLES.find((s) => s.id === style)?.label}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 px-0.5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          Look
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Portrait style">
          {MUSE_PRESENCE_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickStyle(s.id)}
              title={s.blurb}
              className={`rounded-sm border px-2.5 py-1 text-xs transition ${
                style === s.id
                  ? "border-[var(--glow)]/50 bg-[var(--glow)]/10 text-[var(--ink)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--soft)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {style !== "realistic" && photo && (
          <button
            type="button"
            onClick={() => void generateStyled()}
            disabled={busy}
            className="w-full rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)]/60 px-3 py-1.5 text-xs text-[var(--soft)] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)] disabled:opacity-50"
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
