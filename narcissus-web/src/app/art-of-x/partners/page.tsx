"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  emptyPartner,
  type PartnerRecord,
  type PartnerStatus,
} from "@/lib/artOfX";

const STORAGE_KEY = "narcissus.artOfX.partners";

const STATUSES: PartnerStatus[] = [
  "active",
  "paused",
  "ended",
  "fantasy",
  "one_night",
];

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PartnerStatus>("active");
  const [kinks, setKinks] = useState("");
  const [boundaries, setBoundaries] = useState("");
  const [notes, setNotes] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPartners(JSON.parse(raw) as PartnerRecord[]);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
  }, [partners, ready]);

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const p = emptyPartner(name.trim());
    p.status = status;
    p.kinks = kinks
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    p.boundaries = boundaries
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    p.bodyNotes = notes.trim() || undefined;
    setPartners((prev) => [p, ...prev]);
    setName("");
    setKinks("");
    setBoundaries("");
    setNotes("");
  }

  function remove(id: string) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-10">
        <h1
          className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Partner history
        </h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[#c4b7a8]">
          Track who you&apos;ve been with — chemistry, kinks, boundaries, body
          notes. Stored locally until Art of X sync lands.
        </p>
      </header>

      <form
        onSubmit={onAdd}
        className="mb-10 grid gap-4 border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-6"
      >
        <label className="grid gap-2 text-sm">
          <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            placeholder="Partner name"
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
            Status
          </legend>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-sm border px-3 py-1.5 text-sm ${
                  status === s
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                    : "border-[var(--line)] text-[#c4b7a8]"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-2 text-sm">
          <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
            Kinks (comma-separated)
          </span>
          <input
            value={kinks}
            onChange={(e) => setKinks(e.target.value)}
            className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
            Boundaries (comma-separated)
          </span>
          <input
            value={boundaries}
            onChange={(e) => setBoundaries(e.target.value)}
            className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
            Body / voice notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="justify-self-start rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a120c]"
        >
          Add partner
        </button>
      </form>

      <div className="space-y-4">
        {partners.length === 0 && (
          <p className="text-sm text-[#c4b7a8]">No partners yet.</p>
        )}
        {partners.map((p) => (
          <article
            key={p.id}
            className="border border-[var(--line)] bg-[var(--bg-elevated)]/30 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  className="text-2xl text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {p.name}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {p.status.replace("_", " ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="text-xs text-[var(--danger)]"
              >
                Remove
              </button>
            </div>
            {p.kinks.length > 0 && (
              <p className="mt-3 text-sm text-[#c4b7a8]">
                <span className="text-[var(--ink)]">Kinks:</span>{" "}
                {p.kinks.join(", ")}
              </p>
            )}
            {p.boundaries.length > 0 && (
              <p className="mt-1 text-sm text-[#c4b7a8]">
                <span className="text-[var(--ink)]">Boundaries:</span>{" "}
                {p.boundaries.join(", ")}
              </p>
            )}
            {p.bodyNotes && (
              <p className="mt-2 text-sm leading-relaxed text-[#c4b7a8]">
                {p.bodyNotes}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
