"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { resetStoreMode } from "@/lib/artOfXStore";

type AuthControlsProps = {
  /** Override root layout classes (e.g. drawer stack without ml-auto). */
  className?: string;
};

export function AuthControls({ className }: AuthControlsProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const rootClass =
    className ?? "ml-auto flex items-center gap-2 text-sm sm:gap-3";

  async function signOut() {
    await authClient.signOut();
    resetStoreMode();
    router.refresh();
  }

  if (isPending) {
    return (
      <span className={`${rootClass} text-xs text-[var(--muted)]`}>
        Account…
      </span>
    );
  }

  if (session?.user) {
    return (
      <div className={rootClass}>
        <Link
          href="/account"
          className="max-w-[10rem] truncate text-[var(--muted)] transition hover:text-[var(--ink)]"
          title={session.user.email}
        >
          {session.user.name || session.user.email}
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="ui-btn ui-btn--ghost"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <Link href="/sign-in" className="ui-btn ui-btn--primary">
        Log in
      </Link>
      <Link href="/sign-up" className="ui-btn ui-btn--ghost">
        Sign up
      </Link>
    </div>
  );
}
