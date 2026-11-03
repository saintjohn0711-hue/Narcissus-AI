"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  ALL_KINKS,
  DEFAULT_LOCS,
  buildImagePrompt,
  buildStory,
  continueStory,
  displayName,
  injectStoryDirection,
  loadPartners,
  loadScenes,
  saveScenes,
  type PartnerRecord,
  type SavedScene,
  type SceneLength,
} from "@/lib/artOfX";

export default function StoriesPage() {
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [scenes, setScenes] = useState<SavedScene[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [locId, setLocId] = useState(DEFAULT_LOCS[0]!.id);
  const [kinks, setKinks] = useState<string[]>([
    "Oral",
    "Dirty talk",
    "Anal",
    "Free-use",
  ]);
  const [length, setLength] = useState<SceneLength>("medium");
  const [intensity, setIntensity] = useState(7);
  const [surprises, setSurprises] = useState(1);
  const [extra, setExtra] = useState("");
  const [roles, setRoles] = useState("");
  const [draft, setDraft] = useState("");
  const [direction, setDirection] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPartners(loadPartners());
    setScenes(loadScenes());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveScenes(scenes);
  }, [scenes, ready]);

  const cast = useMemo(
    () => partners.filter((p) => selectedIds.includes(p.id)),
    [partners, selectedIds],
  );
  const loc = DEFAULT_LOCS.find((l) => l.id === locId) || DEFAULT_LOCS[0]!;

  function togglePartner(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  function toggleKink(tag: string) {
    setKinks((prev) =>
      prev.includes(tag) ? prev.filter((k) => k !== tag) : [...prev, tag],
    );
  }

  function generate() {
    if (!cast.length) {
      alert("Select at least one partner.");
      return;
    }
    setDraft(
      buildStory({
        partners: cast,
        location: loc,
        kinks,
        length,
        intensity,
        extra,
        roles,
        surpriseCount: surprises,
      }),
    );
  }

  function onContinue() {
    if (!draft) {
      generate();
      return;
    }
    if (direction.trim()) {
      setDraft(injectStoryDirection(draft, direction.trim(), cast));
      setDirection("");
      return;
    }
    setDraft(continueStory(draft, cast));
  }

  function saveCurrent() {
    if (!draft.trim() || !cast.length) return;
    const scene: SavedScene = {
      id: `s_${Date.now().toString(36)}`,
      title: cast.map(displayName).join(" · "),
      when: new Date().toLocaleString(),
      text: draft,
      partnerIds: cast.map((p) => p.id),
      locationId: loc.id,
      kinks: [...kinks],
      intensity,
      length,
      imagePrompt: buildImagePrompt({
        partners: cast,
        location: loc,
        kinks,
        roles,
        extra,
      }),
    };
    setScenes((prev) => [scene, ...prev].slice(0, 40));
  }

  function copyPrompt() {
    const prompt = buildImagePrompt({
      partners: cast,
      location: loc,
      kinks,
      roles,
      extra,
    });
    void navigator.clipboard.writeText(prompt);
    alert("Image prompt copied.");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-8">
        <h1
          className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Scene builder
        </h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[#c4b7a8]">
          ArkOfX craft — pick cast, place, kinks; generate a long explicit scene,
          steer it, save it.
        </p>
      </header>

      {partners.length === 0 ? (
        <p className="text-sm text-[#c4b7a8]">
          Add partners first (or load Ark demo people) before building a scene.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <section className="space-y-6">
            <fieldset className="space-y-2">
              <legend className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
                Cast (up to 3)
              </legend>
              <div className="flex flex-wrap gap-2">
                {partners.map((p) => {
                  const on = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePartner(p.id)}
                      className={`rounded-sm border px-3 py-1.5 text-sm ${
                        on
                          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                          : "border-[var(--line)] text-[#c4b7a8]"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
                Location
              </legend>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_LOCS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLocId(l.id)}
                    className={`rounded-sm border px-3 py-1.5 text-sm ${
                      locId === l.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[#c4b7a8]"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#c4b7a8]">{loc.desc}</p>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
                Scene kinks
              </legend>
              <div className="flex flex-wrap gap-2">
                {ALL_KINKS.map((tag) => {
                  const on = kinks.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleKink(tag)}
                      className={`rounded-sm border px-2.5 py-1 text-xs ${
                        on
                          ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent-strong)]"
                          : "border-[var(--line)] text-[#c4b7a8]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm">
                <span className="uppercase tracking-[0.16em]">Length</span>
                <select
                  value={length}
                  onChange={(e) =>
                    setLength(e.target.value as SceneLength)
                  }
                  className="rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-[#f7f1e8]"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="uppercase tracking-[0.16em]">
                  Intensity {intensity}/10
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="accent-[var(--accent)]"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="uppercase tracking-[0.16em]">
                  Surprises {surprises}
                </span>
                <input
                  type="range"
                  min={0}
                  max={3}
                  value={surprises}
                  onChange={(e) => setSurprises(Number(e.target.value))}
                  className="accent-[var(--accent)]"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="uppercase tracking-[0.16em]">Roles / notes</span>
              <input
                value={roles}
                onChange={(e) => setRoles(e.target.value)}
                className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
                placeholder="Who leads, who receives…"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="uppercase tracking-[0.16em]">
                Extra direction
              </span>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={2}
                className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generate}
                className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a120c]"
              >
                Generate scene
              </button>
              <button
                type="button"
                onClick={copyPrompt}
                className="rounded-sm border border-[var(--line)] px-4 py-2 text-sm text-[#c4b7a8]"
              >
                Copy image prompt
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Story · {loc.name}
              </p>
              <h2
                className="mt-1 text-2xl text-[var(--ink)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {cast.length ? cast.map(displayName).join(" · ") : "Scene"}
              </h2>
              <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-[#f7f1e8]">
                {draft || "Generate a scene to see it here."}
              </pre>
            </div>

            <div className="flex flex-col gap-2">
              <textarea
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                rows={2}
                placeholder="Steer the story — what should happen next…"
                className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onContinue}
                  className="rounded-sm border border-[var(--accent)]/50 px-4 py-2 text-sm text-[var(--accent-strong)]"
                >
                  {direction.trim() ? "Add to story" : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={saveCurrent}
                  disabled={!draft}
                  className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1a120c] disabled:opacity-40"
                >
                  Save scene
                </button>
              </div>
            </div>

            <div className="space-y-3 border-t border-[var(--line)] pt-4">
              <h3 className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
                Saved scenes
              </h3>
              {scenes.length === 0 && (
                <p className="text-xs text-[#c4b7a8]">None yet.</p>
              )}
              {scenes.map((s) => (
                <div
                  key={s.id}
                  className="border border-[var(--line)] p-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[var(--ink)]">{s.title}</p>
                      <p className="text-xs text-[var(--muted)]">{s.when}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        className="text-[var(--accent-strong)]"
                        onClick={() => setDraft(s.text)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="text-[var(--danger)]"
                        onClick={() =>
                          setScenes((prev) =>
                            prev.filter((x) => x.id !== s.id),
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs text-[#c4b7a8]">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
