import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";

type MenuHubShellProps = {
  children: ReactNode;
  /** Optional back link above the brand block */
  backHref?: string;
  backLabel?: string;
};

/**
 * Shared atmospheric shell for `/menu` and hub drill-ins.
 */
export function MenuHubShell({
  children,
  backHref,
  backLabel = "Menu",
}: MenuHubShellProps) {
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
          {backHref ? (
            <Link
              href={backHref}
              className="home-fade-up mb-8 inline-flex text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--glow)] transition hover:text-[var(--ink)]"
            >
              ← {backLabel}
            </Link>
          ) : null}
          {children}
        </div>
      </section>
    </div>
  );
}
