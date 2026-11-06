"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { authClient } from "@/lib/auth-client";
import {
  promptImportLocalIfNeeded,
  resetStoreMode,
} from "@/lib/artOfXStore";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(result.error.message || "Sign in failed");
        return;
      }
      resetStoreMode();
      let importedPartners = 0;
      try {
        const imported = await promptImportLocalIfNeeded();
        importedPartners = imported?.partners ?? 0;
      } catch {
        // Non-fatal — account session is live; local data stays until next try
      }
      const dest =
        importedPartners > 0
          ? `/art-of-x/partners?imported=${importedPartners}`
          : "/art-of-x/partners";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Adults only · Account
        </p>
        <h1
          className="text-4xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Sign in
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed text-[#c4b7a8]">
          Your partners, stories, chats, Circle, and Echo save to your Narcissus
          account in the cloud.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          <span className="text-[var(--muted)]">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
          />
        </label>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          name="login"
          disabled={busy}
          className="mt-3 w-full rounded-sm bg-[var(--accent)] px-4 py-3.5 text-base font-semibold tracking-wide text-[#1a120c] shadow-[0_0_0_1px_rgba(232,168,124,0.35)] transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-[var(--accent-strong)] underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
