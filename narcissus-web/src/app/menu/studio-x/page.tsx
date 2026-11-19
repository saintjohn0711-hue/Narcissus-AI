import type { Metadata } from "next";
import Link from "next/link";
import { MenuHubShell } from "@/components/MenuHubShell";

export const metadata: Metadata = {
  title: "Studio X",
  description: "Photo, video, design, AI creations — Narcissus Studio.",
};

/**
 * Studio is one live surface (`/studio`) with multiple creation modes.
 * Hub labels match product language; all routes land on Studio until split pages exist.
 */
const STUDIO_LINKS = [
  {
    id: "open",
    href: "/studio",
    name: "Open Studio",
    line: "Full Studio X workspace.",
  },
  {
    id: "eye-contact-handjob",
    href: "/studio",
    name: "Eye contact handjob",
    line: "Photo → eye contact + handjob; optional cock upload.",
  },
  {
    id: "photo",
    href: "/studio",
    name: "Photo",
    line: "Scene stills, face swap, custom photo.",
  },
  {
    id: "video",
    href: "/studio",
    name: "Video",
    line: "Photo → short video and speak clips.",
  },
  {
    id: "design",
    href: "/studio",
    name: "Design",
    line: "Outfits, body, undress, likeness controls.",
  },
  {
    id: "ai",
    href: "/studio",
    name: "AI creations",
    line: "Prompt-driven stills and motion.",
  },
] as const;

export default function StudioXMenuPage() {
  return (
    <MenuHubShell backHref="/menu" backLabel="Menu">
      <div className="home-fade-up">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--glow)]">
          Studio X
        </p>
        <h1
          className="text-[clamp(2.4rem,8vw,4.25rem)] font-semibold leading-[0.94] tracking-tight text-[var(--accent-strong)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Create
        </h1>
        <p className="mt-4 max-w-md text-base font-light leading-relaxed text-[var(--soft)]">
          Photo, video, design, and AI creations — likeness locked, desire composed.
        </p>
      </div>

      <nav className="home-fade-up home-fade-up-delay-1 mt-12" aria-label="Studio X">
        <ul className="menu-house-list">
          {STUDIO_LINKS.map((item) => (
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
