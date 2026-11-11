"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AuthControls } from "@/components/AuthControls";
import { PERSON_LABEL } from "@/lib/artOfX";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/studio", label: "Studio" },
  { href: "/art-of-x", label: "Art of X" },
  { href: "/art-of-x/partners", label: PERSON_LABEL.plural },
  { href: "/art-of-x/stories", label: "Stories" },
  { href: "/art-of-x/chat", label: "AI chat" },
  { href: "/circle", label: "Circle" },
  { href: "/account", label: "Echo" },
] as const;

function linkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/art-of-x") return pathname === "/art-of-x";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavProps = {
  /**
   * Companion immersive stage: compact floating chrome so Home/Menu stay
   * reachable when the full portrait layout hides the page header.
   */
  variant?: "default" | "companion";
};

export function AppNav({ variant = "default" }: AppNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const companion = variant === "companion";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <header
        className={
          companion
            ? "app-nav app-nav--companion"
            : "app-nav mb-8 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4 md:mb-10"
        }
      >
        <Link
          href="/"
          className="app-nav-brand flex min-w-0 items-center gap-2.5 text-[var(--ink)] no-underline"
          aria-label="Narcissus AI home"
        >
          <span className="relative inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-sm ring-1 ring-[var(--line)]">
            <Image
              src="/brand/narcissus-logo.jpg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-cover object-[center_30%]"
            />
          </span>
          <span
            className="truncate text-[0.95rem] tracking-[0.05em] text-[var(--accent-strong)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Narcissus
          </span>
        </Link>

        <nav
          className={
            companion
              ? "hidden"
              : "hidden flex-wrap items-center gap-2 md:flex"
          }
          aria-label="Primary"
        >
          {LINKS.map((link) => {
            const active = linkActive(pathname, link.href);
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
          <AuthControls />
        </nav>

        <button
          type="button"
          className={`app-nav-menu-btn rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--soft)] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)] ${
            companion ? "" : "md:hidden"
          }`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      </header>

      {open && (
        <div className="app-nav-drawer" role="presentation">
          <button
            type="button"
            className="app-nav-drawer-backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            className="app-nav-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
              <p
                className="text-lg text-[var(--accent-strong)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Menu
              </p>
              <button
                ref={closeBtnRef}
                type="button"
                className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--soft)] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)]"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
              {LINKS.map((link) => {
                const active = linkActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-sm px-3 py-3 text-base tracking-wide transition ${
                      active
                        ? "bg-[var(--accent)]/20 text-[var(--accent-strong)]"
                        : "text-[#c4b7a8] hover:bg-[#12182a] hover:text-[var(--ink)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-[var(--line)] px-5 py-4">
              <AuthControls className="flex flex-wrap items-center gap-2 text-sm" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
