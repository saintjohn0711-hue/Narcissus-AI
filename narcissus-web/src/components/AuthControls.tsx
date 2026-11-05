"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { resetStoreMode } from "@/lib/artOfXStore";

export function AuthControls() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    resetStoreMode();
    router.refresh();
  }

  if (isPending) {
    return (
      <span className="ml-auto text-xs text-[var(--muted)]">Account…</span>
    );
  }

  if (session?.user) {
    return (
      <div className="ml-auto flex items-center gap-3 text-sm">
        <span className="max-w-[10rem] truncate text-[var(--muted)]" title={session.user.email}>
          {session.user.name || session.user.email}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-sm border border-[var(--line)] px-2.5 py-1 text-[#c4b7a8] transition hover:border-[var(--accent)]/50 hover:text-[var(--ink)]"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2 text-sm">
      <Link
        href="/sign-in"
        className="rounded-sm px-2.5 py-1 text-[#c4b7a8] transition hover:text-[var(--ink)]"
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-sm border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-2.5 py-1 text-[var(--accent-strong)] transition hover:bg-[var(--accent)]/25"
      >
        Create account
      </Link>
    </div>
  );
}
