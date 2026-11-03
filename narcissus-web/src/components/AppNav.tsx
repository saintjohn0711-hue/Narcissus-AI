"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Studio" },
  { href: "/art-of-x", label: "Art of X" },
  { href: "/art-of-x/partners", label: "Partners" },
  { href: "/art-of-x/stories", label: "Stories" },
  { href: "/art-of-x/chat", label: "AI chat" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-10 flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-4">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : link.href === "/art-of-x"
              ? pathname === "/art-of-x"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-sm px-3 py-1.5 text-sm tracking-wide transition ${
              active
                ? "bg-[var(--accent)]/20 text-[var(--accent-strong)]"
                : "text-[#c4b7a8] hover:text-[var(--ink)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
