"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  genderLabel,
  mainPhoto,
  normalizeKinks,
  type PartnerRecord,
} from "@/lib/artOfX";

type PartnerCardProps = {
  partner: PartnerRecord;
  onEdit: () => void;
  onRemove: () => void;
  /** Persist featured/main photo when the viewer picks one */
  onSelectPhoto?: (index: number) => void;
  /** Manual sort controls (Your order) */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

function Section({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="text-[11px] uppercase tracking-[0.22em] text-[#c4b7a8]/85">
        {label}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function SoftList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <p className="text-[15px] leading-[1.65] text-[#e8dfd2]">
      {items.map((item, i) => (
        <span key={`${item}-${i}`}>
          {i > 0 && (
            <span className="mx-2 text-[var(--muted)]/55" aria-hidden>
              ·
            </span>
          )}
          <span>{item}</span>
        </span>
      ))}
    </p>
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
 * Partner list card — photo gallery on top, then identity + stacked
 * labeled sections for looks / dynamics / history / notes / acts / kinks.
 */
export function PartnerCard({
  partner: p,
  onEdit,
  onRemove,
  onSelectPhoto,
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
  const [activeIndex, setActiveIndex] = useState(mainIdx);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(mainIdx);
  }, [mainIdx, p.id]);

  const hero = photos[activeIndex] || mainPhoto(p);
  const kinkTags = normalizeKinks(p.kinks).map((k) => k.tag);
  const metaBits = [
    p.type,
    genderLabel(p.gender),
    photos.length
      ? `${photos.length} photo${photos.length === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean) as string[];

  const hasLooks = Boolean(p.looks?.trim());
  const hasHistory = Boolean(p.history?.trim());
  const hasActs = p.doneActs.length > 0;
  const hasKinks = kinkTags.length > 0;
  const hasDynTags = p.dynTags.length > 0;
  const hasDynamics = Boolean(p.dynamics?.trim());
  const hasDynBlock = hasDynTags || hasDynamics;
  const hasNotes = Boolean(p.notes?.trim());
  const hasBody =
    hasLooks || hasHistory || hasActs || hasKinks || hasDynBlock || hasNotes;
  const hasProseAbove = hasLooks || hasDynBlock || hasHistory || hasNotes;
  const initial = (p.name || "?").trim().slice(0, 1).toUpperCase();

  /** Browse only — does not persist main/featured (that needs an explicit star). */
  const selectPhoto = useCallback(
    (index: number, open = true) => {
      if (!photos.length) return;
      const i = Math.min(Math.max(0, index), photos.length - 1);
      setActiveIndex(i);
      if (open) setLightboxIndex(i);
    },
    [photos.length],
  );

  const setAsMain = useCallback(
    (index: number) => {
      if (!photos.length) return;
      const i = Math.min(Math.max(0, index), photos.length - 1);
      setActiveIndex(i);
      onSelectPhoto?.(i);
    },
    [onSelectPhoto, photos.length],
  );

  return (
    <article className="partner-card overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/45">
      {/* Top photo gallery */}
      <div className="border-b border-[var(--line)] bg-[#0c0a09]">
        {hero ? (
          <button
            type="button"
            onClick={() => selectPhoto(activeIndex, true)}
            className="group relative flex min-h-48 w-full items-center justify-center bg-[#0c0a09] sm:min-h-56"
            aria-label={`Open photo of ${p.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero}
              alt=""
              className="max-h-72 w-full object-contain transition duration-300 group-hover:opacity-95 sm:max-h-80"
            />
            <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.22em] text-[#c4b7a8]/0 transition group-hover:text-[#c4b7a8]/90">
              Open
            </span>
          </button>
        ) : (
          <div
            className="relative flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-12"
            aria-hidden
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(420px 220px at 50% 40%, rgba(232,168,124,0.12), transparent 70%)",
              }}
            />
            <span
              className="relative text-4xl tracking-wide text-[var(--accent-strong)]/75"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {initial}
            </span>
            <span className="relative text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
              No photo
            </span>
          </div>
        )}

        {photos.length > 0 && (
          <div className="border-t border-[var(--line)] px-4 py-3 sm:px-5">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                Photos
              </p>
              {photos.length > 1 && (
                <p className="text-[10px] text-[var(--muted)]">
                  Tap to open · set main in lightbox
                </p>
              )}
            </div>
            <div
              className="partner-photo-strip -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1"
              role="list"
              aria-label={`${p.name} photos`}
            >
              {photos.map((src, i) => {
                const isActive = i === activeIndex;
                const isMain = i === (p.mainPhotoIndex ?? 0);
                return (
                  <button
                    key={i}
                    type="button"
                    role="listitem"
                    onClick={() => selectPhoto(i, true)}
                    aria-label={`Photo ${i + 1}${isMain ? ", main" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden bg-[#12100e] transition sm:h-[4.5rem] sm:w-[4.5rem] ${
                      isMain
                        ? "ring-1 ring-[var(--accent)]"
                        : isActive
                          ? "ring-1 ring-[var(--glow)]/50"
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
          </div>
        )}
      </div>

      {/* Identity + body */}
      <div className="flex min-w-0 flex-col">
        <header className="relative border-b border-[var(--line)] px-5 py-4 sm:px-6 sm:py-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(420px 160px at 0% 0%, rgba(232,168,124,0.14), transparent 60%)",
            }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="truncate text-2xl text-[var(--ink)] sm:text-[1.85rem]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {p.name}
              </h2>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                {metaBits.join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 pt-1 text-xs">
              {(onMoveUp || onMoveDown) && (
                <span className="flex gap-2 text-[var(--muted)]">
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
                Remove
              </button>
            </div>
          </div>
        </header>

        {hasBody ? (
          <div className="flex flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-6 sm:py-6">
            {hasLooks && (
              <Section label="Looks">
                <p className="text-[15px] leading-[1.65] text-[#f7f1e8]/95%">
                  {p.looks}
                </p>
              </Section>
            )}

            {hasDynBlock && (
              <Section label="Dynamics">
                {hasDynTags && <SoftList items={p.dynTags} />}
                {hasDynamics && (
                  <p
                    className={`text-[15px] leading-[1.65] text-[#d8cfc2] ${
                      hasDynTags ? "mt-2" : ""
                    }`}
                  >
                    {p.dynamics}
                  </p>
                )}
              </Section>
            )}

            {hasHistory && (
              <Section label="History with them">
                <p className="text-[15px] leading-[1.7] text-[#f7f1e8]/92%">
                  {p.history}
                </p>
              </Section>
            )}

            {hasNotes && (
              <Section label="Notes">
                <p className="text-[15px] leading-[1.7] text-[#d8cfc2]">
                  {p.notes}
                </p>
              </Section>
            )}

            {hasActs && (
              <Section
                label="Acts logged"
                className={
                  hasProseAbove ? "border-t border-[var(--line)] pt-5" : ""
                }
              >
                <SoftList items={p.doneActs} />
              </Section>
            )}

            {hasKinks && (
              <Section
                label="Kinks"
                className={
                  hasProseAbove && !hasActs
                    ? "border-t border-[var(--line)] pt-5"
                    : ""
                }
              >
                <SoftList items={kinkTags} />
              </Section>
            )}
          </div>
        ) : (
          <p className="px-5 py-5 text-sm text-[var(--muted)] sm:px-6">
            No details yet — edit to add looks, history, kinks, and more.
          </p>
        )}
      </div>

      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          name={p.name}
          onClose={() => setLightboxIndex(null)}
          onChange={(i) => {
            setLightboxIndex(i);
            setActiveIndex(i);
          }}
          onSetMain={onSelectPhoto ? setAsMain : undefined}
          isMain={lightboxIndex === (p.mainPhotoIndex ?? 0)}
        />
      )}
    </article>
  );
}
