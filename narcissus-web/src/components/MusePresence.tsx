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
  COMPANION_CLOTHING,
  COMPANION_FEATURE_GROUPS,
  COMPANION_LOOK_STYLES,
  isNudeClothing,
  loadCompanionWardrobe,
  saveCompanionWardrobe,
  type CompanionWardrobe,
} from "@/lib/companionWardrobe";
import {
  actionsForClothing,
  pickChatReaction,
  type CompanionActionId,
  type CompanionReactionId,
  type StageFitMode,
} from "@/lib/companionMotion";
import {
  buildStyledCssFallback,
  bustCompanionClothingCache,
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
  /** Latest Muse reply — triggers a short auto reaction on Companion. */
  lastPartnerReply?: { id: string; text: string } | null;
  /** Parent hid the chat drawer — reveal more of her body. */
  chatCollapsed?: boolean;
};

type MatchSource = "xai" | "local" | null;

type WardrobeTab = "features" | "style" | "clothing";

export function MusePresence({
  partner,
  variant = "rail",
  onStyleChange,
  lastPartnerReply = null,
  chatCollapsed = false,
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
  const [fitMode, setFitMode] = useState<StageFitMode>("fit");
  const [zoom, setZoom] = useState(1);
  /** Full-stage dock: only one section open; null = calm hero. */
  const [dockSection, setDockSection] = useState<
    null | "look" | "customize" | "actions"
  >(null);
  /** Companion: optional Muse-photo likeness (off by default — design from scratch). */
  const [likenessLock, setLikenessLock] = useState(false);
  const [actionId, setActionId] = useState<CompanionActionId | null>(null);
  const [reactionId, setReactionId] = useState<CompanionReactionId | null>(
    null,
  );
  const autoKey = useRef<string>("");
  const reactionCycle = useRef(0);
  const lastReplySeen = useRef<string>("");
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      next === "cartoon",
    );
    setGenerated(cached);
    setMatchSource(cached ? "xai" : null);
    setGenError(null);
    setLikenessLock(false);
    setPhotoIndex(
      Math.min(
        Math.max(0, partner.mainPhotoIndex ?? 0),
        Math.max(0, photos.length - 1),
      ),
    );
    autoKey.current = "";
    setActionId(null);
    setReactionId(null);
    lastReplySeen.current = "";
    setDockSection(null);
    setFitMode("fit");
    setZoom(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parent callback stable enough
  }, [partner.id, partner.mainPhotoIndex, photos.length]);

  useEffect(() => {
    return () => {
      if (actionTimer.current) clearTimeout(actionTimer.current);
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, []);

  useEffect(() => {
    if (style !== "cartoon" || !lastPartnerReply?.id) return;
    if (lastPartnerReply.id === lastReplySeen.current) return;
    if (!lastPartnerReply.text.trim()) return;
    lastReplySeen.current = lastPartnerReply.id;
    const next = pickChatReaction(
      lastPartnerReply.text,
      reactionCycle.current++,
    );
    setReactionId(next);
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReactionId(null), 1600);
  }, [lastPartnerReply, style]);

  function playAction(id: CompanionActionId) {
    setActionId(id);
    if (actionTimer.current) clearTimeout(actionTimer.current);
    actionTimer.current = setTimeout(() => setActionId(null), 2200);
  }

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
    opts?: { missingKey?: boolean; clothing?: string },
  ): Promise<boolean> {
    if (targetStyle !== "anime" && targetStyle !== "cartoon") return false;
    // Companion (cartoon) — never present CSS posterize as a finished avatar.
    if (targetStyle === "cartoon") {
      setGenerated(null);
      setMatchSource(null);
      const nudeBit = isNudeClothing(opts?.clothing)
        ? " Nude needs a finished xAI illustration — never a CSS fake. Try Lingerie, or start Comfy for true nude."
        : " Companion needs a finished xAI illustration — not a provisional cel.";
      const keyBit = opts?.missingKey
        ? " Set XAI_API_KEY on Vercel Production."
        : "";
      setGenError(`${message}${nudeBit}${keyBit}`);
      return true;
    }
    const fallback = await buildStyledCssFallback(sourcePhoto, "anime");
    if (!fallback) return false;
    setGenerated(fallback);
    setMatchSource("local");
    const keyHint = opts?.missingKey
      ? " Set XAI_API_KEY on Vercel Production for the real illustrated look."
      : " Try again in a moment, or pick another Muse photo.";
    setGenError(
      `${message} Provisional cel only — not a finished anime match.${keyHint}`,
    );
    return true;
  }

  function restyleErrorMessage(
    targetStyle: MusePresenceStyle,
    data: {
      message?: string;
      error?: string;
      status?: number;
      detail?: string;
    },
  ): { message: string; missingKey: boolean } {
    const err = data.error || "";
    if (err === "xai_not_configured") {
      return {
        missingKey: true,
        message:
          targetStyle === "cartoon"
            ? "No XAI_API_KEY — Companion needs xAI for Ani-style anime."
            : targetStyle === "anime"
              ? "No XAI_API_KEY — Anime match needs xAI."
              : "No XAI_API_KEY — CSS look stays on.",
      };
    }
    if (err === "xai_image_failed" || err === "nude_refused") {
      const status = data.status;
      const detail = (data.detail || "").toLowerCase();
      if (
        detail.includes("spending limit") ||
        detail.includes("available credits") ||
        detail.includes("permission-denied")
      ) {
        return {
          missingKey: false,
          message:
            "xAI image credits/spending limit reached — top up or raise the limit at console.x.ai, then regenerate Companion.",
        };
      }
      if (status === 401 || status === 403) {
        return {
          missingKey: false,
          message:
            "xAI rejected the API key — rotate XAI_API_KEY in Vercel Project → Settings → Environment Variables → Production, then redeploy.",
        };
      }
      if (
        err === "nude_refused" ||
        detail.includes("content") ||
        detail.includes("safety") ||
        detail.includes("moderation") ||
        detail.includes("content-moderated")
      ) {
        return {
          missingKey: false,
          message:
            data.message ||
            "xAI blocked Nude (moderation). Lingerie still works — or start the Comfy/RunPod undress pod for true nude. Never faking nude.",
        };
      }
      if (detail.includes("too small") || detail.includes("dimensions")) {
        return {
          missingKey: false,
          message: "Muse photo is too small for xAI — use a clearer full-body photo.",
        };
      }
      if (detail.includes("too large") || detail.includes("payload")) {
        return {
          missingKey: false,
          message: "Muse photo is too large for restyle — try a smaller upload.",
        };
      }
      return {
        missingKey: false,
        message: "xAI image restyle failed — Companion API is configured; retry shortly.",
      };
    }
    if (err === "empty_image") {
      return {
        missingKey: false,
        message: "xAI returned an empty image — retry Companion restyle.",
      };
    }
    if (err === "photo_required" || err === "photo_too_large" || err === "style_required") {
      return {
        missingKey: false,
        message: data.message || "Couldn’t restyle — check the Muse photo and Look.",
      };
    }
    if (data.message) {
      return { missingKey: false, message: data.message };
    }
    return { missingKey: false, message: "Couldn’t restyle." };
  }

  async function generateStyled(
    targetStyle: MusePresenceStyle,
    sourcePhoto: string | null,
    nextWardrobe: CompanionWardrobe = wardrobe,
    opts?: { forceMode?: "generate" | "adjust" | "likeness" },
  ) {
    if (targetStyle === "realistic" || busy) return;
    const isCompanion = targetStyle === "cartoon";
    if (!isCompanion && !sourcePhoto) return;

    let mode: "generate" | "adjust" | "likeness" = "likeness";
    if (isCompanion) {
      if (opts?.forceMode) {
        mode = opts.forceMode;
      } else if (likenessLock && sourcePhoto) {
        mode = "likeness";
      } else if (generated && matchSource === "xai") {
        mode = "adjust";
      } else {
        mode = "generate";
      }
    }

    setBusy(true);
    setGenError(null);
    try {
      const res = await fetch("/api/art-of-x/muse-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: targetStyle,
          photo: sourcePhoto || undefined,
          priorImage:
            isCompanion && mode === "adjust" && generated
              ? generated
              : undefined,
          mode: isCompanion ? mode : undefined,
          name: displayName(partner),
          looks: partner.looks,
          wardrobe: isCompanion ? nextWardrobe : undefined,
        }),
      });
      if (!res.ok) {
        let parsed: {
          message?: string;
          error?: string;
          status?: number;
          detail?: string;
        } = {};
        try {
          parsed = (await res.json()) as typeof parsed;
        } catch {
          // keep empty
        }
        const { message, missingKey } = restyleErrorMessage(targetStyle, parsed);
        if (isCompanion) {
          // Never CSS-fake a companion (esp. nude)
          setGenError(message);
          if (parsed.error === "nude_refused" && nextWardrobe.clothing === "nude") {
            // keep last clothed companion on stage if we have one
          } else if (!generated) {
            await applyLocalFallback(targetStyle, sourcePhoto || "", message, {
              missingKey,
              clothing: nextWardrobe.clothing,
            });
          }
          return;
        }
        const used = await applyLocalFallback(
          targetStyle,
          sourcePhoto || "",
          message,
          { missingKey, clothing: nextWardrobe.clothing },
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
          isCompanion ? nextWardrobe : null,
          isCompanion && mode !== "likeness",
        );
        setGenError(null);
      } else {
        const used = await applyLocalFallback(
          targetStyle,
          sourcePhoto || "",
          "xAI returned no image.",
          { missingKey: false, clothing: nextWardrobe.clothing },
        );
        if (!used) setGenError("xAI returned no image — retry Companion.");
      }
    } catch {
      const used = await applyLocalFallback(
        targetStyle,
        sourcePhoto || "",
        isCompanion
          ? "AI companion generation failed (network or timeout)."
          : "AI anime restyle failed (network or timeout).",
        { missingKey: false, clothing: nextWardrobe.clothing },
      );
      if (!used) setGenError("Generation failed — try again.");
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
    const scratch = next === "cartoon";
    const cached = loadCachedPortrait(
      partner.id,
      next,
      livePhoto,
      next === "cartoon" ? wardrobe : null,
      scratch,
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
    const clothingChanged =
      typeof patch.clothing === "string" && patch.clothing !== wardrobe.clothing;
    setWardrobe(next);
    saveCompanionWardrobe(partner.id, next);
    if (style !== "cartoon") return;
    if (clothingChanged) {
      bustCompanionClothingCache(partner.id, livePhoto, true);
      // Keep current illustration on stage while regenerating (adjust path).
      setGenError(
        isNudeClothing(next.clothing)
          ? "Updating Companion to Nude…"
          : "Updating Companion outfit…",
      );
      void generateStyled("cartoon", livePhoto, next, {
        forceMode:
          generated && matchSource === "xai"
            ? "adjust"
            : likenessLock && livePhoto
              ? "likeness"
              : "generate",
      });
      return;
    }
    const cached = loadCachedPortrait(
      partner.id,
      "cartoon",
      livePhoto,
      next,
      true,
    );
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
      ? COMPANION_FEATURE_GROUPS
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

  const isFullCompanion = variant === "full" && style === "cartoon";
  const companionActions = actionsForClothing(wardrobe.clothing);
  const motionClass = [
    actionId ? `muse-motion--${actionId}` : "",
    reactionId ? `muse-react--${reactionId}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const statusLine = busy
    ? style === "cartoon"
      ? "Generating companion…"
      : "Matching look…"
    : style === "realistic"
      ? "Photo"
      : matchSource === "xai" && style === "cartoon"
        ? `Companion · ${wardrobe.clothing}`
        : matchSource === "local"
          ? `${styleLabel} · unfinished`
          : styleLabel;

  function toggleDock(section: "look" | "customize" | "actions") {
    setDockSection((cur) => (cur === section ? null : section));
  }

  const chipClass = (selected: boolean, danger = false) =>
    `rounded-sm border px-2.5 py-1.5 text-left text-[11px] transition disabled:opacity-50 ${
      selected
        ? danger
          ? "border-[var(--danger)]/55 bg-[var(--danger)]/12 text-[#f0c4b8]"
          : "border-[var(--glow)]/50 bg-[var(--glow)]/10 text-[var(--ink)]"
        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--soft)]"
    }`;

  const generateLabel = busy
    ? style === "anime"
      ? "Matching…"
      : style === "cartoon"
        ? generated && matchSource === "xai"
          ? "Adjusting…"
          : "Designing…"
        : "Restyling…"
    : style === "cartoon"
      ? generated && matchSource === "xai"
        ? likenessLock
          ? "Regenerate with likeness"
          : "Adjust Companion"
        : "Generate Companion"
      : generated && matchSource === "xai"
        ? "Regenerate"
        : style === "anime"
          ? "Match anime"
          : "Generate look";

  return (
    <aside
      className={`muse-presence muse-presence--${variant} flex h-full flex-col${
        chatCollapsed ? " muse-presence--chat-collapsed" : ""
      }${dockSection ? " muse-presence--dock-open" : ""}`}
      aria-label={`${displayName(partner)} living portrait`}
      data-fit={isFullCompanion ? fitMode : undefined}
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
        }${companionLiving ? " muse-presence--companion-living" : ""}${
          isFullCompanion ? ` muse-presence-stage--fit-${fitMode}` : ""
        } ${motionClass}`.trim()}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className="muse-presence-glow" aria-hidden />
        <div
          className={`muse-presence-viewport${
            isFullCompanion ? " muse-presence-viewport--pan" : ""
          }`}
        >
          <div
            className="muse-presence-zoom"
            style={
              isFullCompanion
                ? { transform: `scale(${zoom})`, transformOrigin: "center bottom" }
                : undefined
            }
          >
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
                  {isFullCompanion
                    ? "Design your Companion from traits — Generate creates a new anime girl. Optional: lock likeness to a Muse photo."
                    : "Add photos on Muses — this panel becomes her living portrait."}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="muse-presence-veil" aria-hidden />
        {busy && (
          <div className="muse-presence-loading" role="status">
            <span className="muse-presence-loading-dot" aria-hidden />
            Generating illustrated companion…
          </div>
        )}
        {!isFullCompanion && (
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
              {statusLine}
            </p>
          </div>
        )}
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

      {isFullCompanion ? (
        <div className="muse-companion-dock">
          <div className="muse-companion-dock-head">
            <div className="min-w-0">
              <p className="muse-companion-dock-kicker">Companion</p>
              <p
                className="truncate text-base text-[var(--ink)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {displayName(partner)}
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {statusLine}
              </p>
            </div>
            <div className="muse-companion-dock-fit" role="group" aria-label="Stage fit">
              <button
                type="button"
                className={fitMode === "fit" ? "is-active" : undefined}
                aria-pressed={fitMode === "fit"}
                onClick={() => setFitMode("fit")}
              >
                Fit
              </button>
              <button
                type="button"
                className={fitMode === "fill" ? "is-active" : undefined}
                aria-pressed={fitMode === "fill"}
                onClick={() => setFitMode("fill")}
              >
                Fill
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.min(1.6, Number((z + 0.12).toFixed(2))))
                }
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(1, Number((z - 0.12).toFixed(2))))
                }
                aria-label="Zoom out"
                disabled={zoom <= 1}
              >
                −
              </button>
            </div>
          </div>

          <div className="muse-companion-dock-tabs" role="tablist" aria-label="Companion controls">
            {(
              [
                ["look", "Look"],
                ["customize", "Customize"],
                ["actions", "Actions"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={dockSection === id}
                onClick={() => toggleDock(id)}
                className={dockSection === id ? "is-active" : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          {dockSection === "look" && (
            <div className="muse-companion-dock-body" role="tabpanel">
              <div className="grid grid-cols-2 gap-1.5">
                {MUSE_PRESENCE_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.blurb}
                    onClick={() => pickStyle(s.id)}
                    className={chipClass(style === s.id)}
                  >
                    <span className="block font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {dockSection === "customize" && (
            <div className="muse-companion-dock-body space-y-2" role="tabpanel">
              <div className="flex gap-1" role="tablist" aria-label="Customize">
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
                    className={`flex-1 rounded-sm border px-2 py-1.5 text-[11px] font-medium ${
                      wardrobeTab === id
                        ? "border-[var(--glow)]/45 bg-[var(--glow)]/10 text-[var(--ink)]"
                        : "border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {wardrobeTab === "features" && (
                <p className="text-[10px] text-[var(--muted)]">
                  Pick traits for your Companion. Natural = defaults (or Muse
                  likeness when locked).
                </p>
              )}
              {featureChips.map((group) => (
                <div key={group.key} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--soft)]">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.options.map((opt) => {
                      const selected =
                        wardrobe[group.key as keyof CompanionWardrobe] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          title={opt.hint}
                          disabled={busy}
                          onClick={() =>
                            applyWardrobePatch({
                              [group.key]: opt.id,
                            } as Partial<CompanionWardrobe>)
                          }
                          className={chipClass(selected, opt.id === "nude")}
                        >
                          {"swatch" in opt && typeof opt.swatch === "string" ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-sm border border-white/20"
                                style={{ background: opt.swatch }}
                                aria-hidden
                              />
                              {opt.label}
                            </span>
                          ) : (
                            opt.label
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {dockSection === "actions" && (
            <div className="muse-companion-dock-body" role="tabpanel">
              <div className="flex flex-wrap gap-1.5">
                {companionActions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={chipClass(actionId === a.id)}
                    onClick={() => playAction(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="muse-companion-likeness flex items-start gap-2 px-0.5 text-[11px] text-[var(--muted)]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={likenessLock}
              disabled={!livePhoto || busy}
              onChange={(e) => setLikenessLock(e.target.checked)}
            />
            <span>
              <span className="font-medium text-[var(--soft)]">
                Likeness from photo
              </span>
              {livePhoto
                ? " — optional lock to this Muse’s photo (secondary)."
                : " — add a Muse photo first to enable."}
            </span>
          </label>
          <button
            type="button"
            onClick={() =>
              void generateStyled(style, livePhoto, wardrobe, {
                forceMode: likenessLock && livePhoto
                  ? "likeness"
                  : generated && matchSource === "xai"
                    ? "adjust"
                    : "generate",
              })
            }
            disabled={busy || (likenessLock && !livePhoto)}
            className="muse-companion-dock-cta"
          >
            {generateLabel}
          </button>
          {genError && (
            <p className="muse-companion-dock-error">{genError}</p>
          )}
        </div>
      ) : (
        <div className="muse-presence-looks mt-4 space-y-2.5 border-t border-[var(--line)] pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Look
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
                className={chipClass(style === s.id)}
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
              onClick={() => void generateStyled(style, livePhoto, wardrobe)}
              disabled={busy}
              className="w-full rounded-sm border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2 text-xs font-medium text-[var(--accent-strong)] transition hover:border-[var(--accent)]/60 disabled:opacity-50"
            >
              {generateLabel}
            </button>
          )}
          {genError && (
            <p className="text-[11px] leading-snug text-[var(--accent)]">
              {genError}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
