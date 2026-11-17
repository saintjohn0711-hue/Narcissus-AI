"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { AuthControls } from "@/components/AuthControls";
import { BrandFaceFrame } from "@/components/BrandFaceFrame";
import { CoupleDial } from "@/components/CoupleDial";
import { OUTLETS, parseOutletParam, type OutletId } from "@/lib/outlets";

/** Compact desktop chrome — outlets first, then two product doors */
const DESKTOP_PRIMARY = [
  ...OUTLETS.map((o) => ({ href: o.href, label: o.label, kind: "outlet" as const })),
  { href: "/studio", label: "Studio", kind: "house" as const },
  { href: "/art-of-x", label: "Art of X", kind: "aox" as const },
];

function linkActive(pathname: string, href: string, outlet: OutletId | null) {
  if (href === "/" || href === "/menu") {
    return pathname === "/menu" || pathname === "/";
  }
  if (href === "/art-of-x") return pathname === "/art-of-x";

  const [path, qs] = href.split("?");
  if (path === "/art-of-x/partners" && qs?.startsWith("outlet=")) {
    const want = parseOutletParam(qs.slice("outlet=".length));
    return (
      (pathname === "/art-of-x/partners" ||
        pathname.startsWith("/art-of-x/partners/")) &&
      outlet === want
    );
  }
  if (href === "/art-of-x/partners") {
    return (
      (pathname === "/art-of-x/partners" ||
        pathname.startsWith("/art-of-x/partners/")) &&
      outlet === null
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavProps = {
  /**
   * Companion immersive stage: compact floating chrome so Home/Menu stay
   * reachable when the full portrait layout hides the page header.
   * Overlay: transparent hero chrome for atmospheric hubs (Art of X, home).
   */
  variant?: "default" | "companion" | "overlay";
};

function useMdUp() {
  const [mdUp, setMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMdUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return mdUp;
}

function AppNavInner({ variant = "default" }: AppNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const outlet = parseOutletParam(searchParams.get("outlet"));
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const companion = variant === "companion";
  const overlay = variant === "overlay";
  const onArtOfX = pathname === "/art-of-x" || pathname.startsWith("/art-of-x/");
  const mdUp = useMdUp();
  const drawerMode = mdUp ? "more" : "full";
  const menuLabel = mdUp ? "More" : "Menu";

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const menuBtn = menuBtnRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      menuBtn?.focus();
    };
  }, [open]);

  const headerClass = companion
    ? "app-nav app-nav--companion"
    : overlay
      ? "app-nav app-nav--overlay"
      : "app-nav mb-8 flex items-center justify-between gap-3 border-b border-[var(--glow)]/15 pb-4 md:mb-10";

  function closeDrawer() {
    setOpen(false);
  }

  return (
    <>
      <header className={headerClass}>
        <Link
          href="/menu"
          className="app-nav-brand flex min-w-0 items-center gap-2.5 text-[var(--ink)] no-underline"
          aria-label="Narcissus menu"
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

        <div className="flex shrink-0 items-center gap-2">
          <nav
            className={
              companion
                ? "hidden"
                : "hidden flex-wrap items-center gap-1.5 md:flex"
            }
            aria-label="Primary"
          >
            {DESKTOP_PRIMARY.map((link) => {
              const active = linkActive(pathname, link.href, outlet);
              const outletStyle = link.kind === "outlet";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-sm px-3 py-1.5 text-sm tracking-wide transition ${
                    active
                      ? outletStyle
                        ? "bg-[var(--glow)]/18 text-[var(--glow)] ring-1 ring-[var(--glow)]/35"
                        : "bg-[var(--glow)]/15 text-[var(--glow)] ring-1 ring-[var(--glow)]/25"
                      : outletStyle
                        ? "text-[var(--ink)] hover:text-[var(--glow)]"
                        : "text-[var(--soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <AuthControls />
          </nav>

          <button
            ref={menuBtnRef}
            type="button"
            className="app-nav-menu-btn ui-icon-btn"
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            {menuLabel}
          </button>
        </div>
      </header>

      {open && (
        <div className="app-nav-drawer" role="presentation">
          <button
            type="button"
            className="app-nav-drawer-backdrop"
            aria-label="Close menu"
            onClick={closeDrawer}
          />
          <div
            id={panelId}
            className={`app-nav-drawer-panel${onArtOfX ? " app-nav-drawer-panel--aox" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={mdUp ? "More destinations" : "Site menu"}
          >
            <div className="app-nav-drawer-atmosphere" aria-hidden="true" />
            <div className="app-nav-drawer-header">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2.5">
                  <BrandFaceFrame size="sm" label="" className="app-nav-drawer-face" />
                  <p className="brand-metal-type brand-metal-type--nav">
                    {mdUp ? "More" : "Menu"}
                  </p>
                </div>
                <p className="brand-metal-type brand-metal-type--footer mt-0.5">
                  Your Reflection, Your Rules
                </p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className="app-nav-menu-btn ui-icon-btn shrink-0"
                onClick={closeDrawer}
              >
                Close
              </button>
            </div>

            <div className="app-nav-drawer-body flex flex-1 flex-col overflow-y-auto px-3 py-3">
              <CoupleDial
                mode={drawerMode}
                isActive={(href) => linkActive(pathname, href, outlet)}
                onNavigate={closeDrawer}
              />
            </div>

            <div className="app-nav-drawer-footer">
              <AuthControls className="flex flex-wrap items-center gap-2 text-sm" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * useSearchParams needs a Suspense boundary in Next App Router.
 * Fallback renders the same chrome without outlet-aware active states.
 */
export function AppNav(props: AppNavProps) {
  return (
    <Suspense fallback={<AppNavFallback {...props} />}>
      <AppNavInner {...props} />
    </Suspense>
  );
}

function AppNavFallback({ variant = "default" }: AppNavProps) {
  const companion = variant === "companion";
  const overlay = variant === "overlay";
  const headerClass = companion
    ? "app-nav app-nav--companion"
    : overlay
      ? "app-nav app-nav--overlay"
      : "app-nav mb-8 flex items-center justify-between gap-3 border-b border-[var(--glow)]/15 pb-4 md:mb-10";

  return (
    <header className={headerClass}>
      <Link
        href="/menu"
        className="app-nav-brand flex min-w-0 items-center gap-2.5 text-[var(--ink)] no-underline"
        aria-label="Narcissus menu"
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
      {!companion && (
        <nav
          className="hidden flex-wrap items-center gap-1.5 md:flex"
          aria-label="Primary"
        >
          {DESKTOP_PRIMARY.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm px-3 py-1.5 text-sm tracking-wide text-[var(--soft)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
      <span className="app-nav-menu-btn ui-icon-btn opacity-70" aria-hidden>
        Menu
      </span>
    </header>
  );
}
