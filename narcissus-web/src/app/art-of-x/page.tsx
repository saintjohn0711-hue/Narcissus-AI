import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { BrandFaceFrame } from "@/components/BrandFaceFrame";
import { ART_OF_X_NAV, PERSON_LABEL } from "@/lib/artOfX";

export const metadata: Metadata = {
  title: "Art of X — Narcissus AI",
  description:
    "Muses, stories, and AI chat — craft the people and scenes that stay with you.",
};

const PRIMARY = ART_OF_X_NAV.filter((item) => item.id !== "circle");
const SECONDARY = ART_OF_X_NAV.filter((item) => item.id === "circle");

export default function ArtOfXHome() {
  return (
    <div className="aox-root relative min-h-screen overflow-x-hidden">
      <AppNav variant="overlay" />

      <section className="aox-hero relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-14 pt-24 sm:px-10 sm:pb-20">
        <div className="aox-hero-atmosphere" aria-hidden="true">
          <div className="aox-hero-art">
            <Image
              src="/brand/narcissus-logo.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="aox-hero-art-img select-none"
            />
          </div>
          <div className="aox-hero-rings" />
          <div className="aox-hero-glow" />
          <div className="aox-hero-wash" />
          <div className="aox-hero-grain" />
        </div>

        <div className="aox-hero-copy relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <div className="aox-fade-up aox-hero-emblem">
            <BrandFaceFrame size="hero" label="Narcissus Art of X" />
          </div>

          <p className="aox-fade-up aox-fade-up-delay-1 mb-3 mt-2 text-[10px] font-semibold uppercase tracking-[0.36em] text-[var(--glow)]">
            Narcissus · Desire craft · 18+
          </p>

          <h1 className="aox-fade-up aox-fade-up-delay-1 brand-metal-type brand-metal-type--hero">
            Art of X
          </h1>

          <p className="aox-fade-up aox-fade-up-delay-1 brand-metal-type brand-metal-type--slogan mt-4">
            Your Reflection, Your Rules
          </p>

          <p className="aox-fade-up aox-fade-up-delay-1 mt-4 max-w-lg text-base font-light leading-relaxed text-[var(--soft)]">
            {PERSON_LABEL.plural}, stories, and living AI chat — craft the
            people and scenes that stay with you.
          </p>

          <div className="aox-fade-up aox-fade-up-delay-2 mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/art-of-x/partners"
              className="aox-cta-primary inline-flex items-center border border-[var(--glow)]/50 bg-[var(--glow)]/10 px-6 py-3 text-sm tracking-[0.14em] text-[var(--glow)] transition hover:bg-[var(--glow)]/20"
            >
              Enter {PERSON_LABEL.plural}
            </Link>
            <Link
              href="/art-of-x/chat"
              className="aox-cta-metal inline-flex items-center border border-[var(--accent)]/50 px-6 py-3 text-sm tracking-[0.14em] text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
            >
              Open AI chat
            </Link>
          </div>
        </div>
      </section>

      <section className="aox-rooms relative border-t border-[var(--glow)]/15 px-6 py-16 sm:px-10 sm:py-20">
        <div className="aox-rooms-glow" aria-hidden="true" />
        <div className="aox-rooms-ornament" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--glow)]/80">
            Inside
          </p>
          <h2 className="brand-metal-type brand-metal-type--section max-w-xl">
            Three doors. One craft of desire.
          </h2>
          <p className="mt-3 max-w-md text-base font-light leading-relaxed text-[var(--soft)]">
            Pick a room — {PERSON_LABEL.singularLower}s, scenes, or conversation.
          </p>

          <ul className="aox-room-list mt-12 space-y-0 divide-y divide-[var(--glow)]/12 border-y border-[var(--glow)]/15">
            {PRIMARY.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="aox-room group flex flex-col gap-2 py-8 transition sm:flex-row sm:items-baseline sm:justify-between sm:gap-10"
                  style={{ animationDelay: `${0.06 * (index + 1)}s` }}
                >
                  <span className="brand-metal-type brand-metal-type--room transition group-hover:brightness-110">
                    {item.label}
                  </span>
                  <span className="max-w-md text-sm font-light leading-relaxed text-[var(--soft)] sm:text-right">
                    {item.blurb}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {SECONDARY.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="aox-room-secondary mt-10 inline-flex flex-col gap-1 border-l-2 border-[var(--accent)]/45 pl-4 transition hover:border-[var(--accent)]/80"
            >
              <span className="brand-metal-type brand-metal-type--room-sm">
                {item.label}
              </span>
              <span className="max-w-md text-sm font-light text-[var(--muted)]">
                {item.blurb}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-[var(--glow)]/12 px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 text-sm text-[var(--muted)]">
          <span className="brand-metal-type brand-metal-type--footer">
            Narcissus AI · Art of X
          </span>
          <Link href="/studio" className="transition hover:text-[var(--glow)]">
            Studio next door →
          </Link>
        </div>
      </footer>
    </div>
  );
}
