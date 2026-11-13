import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
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

      <section className="aox-hero relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-16 pt-28 sm:px-10 sm:pb-20">
        <div className="aox-hero-atmosphere" aria-hidden="true">
          <div className="aox-hero-art">
            <Image
              src="/brand/narcissus-logo.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="select-none"
            />
          </div>
          <div className="aox-hero-rings" />
          <div className="aox-hero-glow" />
          <div className="aox-hero-wash" />
          <div className="aox-hero-grain" />
        </div>

        <div className="aox-hero-copy relative z-10 mx-auto w-full max-w-4xl">
          <div className="aox-fade-up">
            <span className="aox-brand-mark relative mb-5 inline-flex h-[4.25rem] w-[4.25rem] overflow-hidden rounded-sm ring-1 ring-[var(--glow)]/30 sm:mb-6 sm:h-24 sm:w-24">
              <Image
                src="/brand/narcissus-logo.jpg"
                alt="Art of X"
                width={96}
                height={96}
                priority
                className="h-full w-full object-cover object-[center_28%]"
              />
            </span>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--glow)]">
              Narcissus · Desire craft · 18+
            </p>
            <h1
              className="text-[clamp(2.75rem,12vw,6.5rem)] font-semibold leading-[0.92] tracking-tight text-[var(--accent-strong)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Art of X
            </h1>
          </div>

          <p
            className="aox-fade-up aox-fade-up-delay-1 mt-5 max-w-xl text-xl font-light leading-snug text-[var(--ink)] sm:text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your Reflection, Your Rules
          </p>
          <p className="aox-fade-up aox-fade-up-delay-1 mt-3 max-w-lg text-base font-light leading-relaxed text-[var(--soft)]">
            {PERSON_LABEL.plural}, stories, and living AI chat — craft the
            people and scenes that stay with you.
          </p>

          <div className="aox-fade-up aox-fade-up-delay-2 mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/art-of-x/partners"
              className="aox-cta-primary inline-flex items-center border border-[var(--glow)]/50 bg-[var(--glow)]/10 px-6 py-3 text-sm tracking-[0.14em] text-[var(--glow)] transition hover:bg-[var(--glow)]/20"
            >
              Enter {PERSON_LABEL.plural}
            </Link>
            <Link
              href="/art-of-x/chat"
              className="inline-flex items-center border border-[var(--accent)]/45 px-6 py-3 text-sm tracking-[0.14em] text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
            >
              Open AI chat
            </Link>
          </div>
        </div>
      </section>

      <section className="aox-rooms relative border-t border-[var(--glow)]/15 px-6 py-16 sm:px-10 sm:py-20">
        <div className="aox-rooms-glow" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Inside
          </p>
          <h2
            className="max-w-lg text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
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
                  <span
                    className="text-2xl text-[var(--ink)] transition group-hover:text-[var(--glow)] sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
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
              className="aox-room-secondary mt-10 inline-flex flex-col gap-1 border-l-2 border-[var(--accent)]/35 pl-4 transition hover:border-[var(--accent)]/70"
            >
              <span
                className="text-lg text-[var(--accent-strong)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
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
          <span style={{ fontFamily: "var(--font-display), serif" }}>
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
