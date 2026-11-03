"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { emptyStory, type StoryDraft } from "@/lib/artOfX";

const STORAGE_KEY = "narcissus.artOfX.stories";

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryDraft[]>([]);
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [tone, setTone] = useState("intimate");
  const [heat, setHeat] = useState(3);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStories(JSON.parse(raw) as StoryDraft[]);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }, [stories, ready]);

  function onSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const s = emptyStory(title.trim());
    s.premise = premise.trim();
    s.tone = tone.trim() || "intimate";
    s.heat = heat;
    s.draft = draft;
    setStories((prev) => [s, ...prev]);
    setTitle("");
    setPremise("");
    setDraft("");
  }

  function remove(id: string) {
    setStories((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-10">
        <h1
          className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Story maker
        </h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[#c4b7a8]">
          Draft erotic scenes and arcs. When you paste Art of X craft rules,
          we&apos;ll turn this into a guided beat builder.
        </p>
      </header>

      <form
        onSubmit={onSave}
        className="mb-10 grid gap-4 border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-6"
      >
        <label className="grid gap-2 text-sm">
          <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
            Premise
          </span>
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            rows={2}
            className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            placeholder="Who, where, what sparks…"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
              Tone
            </span>
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
              Heat ({heat}/5)
            </span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={heat}
              onChange={(e) => setHeat(Number(e.target.value))}
              className="accent-[var(--accent)]"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm">
          <span className="uppercase tracking-[0.16em] text-[var(--ink)]">
            Draft
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            placeholder="Write the scene…"
          />
        </label>
        <button
          type="submit"
          className="justify-self-start rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a120c]"
        >
          Save story
        </button>
      </form>

      <div className="space-y-4">
        {stories.length === 0 && (
          <p className="text-sm text-[#c4b7a8]">No stories yet.</p>
        )}
        {stories.map((s) => (
          <article
            key={s.id}
            className="border border-[var(--line)] bg-[var(--bg-elevated)]/30 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  className="text-2xl text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {s.title}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {s.tone} · heat {s.heat}/5
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-xs text-[var(--danger)]"
              >
                Remove
              </button>
            </div>
            {s.premise && (
              <p className="mt-3 text-sm text-[#c4b7a8]">{s.premise}</p>
            )}
            {s.draft && (
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#f7f1e8]">
                {s.draft}
              </pre>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
