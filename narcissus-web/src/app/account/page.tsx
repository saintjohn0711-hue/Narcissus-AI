"use client";

import { AppNav } from "@/components/AppNav";
import { EchoProfileCard } from "@/components/EchoProfileCard";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { authClient } from "@/lib/auth-client";
import { ECHO_LABEL, ECHO_LINE } from "@/lib/brandLabels";

/**
 * Echo — Narcissus account / settings surface.
 * Brand-forward: identity, highlights, Circle code, sign out.
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

      <PageShell width="lg" outerClassName="relative z-10">
        <AppNav />

        <PageHeader
          className="echo-hero-title"
          kicker={`Adults only · ${ECHO_LINE}`}
          title={ECHO_LABEL}
          lede="Your reflection across Narcissus — identity, Muse overscore, act heat, cloud save, Circle codes, and linked viewers. Muse voice stays on each Muse / chat panel."
        />

        {isPending ? (
          <p className="text-sm text-[var(--muted)]">Loading account…</p>
        ) : (
          <EchoProfileCard signedIn={signedIn} />
        )}
      </PageShell>
    </div>
  );
}
