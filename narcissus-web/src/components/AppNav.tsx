"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AuthControls } from "@/components/AuthControls";
import { PERSON_LABEL } from "@/lib/artOfX";

const LINKS = [
  { href: "/", label: "Home", group: "house" as const },
  { href: "/studio", label: "Studio", group: "house" as const },
  { href: "/art-of-x", label: "Art of X", group: "aox" as const },
  { href: "/art-of-x/partners", label: PERSON_LABEL.plural, group: "aox" as const },
  { href: "/art-of-x/stories", label: "Stories", group: "aox" as const },
  { href: "/art-of-x/chat", label: "AI chat", group: "aox" as const },
  { href: "/circle", label: "Circle", group: "house" as const },
  { href: "/account", label: "Echo", group: "house" as const },
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
   * Overlay: transparent hero chrome for atmospheric hubs (Art of X).
   */
  variant?: "default" | "companion" | "overlay";
};

export function AppNav({ variant = "default" }: AppNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const companion = variant === "companion";
  const overlay = variant === "overlay";
  const onArtOfX = pathname === "/art-of-x" || pathname.startsWith("/art-of-x/");

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

  const headerClass = companion
    ? "app-nav app-nav--companion"
    : overlay
      ? "app-nav app-nav--overlay"
      : "app-nav mb-8 flex items-center justify-between gap-3 border-b border-[var(--glow)]/15 pb-4 md:mb-10";

  const houseLinks = LINKS.filter((l) => l.group === "house");
  const aoxLinks = LINKS.filter((l) => l.group === "aox");

  return (
    <>
      <header className={headerClass}>
        <Link
          href="/"
          className="app-nav-brand flex min-w-0 items-center gap-2.5 text-[var(--ink)] no-underline"
          aria-label="Narcissus AI home"
        >
          <span className="relative inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-sm ring-1 ring-[var(--glow)]/25">
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
                    ? "bg-[var(--glow)]/15 text-[var(--glow)] ring-1 ring-[var(--glow)]/25"
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
          className={`app-nav-menu-btn rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
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
            className={`app-nav-drawer-panel${onArtOfX ? " app-nav-drawer-panel--aox" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="app-nav-drawer-atmosphere" aria-hidden="true" />
            <div className="app-nav-drawer-header">
              <div className="min-w-0">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="app-nav-drawer-mark relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-sm ring-1 ring-[var(--glow)]/35">
                    <Image
                      src="/brand/narcissus-logo.jpg"
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 object-cover object-[center_28%]"
                    />
                  </span>
                  <p
                    className="app-nav-drawer-title"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Menu
                  </p>
                </div>
                <p className="app-nav-drawer-slogan text-[11px] font-light tracking-[0.04em] text-[var(--accent-strong)]">
                  Your Reflection, Your Rules
                </p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className="app-nav-menu-btn shrink-0 rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
              <div>
                <p className="app-nav-drawer-kicker mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--glow)]">
                  Art of X
                </p>
                <div className="flex flex-col gap-1">
                  {aoxLinks.map((link) => {
                    const active = linkActive(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`app-nav-drawer-link px-3 py-3 text-base tracking-wide transition ${
                          active
                            ? "is-active"
                            : "text-[#c4b7a8] hover:text-[var(--ink)]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="app-nav-drawer-kicker mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  House
                </p>
                <div className="flex flex-col gap-1">
                  {houseLinks.map((link) => {
                    const active = linkActive(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`app-nav-drawer-link px-3 py-3 text-base tracking-wide transition ${
                          active
                            ? "is-active"
                            : "text-[#c4b7a8] hover:text-[var(--ink)]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </nav>

            <div className="app-nav-drawer-footer">
              <AuthControls className="flex flex-wrap items-center gap-2 text-sm" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
