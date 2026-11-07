import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthControls } from "@/components/AuthControls";

export const metadata: Metadata = {
  title: "Narcissus AI — Your Reflection, Your Rules",
  description:
    "Studio likeness edits, Art of X Muses and stories, Circle discovery, Echo account.",
};

const SECTIONS = [
  {
    id: "studio",
    href: "/studio",
    name: "Studio",
    line: "Likeness-preserving photo edits and short video — face locked, desire composed.",
  },
  {
    id: "art-of-x",
    href: "/art-of-x",
    name: "Art of X",
    line: "Muses, stories, and AI chat — craft the people and scenes that stay with you.",
  },
  {
    id: "circle",
    href: "/circle",
    name: "Circle",
    line: "Swingers discovery and share codes — find and connect on your terms.",
  },
  {
    id: "echo",
    href: "/account",
    name: "Echo",
    line: "Your account — identity, links, and the trail you leave across Narcissus.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="home-root min-h-screen">
      <header className="home-topnav absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-3 text-[var(--ink)] no-underline"
          aria-label="Narcissus AI home"
        >
          <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-sm ring-1 ring-[var(--line)]">
            <Image
              src="/brand/narcissus-logo.jpg"
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9 object-cover object-[center_30%]"
            />
          </span>
          <span
            className="text-lg tracking-[0.06em] text-[var(--accent-strong)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Narcissus AI
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--soft)]">
          <Link href="/studio" className="transition hover:text-[var(--ink)]">
            Studio
          </Link>
          <Link href="/art-of-x" className="transition hover:text-[var(--ink)]">
            Art of X
          </Link>
          <Link href="/circle" className="hidden transition hover:text-[var(--ink)] sm:inline">
            Circle
          </Link>
          <Link href="/account" className="hidden transition hover:text-[var(--ink)] sm:inline">
            Echo
          </Link>
          <AuthControls />
        </nav>
      </header>

      <section className="home-hero relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-16 pt-28 sm:px-10 sm:pb-20">
        <div className="home-hero-atmosphere" aria-hidden="true">
          <div className="home-hero-art">
            <Image
              src="/brand/narcissus-logo.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="select-none"
            />
          </div>
          <div className="home-hero-glow" />
          <div className="home-hero-wash" />
          <div className="home-hero-grain" />
        </div>

        <div className="home-hero-copy relative z-10 mx-auto w-full max-w-4xl">
          <div className="home-brand-block home-fade-up">
            <span className="home-brand-mark relative mb-5 inline-flex h-[4.5rem] w-[4.5rem] overflow-hidden rounded-sm ring-1 ring-[var(--glow)]/25 sm:mb-6 sm:h-24 sm:w-24">
              <Image
                src="/brand/narcissus-logo.jpg"
                alt="Narcissus AI"
                width={96}
                height={96}
                priority
                className="h-full w-full object-cover object-[center_28%]"
              />
            </span>
            <h1
              className="text-[clamp(2.75rem,11vw,6.75rem)] font-semibold leading-[0.92] tracking-tight text-[var(--accent-strong)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Narcissus AI
            </h1>
          </div>

          <p
            className="home-fade-up home-fade-up-delay-1 mt-5 max-w-xl text-xl font-light leading-snug text-[var(--ink)] sm:text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your Reflection, Your Rules
          </p>

          <div className="home-fade-up home-fade-up-delay-2 mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/studio"
              className="home-cta-primary inline-flex items-center border border-[var(--glow)]/50 bg-[var(--glow)]/10 px-6 py-3 text-sm tracking-[0.14em] text-[var(--glow)] transition hover:bg-[var(--glow)]/20"
            >
              Enter Studio
            </Link>
            <Link
              href="/art-of-x"
              className="inline-flex items-center border border-[var(--accent)]/45 px-6 py-3 text-sm tracking-[0.14em] text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
            >
              Explore Art of X
            </Link>
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--line)] px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Inside
          </p>
          <h2
            className="max-w-lg text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Four rooms. One house of desire.
          </h2>
          <p className="mt-3 max-w-md text-base font-light leading-relaxed text-[var(--soft)]">
            Start where you need — edits, Muses, discovery, or your account.
          </p>

          <ul className="mt-14 space-y-0 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <Link
                  href={section.href}
                  className="home-room group flex flex-col gap-2 py-8 transition sm:flex-row sm:items-baseline sm:justify-between sm:gap-10"
                >
                  <span
                    className="text-2xl text-[var(--ink)] transition group-hover:text-[var(--accent-strong)] sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {section.name}
                  </span>
                  <span className="max-w-md text-sm font-light leading-relaxed text-[var(--soft)] sm:text-right">
                    {section.line}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative border-t border-[var(--line)] px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Adults only
          </p>
          <h2
            className="max-w-lg text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Built for consenting adults.
          </h2>
          <p className="mt-3 max-w-lg text-base font-light leading-relaxed text-[var(--soft)]">
            Narcissus is 18+. Sign in when you want cloud-saved Muses and Circle
            links — or open Studio and start composing.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center border border-[var(--line)] px-6 py-3 text-sm tracking-[0.14em] text-[var(--soft)] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm tracking-[0.08em] text-[var(--accent-strong)] underline-offset-4 transition hover:underline"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 text-sm text-[var(--muted)]">
          <span style={{ fontFamily: "var(--font-display), serif" }}>Narcissus AI</span>
          <span>Adults only · 18+</span>
        </div>
      </footer>
    </div>
  );
}
