"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { authClient } from "@/lib/auth-client";
import {
  fetchPartners,
  promptImportLocalIfNeeded,
  resetStoreMode,
} from "@/lib/artOfXStore";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adultsOk, setAdultsOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!adultsOk) {
      setError("You must confirm you are 18 or older.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim() || email.trim().split("@")[0] || "User",
        // Better Auth additional field
        adultsConfirmed: true,
      } as Parameters<typeof authClient.signUp.email>[0] & {
        adultsConfirmed: boolean;
      });
      if (result.error) {
        setError(result.error.message || "Sign up failed");
        return;
      }
      resetStoreMode();
      let importedPartners = 0;
      try {
        // New account is empty — auto-merge any browser-local draft once.
        const imported = await promptImportLocalIfNeeded({ autoImport: true });
        importedPartners = imported?.partners ?? 0;
      } catch {
        // Non-fatal — account still created; local data stays in browser
      }
      // Empty new accounts get Woman · Rocky · Jaxx so Muses isn't blank.
      if (importedPartners === 0) {
        try {
          const seeded = await fetchPartners();
          if (seeded.length > 0) importedPartners = seeded.length;
        } catch {
          // Non-fatal — partners page will seed on load
        }
      }
      const dest =
        importedPartners > 0
          ? `/art-of-x/partners?imported=${importedPartners}`
          : "/art-of-x/partners";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell width="sm">
      <AppNav />
      <PageHeader
        kicker="Adults only · Account"
        title="Create account"
        lede="Partner data, stories, chats, Circle, and Echo save to your Narcissus account in the cloud — not only this browser."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Password (8+ characters)</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
          />
        </label>

        <label className="flex items-start gap-3 text-sm text-[#c4b7a8]">
          <input
            type="checkbox"
            checked={adultsOk}
            onChange={(e) => setAdultsOk(e.target.checked)}
            className="mt-1"
          />
          <span>
            I confirm I am 18 years of age or older and that this account is for
            adult (18+) use only.
          </span>
        </label>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          name="sign-up"
          disabled={busy || !adultsOk}
          className="mt-3 w-full rounded-sm bg-[var(--accent)] px-4 py-3.5 text-base font-semibold tracking-wide text-[#1a120c] shadow-[0_0_0_1px_rgba(232,168,124,0.35)] transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-[var(--accent-strong)] underline-offset-2 hover:underline"
        >
          Log in
        </Link>
      </p>
    </PageShell>
  );
}
