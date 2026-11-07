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
  COMPANION_BODY,
  COMPANION_CLOTHING,
  COMPANION_EXPRESSION,
  COMPANION_EYES,
  COMPANION_HAIR,
  COMPANION_LOOK_STYLES,
  loadCompanionWardrobe,
  saveCompanionWardrobe,
  type CompanionWardrobe,
} from "@/lib/companionWardrobe";
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
  variant?: "rail" | "compact" | "full";
  /** Notify parent when Look changes (for Companion full-stage layout). */
  onStyleChange?: (style: MusePresenceStyle) => void;
};

type MatchSource = "xai" | "local" | null;

type WardrobeTab = "features" | "style" | "clothing";

export function MusePresence({
  partner,
  variant = "rail",
  onStyleChange,
}: MusePresenceProps) {
  const photo = mainPhoto(partner);
  const photos = partner.photos || [];
  const [style, setStyle] = useState<MusePresenceStyle>("realistic");
  const [wardrobe, setWardrobe] = useState<CompanionWardrobe>(() =>
    loadCompanionWardrobe(partner.id),
  );
  const [wardrobeTab, setWardrobeTab] = useState<WardrobeTab>("clothing");
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
    const nextWardrobe = loadCompanionWardrobe(partner.id);
    setStyle(next);
    setWardrobe(nextWardrobe);
    onStyleChange?.(next);
    const cached = loadCachedPortrait(
      partner.id,
      next,
      mainPhoto(partner),
      next === "cartoon" ? nextWardrobe : null,
    );
    setGenerated(cached);
    setMatchSource(cached ? "xai" : null);
    setGenError(null);
    setPhotoIndex(
      Math.min(
        Math.max(0, partner.mainPhotoIndex ?? 0),
        Math.max(0, photos.length - 1),
      ),
    );
    autoKey.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parent callback stable enough
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
    nextWardrobe: CompanionWardrobe = wardrobe,
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
          wardrobe: targetStyle === "cartoon" ? nextWardrobe : undefined,
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
        saveCachedPortrait(
          partner.id,
          targetStyle,
          data.image,
          sourcePhoto,
          targetStyle === "cartoon" ? nextWardrobe : null,
        );
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
    onStyleChange?.(next);
    setGenError(null);
    if (next === "realistic") {
      setGenerated(null);
      setMatchSource(null);
      return;
    }
    const cached = loadCachedPortrait(
      partner.id,
      next,
      livePhoto,
      next === "cartoon" ? wardrobe : null,
    );
    setGenerated(cached);
    setMatchSource(cached ? "xai" : null);
    const meta = MUSE_PRESENCE_STYLES.find((s) => s.id === next);
    const autoToken = `${partner.id}:${next}:${livePhoto?.length || 0}:${next === "cartoon" ? JSON.stringify(wardrobe) : ""}`;
    if (
      meta?.autoGenerate &&
      livePhoto &&
      !cached &&
      autoKey.current !== autoToken
    ) {
      autoKey.current = autoToken;
      void generateStyled(next, livePhoto, wardrobe);
    }
  }

  function applyWardrobePatch(patch: Partial<CompanionWardrobe>) {
    const next = { ...wardrobe, ...patch };
    setWardrobe(next);
    saveCompanionWardrobe(partner.id, next);
    if (style !== "cartoon" || !livePhoto) return;
    const cached = loadCachedPortrait(partner.id, "cartoon", livePhoto, next);
    if (cached) {
      setGenerated(cached);
      setMatchSource("xai");
      setGenError(null);
      return;
    }
    void generateStyled("cartoon", livePhoto, next);
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

  const featureChips =
    wardrobeTab === "features"
      ? [
          { title: "Hair", options: COMPANION_HAIR, key: "hair" as const },
          { title: "Eyes", options: COMPANION_EYES, key: "eyes" as const },
          { title: "Body", options: COMPANION_BODY, key: "body" as const },
          {
            title: "Expression",
            options: COMPANION_EXPRESSION,
            key: "expression" as const,
          },
        ]
      : wardrobeTab === "style"
        ? [
            {
              title: "Anime look",
              options: COMPANION_LOOK_STYLES,
              key: "look" as const,
            },
          ]
        : [
            {
              title: "Outfit",
              options: COMPANION_CLOTHING,
              key: "clothing" as const,
            },
          ];

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
                  : style === "cartoon"
                    ? `${styleLabel} · ${wardrobe.clothing}`
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

        {style === "cartoon" && (
          <div className="muse-companion-customize space-y-2 border-t border-[var(--line)] pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--glow)]/90">
                Customize
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                Adults 18+ · Muse identity locked
              </p>
            </div>
            <div
              className="flex gap-1"
              role="tablist"
              aria-label="Companion customize"
            >
              {(
                [
                  ["features", "Features"],
                  ["style", "Style"],
                  ["clothing", "Clothing"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={wardrobeTab === id}
                  onClick={() => setWardrobeTab(id)}
                  className={`flex-1 rounded-sm border px-2 py-1.5 text-[11px] font-medium transition ${
                    wardrobeTab === id
                      ? "border-[var(--glow)]/50 bg-[var(--glow)]/10 text-[var(--ink)]"
                      : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--soft)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {featureChips.map((group) => (
              <div key={group.key} className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--soft)]">
                  {group.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((opt) => {
                    const selected = wardrobe[group.key] === opt.id;
                    const isNude = opt.id === "nude";
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.hint}
                        disabled={busy}
                        onClick={() =>
                          applyWardrobePatch({ [group.key]: opt.id })
                        }
                        className={`rounded-sm border px-2 py-1.5 text-left text-[11px] transition disabled:opacity-50 ${
                          selected
                            ? isNude
                              ? "border-[var(--danger)]/55 bg-[var(--danger)]/15 text-[#f0c4b8]"
                              : "border-[var(--accent)]/55 bg-[var(--accent)]/12 text-[var(--ink)]"
                            : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--soft)]"
                        }`}
                      >
                        <span className="block font-medium">{opt.label}</span>
                        <span className="mt-0.5 block text-[9px] leading-snug opacity-75">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {wardrobe.clothing === "nude" && (
              <p className="text-[10px] leading-snug text-[#f0c4b8]/90">
                Nude is adults 18+ only — explicit illustrated companion, same
                Muse face identity.
              </p>
            )}
          </div>
        )}

        {style !== "realistic" && livePhoto && (
          <button
            type="button"
            onClick={() => void generateStyled(style, livePhoto, wardrobe)}
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
