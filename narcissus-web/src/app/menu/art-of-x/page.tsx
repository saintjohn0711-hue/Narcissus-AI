import type { Metadata } from "next";
import Link from "next/link";
import { MenuHubShell } from "@/components/MenuHubShell";
import { PERSON_LABEL } from "@/lib/artOfX";
import { CIRCLE_LABEL, CIRCLE_LINE } from "@/lib/brandLabels";

export const metadata: Metadata = {
  title: "Art Of X",
  description:
    "Muses, Stories, Circle, AI chat — Narcissus Art Of X.",
};

/**
 * Art Of X hub — real routes only.
 * Swinger / adult dating live under Circle (`/circle`); no separate dating page.
 */
const ART_LINKS = [
  {
    id: "muses",
    href: "/art-of-x/partners",
    name: PERSON_LABEL.plural,
    line: "Ledger, craft, desire — everyone you keep.",
  },
  {
    id: "stories",
    href: "/art-of-x/stories",
    name: "Stories",
    line: "Scene builder — places and heat.",
  },
  {
    id: "chat",
    href: "/art-of-x/chat",
    name: "AI chat",
    line: "Living companion conversation.",
  },
  {
    id: "circle",
    href: "/circle",
    name: CIRCLE_LABEL,
    line: CIRCLE_LINE,
  },
  {
    id: "circle-me",
    href: "/circle/me",
    name: "My Circle",
    line: "Your profile in Circle.",
  },
  {
    id: "hub",
    href: "/art-of-x",
    name: "Art Of X hub",
    line: "Desire craft overview.",
  },
] as const;

export default function ArtOfXMenuPage() {
  return (
    <MenuHubShell backHref="/menu" backLabel="Menu">
      <div className="home-fade-up">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--glow)]">
          Art Of X
        </p>
        <h1
          className="text-[clamp(2.4rem,8vw,4.25rem)] font-semibold leading-[0.94] tracking-tight text-[var(--accent-strong)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Desire
        </h1>
        <p className="mt-4 max-w-md text-base font-light leading-relaxed text-[var(--soft)]">
          Muses, Stories, {CIRCLE_LABEL}, and AI chat — one house of heat.
        </p>
      </div>

      <nav className="home-fade-up home-fade-up-delay-1 mt-12" aria-label="Art Of X">
        <ul className="menu-house-list">
          {ART_LINKS.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="menu-house-link group">
                <span
                  className="menu-house-name"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {item.name}
                </span>
                <span className="menu-house-line">{item.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </MenuHubShell>
  );
}
