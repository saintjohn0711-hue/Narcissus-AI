"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

/**
 * Circle share-code UI — lives on Echo / Account.
 * Codes create linked-viewer connections, not password sharing.
 */
export function ShareCodePanel({
  signedIn,
  variant = "standalone",
}: {
  signedIn: boolean;
  /** embedded = no outer border (nested inside Echo card) */
  variant?: "standalone" | "embedded";
}) {
  const shell =
    variant === "embedded"
      ? "pt-1"
      : "border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-5";
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/circle/share-code");
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not load share code");
        return;
      }
      setCode(data.code || null);
    } catch {
      setError("Could not load share code");
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rotate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/circle/share-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate" }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Rotate failed");
        return;
      }
      setCode(data.code || null);
    } catch {
      setError("Rotate failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/circle/share-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Revoke failed");
        return;
      }
      setCode(null);
    } catch {
      setError("Revoke failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Clipboard unavailable");
    }
  }

  async function onRedeem(e: FormEvent) {
    e.preventDefault();
    setRedeemMsg(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/circle/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemInput }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        ownerUserId?: string;
        alreadyLinked?: boolean;
        error?: string;
        note?: string;
      };
      if (!res.ok) {
        setError(
          data.error === "code_not_found"
            ? "That code is invalid or was revoked."
            : data.error === "cannot_link_self"
              ? "You can’t link your own code."
              : data.error || "Redeem failed",
        );
        return;
      }
      setRedeemMsg(
        data.alreadyLinked
          ? "Already linked — open their Circle profile."
          : "Linked. You can view their Circle profile.",
      );
      setRedeemInput("");
      if (data.ownerUserId) {
        setRedeemMsg((m) => `${m} →`);
      }
    } catch {
      setError("Redeem failed");
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <section className={shell}>
        <h2
          className="text-2xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Circle code
        </h2>
        <p className="mt-2 text-sm text-[#c4b7a8]">
          Sign in to generate a share code or redeem someone else’s. Codes link
          Circle profiles — they never share your password.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block text-sm text-[var(--accent-strong)] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className={shell}>
      <h2
        className="text-2xl text-[var(--ink)]"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Circle code
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#c4b7a8]">
        Share this code so another signed-in adult can link as a{" "}
        <em className="not-italic text-[var(--ink)]">linked viewer</em> of your
        Circle profile. Rotating or revoking invalidates the old code. This is
        not password sharing — Art of X vault stays private.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <code className="rounded-sm border border-[var(--line)] bg-[#0a0908] px-4 py-2.5 font-mono text-lg tracking-[0.2em] text-[var(--accent-strong)]">
          {busy && !code ? "……" : code || "— revoked —"}
        </code>
        {code && (
          <button
            type="button"
            onClick={() => void copyCode()}
            className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-sm text-[#c4b7a8] transition hover:border-[var(--accent)]/50 hover:text-[var(--ink)]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void rotate()}
          className="rounded-sm border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3 py-1.5 text-sm text-[var(--accent-strong)] transition hover:bg-[var(--accent)]/25 disabled:opacity-50"
        >
          {code ? "Rotate" : "Generate"}
        </button>
        {code && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void revoke()}
            className="rounded-sm px-3 py-1.5 text-sm text-[var(--danger)] transition hover:underline disabled:opacity-50"
          >
            Revoke
          </button>
        )}
      </div>

      <form onSubmit={onRedeem} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Enter someone’s Circle code</span>
          <input
            value={redeemInput}
            onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
            placeholder="ABCD2345"
            maxLength={16}
            className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 font-mono tracking-widest text-[var(--ink)] outline-none focus:border-[var(--accent)]/60"
          />
        </label>
        <button
          type="submit"
          disabled={busy || redeemInput.trim().length < 6}
          className="rounded-sm bg-[var(--accent)]/90 px-4 py-2.5 text-sm font-medium text-[#1a120c] transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          Link
        </button>
      </form>

      {redeemMsg && (
        <p className="mt-3 text-sm text-[var(--ok)]">
          {redeemMsg}{" "}
          <Link href="/circle" className="underline-offset-2 hover:underline">
            Open Circle
          </Link>
        </p>
      )}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </section>
  );
}
