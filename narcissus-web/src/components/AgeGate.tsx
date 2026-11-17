"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useTransition } from "react";
import {
  MENU_PATH,
  persistAgeGateClient,
  readAgeGateFromDocumentCookie,
  readAgeGateFromLocalStorage,
  sanitizeNextPath,
} from "@/lib/ageGate";

type AgeGateUIProps = {
  next: string;
};

function AgeGateUI({ next }: AgeGateUIProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Cookie is normally enforced by middleware; localStorage covers private-mode
    // or cookie-stripped clients that already agreed.
    const already =
      readAgeGateFromDocumentCookie() || readAgeGateFromLocalStorage();
    if (!already) return;
    persistAgeGateClient();
    startTransition(() => {
      router.replace(next);
    });
  }, [next, router]);

  function agree() {
    persistAgeGateClient();
    startTransition(() => {
      router.push(next);
      router.refresh();
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col items-stretch gap-5">
      <p className="text-center text-sm font-light leading-relaxed text-[var(--soft)]">
        Narcissus is for adults only. By continuing you confirm you are{" "}
        <span className="text-[var(--ink)]">18 years of age or older</span>.
      </p>
      <button
        type="button"
        onClick={agree}
        disabled={pending}
        className="home-cta-primary age-gate-btn inline-flex items-center justify-center border border-[var(--glow)]/50 bg-[var(--glow)]/10 px-6 py-4 text-sm tracking-[0.16em] text-[var(--glow)] transition hover:bg-[var(--glow)]/20 disabled:opacity-60"
      >
        {pending ? "Entering…" : "I am of age — enter"}
      </button>
    </div>
  );
}

function AgeGateWithParams() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"), MENU_PATH);
  return <AgeGateUI next={next} />;
}

export function AgeGate() {
  return (
    <Suspense fallback={<AgeGateUI next={MENU_PATH} />}>
      <AgeGateWithParams />
    </Suspense>
  );
}
