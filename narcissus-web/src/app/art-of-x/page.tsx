import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ART_OF_X_NAV } from "@/lib/artOfX";

export default function ArtOfXHome() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-12">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Adults only · Desire craft
        </p>
        <h1
          className="text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Art of X
        </h1>
        <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-[#c4b7a8]">
          Partner history, scene builder, photos, and AI chat — craft pulled from
          Ark of X. Studio stays next door for photo edits.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-3">
        {ART_OF_X_NAV.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group border border-[var(--line)] bg-[var(--bg-elevated)]/50 p-6 transition hover:border-[var(--accent)]/50"
          >
            <h2
              className="text-2xl text-[var(--ink)] group-hover:text-[var(--accent-strong)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {item.label}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#c4b7a8]">
              {item.blurb}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
