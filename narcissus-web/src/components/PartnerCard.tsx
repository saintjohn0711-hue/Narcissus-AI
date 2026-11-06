"use client";

import type { ReactNode } from "react";
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
      <h3 className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#c4b7a8]/85">
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

/**
 * Partner list card — one composition: photo + identity, then
 * labeled sections for looks / history / acts / kinks / dynamics / notes.
 */
export function PartnerCard({ partner: p, onEdit, onRemove }: PartnerCardProps) {
  const hero = mainPhoto(p);
  const kinkTags = normalizeKinks(p.kinks).map((k) => k.tag);
  const metaBits = [
    p.type,
    genderLabel(p.gender),
    p.photos.length
      ? `${p.photos.length} photo${p.photos.length === 1 ? "" : "s"}`
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

  return (
    <article className="partner-card overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/45">
      <div className="grid sm:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] md:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)]">
        {/* Photo column */}
        <div className="relative border-b border-[var(--line)] bg-[#0c0a09] sm:border-b-0 sm:border-r">
          {hero ? (
            <div className="flex min-h-44 items-center justify-center sm:min-h-full sm:items-stretch">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero}
                alt=""
                className="max-h-56 w-full object-contain sm:max-h-none sm:min-h-52 sm:object-cover"
              />
            </div>
          ) : (
            <div
              className="relative flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-10 sm:min-h-full sm:py-12"
              aria-hidden
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(280px 200px at 50% 40%, rgba(232,168,124,0.12), transparent 70%)",
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
              <div className="flex shrink-0 gap-4 pt-1 text-xs">
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
            <div className="flex flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6">
              {(hasLooks || hasDynBlock) && (
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-x-10">
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
                </div>
              )}

              {hasHistory && (
                <Section label="History with them">
                  <p className="max-w-prose text-[15px] leading-[1.7] text-[#f7f1e8]/92%">
                    {p.history}
                  </p>
                </Section>
              )}

              {hasNotes && (
                <Section label="Notes">
                  <p className="max-w-prose text-[15px] leading-[1.7] text-[#d8cfc2]">
                    {p.notes}
                  </p>
                </Section>
              )}

              {(hasActs || hasKinks) && (
                <div
                  className={`grid gap-6 ${
                    hasActs && hasKinks ? "sm:grid-cols-2 sm:gap-x-10" : ""
                  } ${hasProseAbove ? "border-t border-[var(--line)] pt-5" : ""}`}
                >
                  {hasActs && (
                    <Section label="Acts logged">
                      <SoftList items={p.doneActs} />
                    </Section>
                  )}
                  {hasKinks && (
                    <Section label="Kinks">
                      <SoftList items={kinkTags} />
                    </Section>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="px-5 py-5 text-sm text-[var(--muted)] sm:px-6">
              No details yet — edit to add looks, history, kinks, and more.
            </p>
          )}

          {p.photos.length > 1 && (
            <div className="mt-auto border-t border-[var(--line)] px-5 py-3.5 sm:px-6">
              <p className="mb-2.5 text-[11px] uppercase tracking-[0.22em] text-[#c4b7a8]/85">
                Photos
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-0.5">
                {p.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className={`h-12 w-12 shrink-0 bg-[#0c0a09] object-contain ${
                      (p.mainPhotoIndex ?? 0) === i
                        ? "ring-1 ring-[var(--accent)]"
                        : "ring-1 ring-[var(--line)]"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
