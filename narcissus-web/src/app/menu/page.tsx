import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { PERSON_LABEL } from "@/lib/artOfX";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Muses, AI chat, Stories, Studio, Art of X, Circle, Echo — Narcissus.",
};

/** Every live top-level destination — post-age-gate hub. No outlet picker. */
const DESTINATIONS = [
  {
    id: "muses",
    href: "/art-of-x/partners",
    name: PERSON_LABEL.plural,
    line: "Ledger, craft, desire — everyone you keep.",
  },
  {
    id: "chat",
    href: "/art-of-x/chat",
    name: "AI chat",
    line: "Living companion conversation.",
  },
  {
    id: "stories",
    href: "/art-of-x/stories",
    name: "Stories",
    line: "Scene builder — places and heat.",
  },
  {
    id: "studio",
    href: "/studio",
    name: "Studio",
    line: "Likeness edits and short video.",
  },
  {
    id: "aox",
    href: "/art-of-x",
    name: "Art of X",
    line: "Desire craft hub.",
  },
  {
    id: "circle",
    href: "/circle",
    name: "Circle",
    line: "Discovery and share codes.",
  },
  {
    id: "circle-me",
    href: "/circle/me",
    name: "My Circle",
    line: "Your Circle profile.",
  },
  {
    id: "echo",
    href: "/account",
    name: "Echo",
    line: "Account, Muse stats, your trail.",
  },
  {
    id: "sign-in",
    href: "/sign-in",
    name: "Sign in",
    line: "Return to your cloud Muses.",
  },
  {
    id: "sign-up",
    href: "/sign-up",
    name: "Create account",
    line: "18+ account for saved Muses and Circle.",
  },
] as const;

export default function MenuPage() {
  return (
    <div className="menu-root relative min-h-screen overflow-x-hidden">
      <AppNav variant="overlay" />

      <section className="menu-hero relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-14 pt-24 sm:px-10 sm:pb-20">
        <div className="menu-hero-atmosphere" aria-hidden="true">
          <div className="menu-hero-art">
            <Image
              src="/brand/narcissus-logo.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="select-none"
            />
          </div>
          <div className="menu-hero-glow" />
          <div className="menu-hero-wash" />
          <div className="menu-hero-grain" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <div className="home-fade-up">
            <span className="home-brand-mark relative mb-5 inline-flex h-16 w-16 overflow-hidden rounded-sm ring-1 ring-[var(--glow)]/25 sm:h-20 sm:w-20">
              <Image
                src="/brand/narcissus-logo.jpg"
                alt="Narcissus AI"
                width={80}
                height={80}
                priority
                className="h-full w-full object-cover object-[center_28%]"
              />
            </span>
            <h1
              className="text-[clamp(2.75rem,10vw,5.5rem)] font-semibold leading-[0.92] tracking-tight text-[var(--accent-strong)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Narcissus
            </h1>
            <p
              className="mt-4 max-w-md text-xl font-light leading-snug text-[var(--ink)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Your Reflection, Your Rules
            </p>
          </div>

          <nav
            className="home-fade-up home-fade-up-delay-1 mt-12"
            aria-label="Menu"
          >
            <ul className="menu-house-list">
              {DESTINATIONS.map((room) => (
                <li key={room.id}>
                  <Link href={room.href} className="menu-house-link group">
                    <span
                      className="menu-house-name"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {room.name}
                    </span>
                    <span className="menu-house-line">{room.line}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </div>
  );
}
