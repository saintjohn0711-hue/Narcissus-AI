"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACT_GROUPS,
  displayName,
  genderLabel,
  mainPhoto,
  normalizeDoneActs,
  normalizeKinks,
  normalizePairedWith,
  pairedMusesFor,
  samePartnerId,
  type PartnerRecord,
} from "@/lib/artOfX";
import { normalizeMemories } from "@/lib/museChatMemory";

type PartnerCardProps = {
  partner: PartnerRecord;
  /** Full roster — resolve paired Muse names + pairing picker */
  roster?: PartnerRecord[];
  pairingOpen?: boolean;
  onTogglePairing?: () => void;
  onPairWith?: (otherId: number) => void;
  /** Remove a “been together” link from this Muse */
  onUnpair?: (otherId: number) => void;
  onEdit: () => void;
  onRemove: () => void;
  /** Persist featured/main photo when the viewer picks one */
  onSelectPhoto?: (index: number) => void;
  /** Inline act toggle — persists without opening full editor */
  onToggleAct?: (act: string) => void;
  /** Manual sort controls (Your order) */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

type Panel = "none" | "acts" | "details";

function SoftList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <p className="text-[13px] leading-[1.55] text-[#e8dfd2]">
      {items.map((item, i) => (
        <span key={`${item}-${i}`}>
          {i > 0 && (
            <span className="mx-1.5 text-[var(--muted)]/55" aria-hidden>
              ·
            </span>
          )}
          <span>{item}</span>
        </span>
      ))}
    </p>
  );
}

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function PhotoLightbox({
  photos,
  index,
  name,
  onClose,
  onChange,
  onSetMain,
  isMain,
}: {
  photos: string[];
  index: number;
  name: string;
  onClose: () => void;
  onChange: (index: number) => void;
  onSetMain?: (index: number) => void;
  isMain?: boolean;
}) {
  const titleId = useId();
  const safeIndex = Math.min(Math.max(0, index), photos.length - 1);
  const src = photos[safeIndex];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && photos.length > 1) {
        onChange((safeIndex - 1 + photos.length) % photos.length);
      }
      if (e.key === "ArrowRight" && photos.length > 1) {
        onChange((safeIndex + 1) % photos.length);
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onChange, photos.length, safeIndex]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="partner-lightbox fixed inset-0 z-50 flex items-center justify-center bg-[#050403]/88 px-4 py-8 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-3xl flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <p
            id={titleId}
            className="truncate text-sm text-[#c4b7a8]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {name}
            <span className="ml-2 text-xs tracking-[0.16em] text-[var(--muted)]">
              {safeIndex + 1} / {photos.length}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[#c4b7a8] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)]"
          >
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0c0a09] ring-1 ring-[var(--line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[min(78vh,820px)] w-full object-contain"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {photos.length > 1 ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onChange((safeIndex - 1 + photos.length) % photos.length)
                }
                className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => onChange((safeIndex + 1) % photos.length)}
                className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
              >
                Next
              </button>
            </div>
          ) : (
            <span />
          )}
          {onSetMain && (
            <button
              type="button"
              onClick={() => onSetMain(safeIndex)}
              disabled={isMain}
              className="rounded-sm border border-[var(--accent)]/45 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[var(--accent-strong)] transition hover:border-[var(--accent)] disabled:cursor-default disabled:opacity-50"
            >
              {isMain ? "Main photo" : "Set as main"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dense Muse list row — ~two lines of scan info, expandable activity log + details.
 * Designed for long partner ledgers (many Muses × what you did with each).
 */
export function PartnerCard({
  partner: p,
  roster = [],
  pairingOpen = false,
  onTogglePairing,
  onPairWith,
  onUnpair,
  onEdit,
  onRemove,
  onSelectPhoto,
  onToggleAct,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: PartnerCardProps) {
  const photos = p.photos || [];
  const mainIdx = Math.min(
    Math.max(0, p.mainPhotoIndex ?? 0),
    Math.max(0, photos.length - 1),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>("none");
  const [actQuery, setActQuery] = useState("");
  const actsPanelId = useId();
  const detailsPanelId = useId();

  useEffect(() => {
    setPanel("none");
    setActQuery("");
  }, [p.id]);

  const thumb = mainPhoto(p);
  const kinkTags = normalizeKinks(p.kinks).map((k) => k.tag);
  const paired = pairedMusesFor(p, roster);
  const pairedIds = new Set(
    normalizePairedWith(p.pairedWith, p.id).map((id) => Number(id)),
  );
  const pairCandidates = roster.filter(
    (other) =>
      !samePartnerId(other.id, p.id) && !pairedIds.has(Number(other.id)),
  );
  const memoryCount = normalizeMemories(p.memories).length;
  const doneActs = normalizeDoneActs(p.doneActs);
  const actCount = doneActs.length;

  const metaBits = [
    p.type,
    genderLabel(p.gender),
    photos.length
      ? `${photos.length} photo${photos.length === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean) as string[];

  const previewActs = useMemo(() => doneActs.slice(0, 4), [doneActs]);
  const moreActs = Math.max(0, actCount - previewActs.length);

  const hasLooks = Boolean(p.looks?.trim());
  const hasHistory = Boolean(p.history?.trim());
  const hasKinks = kinkTags.length > 0;
  const hasDynTags = p.dynTags.length > 0;
  const hasDynamics = Boolean(p.dynamics?.trim());
  const hasDynBlock = hasDynTags || hasDynamics;
  const hasNotes = Boolean(p.notes?.trim());
  const hasPaired = paired.length > 0;
  const hasDetails =
    hasLooks ||
    hasHistory ||
    hasKinks ||
    hasDynBlock ||
    hasNotes ||
    hasPaired ||
    photos.length > 1 ||
    Boolean(onTogglePairing);
  const initial = (p.name || "?").trim().slice(0, 1).toUpperCase();

  const filteredActGroups = useMemo(() => {
    const q = actQuery.trim().toLowerCase();
    if (!q) return ACT_GROUPS;
    return ACT_GROUPS.map((g) => ({
      cat: g.cat,
      tags: g.tags.filter(
        (t) =>
          t.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q),
      ),
    })).filter((g) => g.tags.length > 0);
  }, [actQuery]);

  const openLightbox = useCallback(() => {
    if (!photos.length) return;
    setLightboxIndex(mainIdx);
  }, [photos.length, mainIdx]);

  const setAsMain = useCallback(
    (index: number) => {
      if (!photos.length) return;
      const i = Math.min(Math.max(0, index), photos.length - 1);
      onSelectPhoto?.(i);
    },
    [onSelectPhoto, photos.length],
  );

  function togglePanel(next: Panel) {
    setPanel((cur) => (cur === next ? "none" : next));
  }

  return (
    <article
      className={`partner-card muse-row overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/40 ${
        panel !== "none" ? "muse-row--open" : ""
      }`}
      data-testid="muse-row"
    >
      {/* Dense two-row scan surface */}
      <div className="muse-row-core flex gap-3 px-3 py-2.5 sm:gap-3.5 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={openLightbox}
          disabled={!thumb}
          className="muse-row-thumb relative h-14 w-14 shrink-0 overflow-hidden bg-[#0c0a09] ring-1 ring-[var(--line)] transition enabled:hover:ring-[var(--glow)]/45 disabled:cursor-default sm:h-[3.75rem] sm:w-[3.75rem]"
          aria-label={
            thumb ? `Open photo of ${p.name}` : `${p.name} — no photo`
          }
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-lg text-[var(--accent-strong)]/80"
              style={{ fontFamily: "var(--font-display), serif" }}
              aria-hidden
            >
              {initial}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {/* Row 1 — identity + actions */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <h2
                className="truncate text-[1.05rem] leading-tight text-[var(--ink)] sm:text-[1.15rem]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {p.name}
              </h2>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {metaBits.join(" · ")}
                {hasPaired
                  ? ` · together ${paired.length}`
                  : ""}
              </p>
            </div>
            <div className="muse-row-actions flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
              {(onMoveUp || onMoveDown) && (
                <span className="flex gap-1.5 text-[var(--muted)]">
                  <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={!canMoveUp}
                    className="underline-offset-2 hover:text-[var(--ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={!canMoveDown}
                    className="underline-offset-2 hover:text-[var(--ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </span>
              )}
              <Link
                href={`/art-of-x/chat?muse=${p.id}`}
                className="text-[var(--glow-mid)] underline-offset-2 hover:text-[var(--glow)] hover:underline"
              >
                Chat
              </Link>
              <Link
                href={`/art-of-x/partners/${p.id}/memories`}
                className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
                data-testid="muse-card-memories-link"
              >
                Mem{memoryCount ? ` ${memoryCount}` : ""}
              </Link>
              <button
                type="button"
                onClick={onEdit}
                className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="text-[var(--danger)] underline-offset-2 hover:underline"
              >
                ×
              </button>
            </div>
          </div>

          {/* Row 2 — activity summary + expand controls */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={() => togglePanel("acts")}
              aria-expanded={panel === "acts"}
              aria-controls={actsPanelId}
              className={`muse-row-act-btn inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] transition ${
                panel === "acts"
                  ? "border-[var(--glow)]/55 bg-[var(--glow)]/10 text-[var(--glow)]"
                  : "border-[var(--line)] text-[#c4b7a8] hover:border-[var(--glow)]/35 hover:text-[var(--ink)]"
              }`}
              data-testid="muse-row-acts-toggle"
            >
              <span className="font-medium tabular-nums">{actCount}</span>
              <span className="uppercase tracking-[0.12em]">
                {actCount === 1 ? "act" : "acts"}
              </span>
              <span aria-hidden className="text-[9px] opacity-70">
                {panel === "acts" ? "▾" : "▸"}
              </span>
            </button>

            {previewActs.length > 0 ? (
              <p className="min-w-0 flex-1 truncate text-[12px] leading-snug text-[#d8cfc2]/90">
                {previewActs.join(" · ")}
                {moreActs > 0 ? (
                  <span className="text-[var(--muted)]"> +{moreActs}</span>
                ) : null}
              </p>
            ) : (
              <p className="min-w-0 flex-1 truncate text-[12px] text-[var(--muted)]">
                No acts logged yet
              </p>
            )}

            <button
              type="button"
              onClick={() => togglePanel("details")}
              aria-expanded={panel === "details"}
              aria-controls={detailsPanelId}
              className={`shrink-0 text-[11px] uppercase tracking-[0.12em] underline-offset-2 hover:underline ${
                panel === "details"
                  ? "text-[var(--accent-strong)]"
                  : "text-[var(--muted)] hover:text-[#c4b7a8]"
              }`}
              data-testid="muse-row-details-toggle"
            >
              {panel === "details" ? "Hide" : "More"}
            </button>
          </div>
        </div>
      </div>

      {/* Inline sexual activity log */}
      {panel === "acts" && (
        <div
          id={actsPanelId}
          className="muse-row-panel border-t border-[var(--line)] px-3 py-3 sm:px-4"
          data-testid="muse-row-acts-panel"
        >
          <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--glow)]">
                Sexual activity with {p.name}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                Tap to log what you&apos;ve done — saved with this Muse.
              </p>
            </div>
            {onToggleAct ? null : (
              <button
                type="button"
                onClick={onEdit}
                className="text-[11px] text-[var(--accent-strong)] underline-offset-2 hover:underline"
              >
                Edit to log acts
              </button>
            )}
          </div>

          {doneActs.length > 0 && (
            <ul className="muse-act-done mb-3 flex flex-col gap-1 border border-[var(--line)]/80 bg-[#0a0e18]/55 px-2.5 py-2">
              {doneActs.map((act) => (
                <li
                  key={act}
                  className="flex items-center justify-between gap-2 border-b border-[var(--line)]/50 py-1 last:border-0"
                >
                  <span className="text-[13px] text-[#f0e6dc]">{act}</span>
                  {onToggleAct && (
                    <button
                      type="button"
                      onClick={() => onToggleAct(act)}
                      className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[var(--danger)] underline-offset-2 hover:underline"
                    >
                      Undo
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {onToggleAct && (
            <>
              <label className="mb-2 block">
                <span className="sr-only">Search acts</span>
                <input
                  type="search"
                  value={actQuery}
                  onChange={(e) => setActQuery(e.target.value)}
                  placeholder="Search acts — blowjob, given, anal…"
                  className="prompt-field w-full rounded-sm border border-[var(--line)] bg-[#12161f] px-2.5 py-1.5 text-[13px]"
                />
              </label>
              <div className="muse-act-catalog max-h-56 space-y-2.5 overflow-y-auto overscroll-contain pr-0.5">
                {filteredActGroups.map((g) => (
                  <div key={g.cat}>
                    <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {g.cat}
                    </p>
                    <div className="flex flex-col">
                      {g.tags.map((tag) => {
                        const on = doneActs.includes(tag);
                        return (
                          <label
                            key={tag}
                            className={`muse-act-check flex cursor-pointer items-center gap-2 border-b border-[var(--line)]/40 py-1.5 last:border-0 ${
                              on ? "text-[var(--glow)]" : "text-[#c4b7a8]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => onToggleAct(tag)}
                              className="accent-[var(--glow)]"
                            />
                            <span className="text-[13px] leading-snug">
                              {tag}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredActGroups.length === 0 && (
                  <p className="text-[12px] text-[var(--muted)]">
                    No acts match that search.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Secondary details — looks, history, pairing, photo strip */}
      {panel === "details" && (
        <div
          id={detailsPanelId}
          className="muse-row-panel border-t border-[var(--line)] px-3 py-3 sm:px-4"
          data-testid="muse-row-details-panel"
        >
          <div className="flex flex-col gap-3.5">
            {(hasPaired || pairingOpen || onTogglePairing) && (
              <DetailBlock label="Been together">
                {hasPaired && (
                  <ul className="flex flex-wrap gap-1.5">
                    {paired.map((other) => (
                      <li
                        key={other.id}
                        className="inline-flex items-center gap-1 border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] text-[var(--accent-strong)]"
                      >
                        <Link
                          href={`/art-of-x/chat?muse=${p.id}&with=${other.id}`}
                          className="transition hover:underline"
                        >
                          {displayName(other)}
                        </Link>
                        {onUnpair && (
                          <button
                            type="button"
                            onClick={() => onUnpair(Number(other.id))}
                            className="ml-0.5 text-[var(--danger)] underline-offset-2 hover:underline"
                            aria-label={`Unpair ${displayName(other)}`}
                            data-testid="muse-unpair"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {onTogglePairing && (
                  <button
                    type="button"
                    onClick={onTogglePairing}
                    className={`mt-1.5 text-[11px] underline-offset-2 hover:underline ${
                      pairingOpen
                        ? "text-[var(--accent-strong)]"
                        : "text-[#c4b7a8]"
                    }`}
                  >
                    {pairingOpen ? "Cancel pair" : "Mark been together"}
                  </button>
                )}
                {pairingOpen && onPairWith && (
                  <div className="mt-2">
                    {pairCandidates.length === 0 ? (
                      <p className="text-[11px] text-[var(--muted)]">
                        {roster.length <= 1
                          ? "Add another Muse first."
                          : "Already paired with everyone on the list."}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {pairCandidates.map((other) => (
                          <button
                            key={other.id}
                            type="button"
                            onClick={() => onPairWith(Number(other.id))}
                            className="rounded-sm border border-[var(--line)] px-2 py-0.5 text-[11px] text-[#c4b7a8] transition hover:border-[var(--accent)]/50 hover:text-[var(--ink)]"
                          >
                            + {displayName(other)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </DetailBlock>
            )}

            {photos.length > 1 && (
              <DetailBlock label="Photos">
                <div
                  className="partner-photo-strip -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5"
                  role="list"
                  aria-label={`${p.name} photos`}
                >
                  {photos.map((src, i) => {
                    const isMain = i === (p.mainPhotoIndex ?? 0);
                    return (
                      <button
                        key={i}
                        type="button"
                        role="listitem"
                        onClick={() => setLightboxIndex(i)}
                        aria-label={`Photo ${i + 1}${isMain ? ", main" : ""}`}
                        className={`relative h-12 w-12 shrink-0 overflow-hidden bg-[#12100e] transition ${
                          isMain
                            ? "ring-1 ring-[var(--accent)]"
                            : "ring-1 ring-[var(--line)] hover:ring-[var(--accent)]/45"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </DetailBlock>
            )}

            {hasLooks && (
              <DetailBlock label="Looks">
                <p className="text-[13px] leading-[1.55] text-[#f7f1e8]/92%">
                  {p.looks}
                </p>
              </DetailBlock>
            )}

            {hasDynBlock && (
              <DetailBlock label="Dynamics">
                {hasDynTags && <SoftList items={p.dynTags} />}
                {hasDynamics && (
                  <p
                    className={`text-[13px] leading-[1.55] text-[#d8cfc2] ${
                      hasDynTags ? "mt-1" : ""
                    }`}
                  >
                    {p.dynamics}
                  </p>
                )}
              </DetailBlock>
            )}

            {hasHistory && (
              <DetailBlock label="History with them">
                <p className="text-[13px] leading-[1.55] text-[#f7f1e8]/90%">
                  {p.history}
                </p>
              </DetailBlock>
            )}

            {hasNotes && (
              <DetailBlock label="Notes">
                <p className="text-[13px] leading-[1.55] text-[#d8cfc2]">
                  {p.notes}
                </p>
              </DetailBlock>
            )}

            {hasKinks && (
              <DetailBlock label="Kinks">
                <SoftList items={kinkTags} />
              </DetailBlock>
            )}

            {!hasDetails && (
              <p className="text-[12px] text-[var(--muted)]">
                No extra details yet — edit to add looks, history, and more.
              </p>
            )}
          </div>
        </div>
      )}

      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          name={p.name}
          onClose={() => setLightboxIndex(null)}
          onChange={(i) => setLightboxIndex(i)}
          onSetMain={onSelectPhoto ? setAsMain : undefined}
          isMain={lightboxIndex === (p.mainPhotoIndex ?? 0)}
        />
      )}
    </article>
  );
}
