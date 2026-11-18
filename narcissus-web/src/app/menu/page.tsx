import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MenuHubShell } from "@/components/MenuHubShell";

export const metadata: Metadata = {
  title: "Menu",
  description: "Studio X and Art Of X — Your Reflection, Your Rules.",
};

const HUBS = [
  {
    id: "studio-x",
    href: "/menu/studio-x",
    name: "Studio X",
    line: "Photo, video, design, AI creations.",
  },
  {
    id: "art-of-x",
    href: "/menu/art-of-x",
    name: "Art Of X",
    line: "Muses, Stories, swinger, adult dating, AI chat.",
  },
] as const;

export default function MenuPage() {
  return (
    <MenuHubShell>
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

      <nav className="home-fade-up home-fade-up-delay-1 mt-14" aria-label="Menu">
        <ul className="menu-hub-doors">
          {HUBS.map((hub) => (
            <li key={hub.id}>
              <Link href={hub.href} className="menu-hub-door group">
                <span
                  className="menu-hub-door-name"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {hub.name}
                </span>
                <span className="menu-hub-door-line">{hub.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="home-fade-up home-fade-up-delay-2 mt-14 flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-8 text-sm">
        <Link
          href="/account"
          className="tracking-[0.12em] text-[var(--soft)] transition hover:text-[var(--ink)]"
        >
          Echo
        </Link>
        <span className="text-[var(--muted)]" aria-hidden>
          ·
        </span>
        <Link
          href="/sign-in"
          className="tracking-[0.12em] text-[var(--soft)] transition hover:text-[var(--ink)]"
        >
          Sign in
        </Link>
        <span className="text-[var(--muted)]" aria-hidden>
          ·
        </span>
        <Link
          href="/sign-up"
          className="tracking-[0.12em] text-[var(--accent-strong)] transition hover:underline"
        >
          Create account
        </Link>
      </div>
    </MenuHubShell>
  );
}
