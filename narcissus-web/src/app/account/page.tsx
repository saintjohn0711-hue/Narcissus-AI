"use client";

import { AppNav } from "@/components/AppNav";
import { EchoProfileCard } from "@/components/EchoProfileCard";
import { authClient } from "@/lib/auth-client";

/**
 * Echo — Narcissus account profile.
 * Brand-forward account surface: identity, highlights, Circle code, sign out.
 */
export default function AccountPage() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  return (
    <div className="echo-page relative min-h-screen overflow-hidden">
      <div className="echo-atmosphere" aria-hidden="true">
        <div className="echo-atmosphere-wash" />
        <div className="echo-atmosphere-ripple" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-10">
        <AppNav />

        <header className="echo-hero-title mb-10">
          <p className="echo-section-label mb-4 text-[10px] uppercase text-[var(--muted)]">
            Adults only · Narcissus account
          </p>
          <h1
            className="text-6xl font-semibold tracking-tight text-[var(--ink)] sm:text-7xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Echo
          </h1>
          <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-[#c4b7a8]">
            Your profile across Narcissus — identity, what you’ve saved, Circle
            share codes, and who you’ve linked.
          </p>
        </header>

        {isPending ? (
          <p className="text-sm text-[var(--muted)]">Loading account…</p>
        ) : (
          <EchoProfileCard signedIn={signedIn} />
        )}
      </div>
    </div>
  );
}
