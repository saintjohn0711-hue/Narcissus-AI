import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthControls } from "@/components/AuthControls";

export const metadata: Metadata = {
  title: "Narcissus — Adult desire studio",
  description:
    "Studio likeness edits, Art of X partners and stories, Circle discovery, Echo account.",
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
    line: "Partners, stories, and AI chat — craft the people and scenes that stay with you.",
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
          aria-label="Narcissus home"
        >
          <span className="home-logo-slot relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
            <Image
              src="/narcissus-logo.svg"
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9 object-contain"
            />
          </span>
          <span
            className="text-lg tracking-[0.08em] text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Narcissus
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#c4b7a8]">
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
          <div className="home-hero-wash" />
          <div className="home-hero-grain" />
          <div className="home-hero-mirror" />
        </div>

        <div className="home-hero-copy relative z-10 mx-auto w-full max-w-4xl">
          <div className="home-brand-block home-fade-up">
            <span className="home-logo-hero relative mb-6 inline-flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
              <Image
                src="/narcissus-logo.svg"
                alt="Narcissus logo"
                width={80}
                height={80}
                priority
                className="h-full w-full object-contain"
              />
            </span>
            <h1
              className="text-[clamp(3.25rem,12vw,7.5rem)] font-semibold leading-[0.92] tracking-tight text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Narcissus
            </h1>
          </div>

          <p
            className="home-fade-up home-fade-up-delay-1 mt-6 max-w-xl text-xl font-light leading-snug text-[#e8ddd0] sm:text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Desire, composed — likeness held.
          </p>

          <p className="home-fade-up home-fade-up-delay-2 mt-4 max-w-md text-base font-light leading-relaxed text-[#c4b7a8]">
            An adults-only space for photo and video craft, partners and stories,
            and discovery with people who want the same.
          </p>

          <div className="home-fade-up home-fade-up-delay-3 mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/studio"
              className="home-cta-primary inline-flex items-center border border-[var(--accent)] bg-[var(--accent)]/15 px-6 py-3 text-sm tracking-[0.14em] text-[var(--accent-strong)] transition hover:bg-[var(--accent)]/25"
            >
              Enter Studio
            </Link>
            <Link
              href="/art-of-x"
              className="inline-flex items-center border border-[var(--line)] px-6 py-3 text-sm tracking-[0.14em] text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
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
          <p className="mt-3 max-w-md text-base font-light leading-relaxed text-[#c4b7a8]">
            Start where you need — edits, partners, discovery, or your account.
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
                  <span className="max-w-md text-sm font-light leading-relaxed text-[#c4b7a8] sm:text-right">
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
          <p className="mt-3 max-w-lg text-base font-light leading-relaxed text-[#c4b7a8]">
            Narcissus is 18+. Sign in when you want cloud-saved partners and Circle
            links — or open Studio and start composing.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center border border-[var(--line)] px-6 py-3 text-sm tracking-[0.14em] text-[#c4b7a8] transition hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
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
          <span style={{ fontFamily: "var(--font-display), serif" }}>Narcissus</span>
          <span>Adults only · 18+</span>
        </div>
      </footer>
    </div>
  );
}
