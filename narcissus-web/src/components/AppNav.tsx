"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthControls } from "@/components/AuthControls";

type AppNavProps = {
  /**
   * Companion immersive stage: compact floating chrome so Menu stays
   * reachable when the full portrait layout hides the page header.
   * Overlay: transparent hero chrome for atmospheric hubs.
   */
  variant?: "default" | "companion" | "overlay";
};

/**
 * Slim site chrome — brand + Menu hub + auth.
 * Destinations live on `/menu`; no wheel / drawer / outlet strip.
 */
export function AppNav({ variant = "default" }: AppNavProps) {
  const pathname = usePathname();
  const companion = variant === "companion";
  const overlay = variant === "overlay";
  const onMenu = pathname === "/menu";

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

      <div className="flex shrink-0 items-center gap-2">
        {!companion && (
          <div className="hidden md:block">
            <AuthControls />
          </div>
        )}
        <Link
          href="/menu"
          className={`app-nav-menu-btn ui-icon-btn ${
            onMenu
              ? "bg-[var(--glow)]/15 text-[var(--glow)] ring-1 ring-[var(--glow)]/30"
              : ""
          }`}
          aria-current={onMenu ? "page" : undefined}
        >
          Menu
        </Link>
      </div>
    </header>
  );
}
