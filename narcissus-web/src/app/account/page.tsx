"use client";

import { AppNav } from "@/components/AppNav";
import { EchoProfileCard } from "@/components/EchoProfileCard";
import { authClient } from "@/lib/auth-client";

/**
 * Echo — Narcissus account profile card.
 * Identity, highlights, Circle code, and linked viewers in one composition.
 */
export default function AccountPage() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Adults only · Account
        </p>
        <h1
          className="text-5xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Echo
        </h1>
        <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-[#c4b7a8]">
          Your Narcissus profile card — who you are, what you’ve saved, and how
          you share into Circle.
        </p>
      </header>

      {isPending ? (
        <p className="text-sm text-[var(--muted)]">Loading account…</p>
      ) : (
        <EchoProfileCard signedIn={signedIn} />
      )}
    </div>
  );
}
