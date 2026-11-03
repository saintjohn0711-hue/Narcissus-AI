"use client";

import { FormEvent, useMemo, useState } from "react";

type Mode = "faceswap" | "undress";

type JobResult = {
  id: string;
  status: string;
  mode: Mode;
  filename: string;
  message: string;
  comfyConfigured: boolean;
  resultUrl?: string | null;
  resultUrls?: string[];
  error?: string;
};

export default function Home() {
  const [adultsOk, setAdultsOk] = useState(false);
  const [mode, setMode] = useState<Mode>("faceswap");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobResult | null>(null);

  const canSubmit = useMemo(
    () => adultsOk && !!file && !busy,
    [adultsOk, file, busy],
  );

  function onFile(f: File | null) {
    setJob(null);
    setError(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !file) return;
    setBusy(true);
    setError(null);
    setJob(null);
    try {
      const body = new FormData();
      body.set("photo", file);
      body.set("mode", mode);
      body.set("adultsConfirmed", "true");
      const res = await fetch("/api/jobs", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setJob(data as JobResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <header className="mb-12 border-b border-[var(--line)] pb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Studio
        </p>
        <h1
          className="text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Narcissus
        </h1>
        <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-[var(--muted)]">
          Upload an adult photo. Keep the likeness. Face swap or clothing edit —
          GPU jobs run on Runpod.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <label className="flex cursor-pointer flex-col items-start gap-3">
            <span className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Source photo
            </span>
            <div
              className="relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-sm border border-dashed border-[var(--line)] bg-[var(--bg-elevated)]/80"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, transparent 0%, rgba(232,168,124,0.05) 100%)",
              }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Upload preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="px-6 text-center text-sm text-[var(--muted)]">
                  Drop or choose a clear face photo
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="text-sm text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#1a120c]"
              onChange={(ev) => onFile(ev.target.files?.[0] ?? null)}
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Mode
            </legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["faceswap", "Face swap"],
                  ["undress", "Clothing removal"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-sm border px-4 py-2 text-sm transition ${
                    mode === value
                      ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                      : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)]">
              Phase 1 uses img2img on ComfyUI. Reactor face-lock + dedicated
              undress LoRAs come next. Video lands in Phase 2.
            </p>
          </fieldset>
        </section>

        <aside className="space-y-6 self-start border border-[var(--line)] bg-[var(--bg-elevated)]/60 p-6 backdrop-blur-sm">
          <label className="flex items-start gap-3 text-sm leading-relaxed text-[var(--muted)]">
            <input
              type="checkbox"
              className="mt-1 accent-[var(--accent)]"
              checked={adultsOk}
              onChange={(e) => setAdultsOk(e.target.checked)}
            />
            <span>
              I confirm this photo depicts an adult (18+) and I have rights to
              use it for generation.
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-sm bg-[var(--accent)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#1a120c] transition enabled:hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Running on GPU…" : "Run job"}
          </button>

          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}

          {job && (
            <div className="space-y-3 border-t border-[var(--line)] pt-4 text-sm">
              <p className="text-[var(--ok)]">Job {job.status}</p>
              <p className="text-[var(--muted)]">
                <span className="text-[var(--ink)]">{job.id}</span> · {job.mode} ·{" "}
                {job.filename}
              </p>
              <p className="text-[var(--muted)]">{job.message}</p>
              {job.resultUrl && (
                <a
                  href={job.resultUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden border border-[var(--line)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={job.resultUrl}
                    alt="Generation result"
                    className="h-auto w-full object-cover"
                  />
                </a>
              )}
            </div>
          )}

          <p className="text-xs leading-relaxed text-[var(--muted)]">
            ComfyUI worker:{" "}
            <a
              className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
              href="https://b5vcjxup5d6y23-8188.proxy.runpod.net"
              target="_blank"
              rel="noreferrer"
            >
              b5vcjxup5d6y23:8188
            </a>
            . Stop the Pod when idle — it bills while running.
          </p>
        </aside>
      </form>
    </div>
  );
}
