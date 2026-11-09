"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  ALL_KINKS,
  DEFAULT_LOCS,
  SCENE_ROLE_CHIPS,
  buildImagePrompt,
  buildSteerDirectionFromBoxes,
  buildStory,
  continueStory,
  displayName,
  injectStoryDirection,
  type PartnerRecord,
  type SavedScene,
  type SceneLength,
  type ScenePov,
  type StoryDirectionBrief,
} from "@/lib/artOfX";
import { partnerToSceneCard } from "@/lib/sceneCraft";
import { fetchPartners, fetchScenes, persistScenes } from "@/lib/artOfXStore";

type GenSource = "llm" | "local" | null;

const chipOn =
  "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]";
const chipOff = "border-[var(--line)] text-[#c4b7a8]";

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
  const [pov, setPov] = useState<ScenePov>("you");
  const [draft, setDraft] = useState("");
  const [direction, setDirection] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<GenSource>(null);
  const [modelLabel, setModelLabel] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Brief locked in after last generate/continue — box deltas steer from this. */
  const [committedBrief, setCommittedBrief] =
    useState<StoryDirectionBrief | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, s] = await Promise.all([fetchPartners(), fetchScenes()]);
        if (cancelled) return;
        setPartners(p);
        setScenes(s);
        setLoadError(null);
      } catch {
        if (!cancelled) {
          setLoadError(
            "Couldn’t load Muses or saved scenes — refresh and try again.",
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void persistScenes(scenes).catch(() => {});
  }, [scenes, ready]);

  const cast = useMemo(
    () => partners.filter((p) => selectedIds.includes(p.id)),
    [partners, selectedIds],
  );
  const loc = DEFAULT_LOCS.find((l) => l.id === locId) || DEFAULT_LOCS[0]!;

  const currentBrief = useMemo<StoryDirectionBrief>(
    () => ({
      locId: loc.id,
      locName: loc.name,
      kinks: [...kinks],
      roles,
      surprises,
      extra,
      intensity,
    }),
    [loc.id, loc.name, kinks, roles, surprises, extra, intensity],
  );

  const boxSteer = useMemo(
    () =>
      draft.trim()
        ? buildSteerDirectionFromBoxes(committedBrief, currentBrief)
        : "",
    [draft, committedBrief, currentBrief],
  );

  const hasStory = Boolean(draft.trim());
  const continueEnabled = hasStory && !busy && cast.length > 0;
  const willSteer = Boolean(boxSteer || direction.trim());

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

  function toggleRoleChip(chip: string) {
    setRoles((prev) => {
      const parts = prev
        .split(/[,·|/]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const on = parts.some((p) => p.toLowerCase() === chip.toLowerCase());
      const next = on
        ? parts.filter((p) => p.toLowerCase() !== chip.toLowerCase())
        : [...parts, chip];
      return next.join(", ");
    });
  }

  function roleChipOn(chip: string) {
    return roles
      .split(/[,·|/]+/)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
      .includes(chip.toLowerCase());
  }

  function commitBrief(brief: StoryDirectionBrief = currentBrief) {
    setCommittedBrief({
      ...brief,
      kinks: [...brief.kinks],
    });
  }

  /** Local fallback — same initial-direction fields as the API payload. */
  function localGenerate() {
    return buildStory({
      partners: cast,
      location: loc,
      kinks,
      length,
      intensity,
      extra,
      roles,
      surpriseCount: surprises,
      pov,
    });
  }

  async function requestScene(opts: {
    mode: "generate" | "continue" | "steer";
    previous?: string;
    direction?: string;
  }): Promise<{ text: string; source: GenSource; model?: string }> {
    const payload = {
      mode: opts.mode,
      partners: cast.map(partnerToSceneCard),
      location: loc,
      kinks,
      length,
      intensity,
      surprises,
      extra,
      roles,
      pov,
      previous: opts.previous || "",
      direction: opts.direction || "",
    };

    try {
      const res = await fetch("/api/art-of-x/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          text?: string;
          model?: string;
        };
        if (data.text?.trim()) {
          return {
            text: data.text.trim(),
            source: "llm",
            model: data.model,
          };
        }
      }
    } catch {
      // fall through to local craft
    }

    const brief = {
      partners: cast,
      pov,
      kinks,
      location: loc,
      intensity,
      roles,
      extra,
      length,
    };
    if (opts.mode === "generate") {
      return { text: localGenerate(), source: "local" };
    }
    if (opts.mode === "steer" && opts.direction) {
      return {
        text: injectStoryDirection(
          opts.previous || "",
          opts.direction,
          brief,
        ),
        source: "local",
      };
    }
    return {
      text: continueStory(opts.previous || "", brief),
      source: "local",
    };
  }

  async function generate() {
    if (!cast.length) {
      alert("Select at least one Muse.");
      return;
    }
    setBusy(true);
    try {
      const result = await requestScene({ mode: "generate" });
      setDraft(result.text);
      setSource(result.source);
      setModelLabel(result.model || "");
      commitBrief();
      setDirection("");
    } finally {
      setBusy(false);
    }
  }

  async function onContinue() {
    if (!cast.length) {
      alert("Select at least one Muse.");
      return;
    }
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const freeText = direction.trim();
      const steerDir = [boxSteer, freeText].filter(Boolean).join(". ");
      const mode = steerDir ? "steer" : "continue";
      const result = await requestScene({
        mode,
        previous: draft,
        direction: steerDir,
      });
      // LLM returns append-only beat; local helpers already include previous.
      // If the model ignored instructions and rewrote the whole scene, keep its text.
      const prior = draft.trim();
      const incoming = result.text.trim();
      const nextText =
        result.source === "llm"
          ? prior &&
            incoming.length > prior.length * 0.6 &&
            incoming.startsWith(prior.slice(0, Math.min(120, prior.length)))
            ? incoming
            : prior
              ? `${prior}\n\n${incoming}`.trim()
              : incoming
          : result.text;
      setDraft(nextText);
      setSource(result.source);
      setModelLabel(result.model || "");
      commitBrief();
      if (mode === "steer") setDirection("");
    } finally {
      setBusy(false);
    }
  }

  function loadScene(s: SavedScene) {
    setDraft(s.text);
    if (Array.isArray(s.partnerIds) && s.partnerIds.length) {
      setSelectedIds(
        s.partnerIds
          .filter((id) => partners.some((p) => p.id === id))
          .slice(0, 3),
      );
    }
    if (s.locationId && DEFAULT_LOCS.some((l) => l.id === s.locationId)) {
      setLocId(s.locationId);
    }
    if (Array.isArray(s.kinks)) setKinks([...s.kinks]);
    if (typeof s.intensity === "number") setIntensity(s.intensity);
    if (s.length === "short" || s.length === "medium" || s.length === "long") {
      setLength(s.length);
    }
    const loadedLoc =
      DEFAULT_LOCS.find((l) => l.id === s.locationId) || loc;
    const nextIntensity =
      typeof s.intensity === "number" ? s.intensity : intensity;
    const nextKinks = Array.isArray(s.kinks) ? [...s.kinks] : [];
    commitBrief({
      locId: loadedLoc.id,
      locName: loadedLoc.name,
      kinks: nextKinks,
      roles,
      surprises,
      extra,
      intensity: nextIntensity,
    });
    setDirection("");
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

  const sourceBadge =
    source === "llm"
      ? `LLM · ${modelLabel || "xAI"}`
      : source === "local"
        ? "Local craft"
        : null;

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
          Art of X craft with Muses — pick cast, place, and kink boxes; generate
          a scene, then continue or click more boxes to steer the next beat.
        </p>
      </header>

      {loadError && (
        <p className="mb-4 text-sm text-[#f0c4b8]" role="alert">
          {loadError}
        </p>
      )}

      {partners.length === 0 ? (
        <div className="space-y-6">
          <p className="text-sm text-[#c4b7a8]">
            {loadError
              ? "Muses didn’t load — check the message above, then refresh."
              : "Add Muses first (or load Ark demo people) before building a scene."}
          </p>
          {scenes.length > 0 && (
            <div className="space-y-3 border-t border-[var(--line)] pt-4">
              <h3 className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
                Saved scenes
              </h3>
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
                        onClick={() => loadScene(s)}
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
          )}
        </div>
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
                        on ? chipOn : chipOff
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
                      locId === l.id ? chipOn : chipOff
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
                        on ? chipOn : chipOff
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
                Roles
              </legend>
              <div className="flex flex-wrap gap-2">
                {SCENE_ROLE_CHIPS.map((chip) => {
                  const on = roleChipOn(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleRoleChip(chip)}
                      className={`rounded-sm border px-2.5 py-1 text-xs ${
                        on ? chipOn : chipOff
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
              <input
                value={roles}
                onChange={(e) => setRoles(e.target.value)}
                className="prompt-field mt-1 w-full rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm"
                placeholder="Or type role notes — who leads, who receives…"
              />
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm uppercase tracking-[0.16em] text-[var(--ink)]">
                Surprises
              </legend>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSurprises(n)}
                    className={`min-w-[2.5rem] rounded-sm border px-3 py-1.5 text-sm ${
                      surprises === n ? chipOn : chipOff
                    }`}
                    aria-pressed={surprises === n}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#c4b7a8]">
                How many surprise turns to fold into the next beat.
              </p>
            </fieldset>

            {hasStory && (
              <p
                className="rounded-sm border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-3 py-2 text-xs leading-relaxed text-[var(--accent-strong)]"
                role="status"
              >
                {boxSteer
                  ? "New direction from your boxes will steer Continue the story."
                  : "Click more location, kink, role, or surprise boxes to set a new direction for Continue."}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <span className="uppercase tracking-[0.16em]">POV</span>
                <select
                  value={pov}
                  onChange={(e) => setPov(e.target.value as ScenePov)}
                  className="rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-[#f7f1e8]"
                >
                  <option value="you">You</option>
                  <option value="partner">Lead Muse</option>
                  <option value="third">Third person</option>
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
            </div>

            <label className="grid gap-2 text-sm">
              <span className="uppercase tracking-[0.16em]">
                Extra direction
              </span>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={2}
                className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
                placeholder="Optional free-text — boxes above are enough for most steers."
              />
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={busy || !cast.length}
                  className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a120c] disabled:opacity-50"
                >
                  {busy && !hasStory ? "Generating…" : "Generate scene"}
                </button>
                <button
                  type="button"
                  onClick={() => void onContinue()}
                  disabled={!continueEnabled}
                  title={
                    hasStory
                      ? willSteer
                        ? "Continue with new direction from boxes"
                        : "Continue the story"
                      : "Generate a scene first"
                  }
                  className="rounded-sm border border-[var(--accent)]/55 px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy && hasStory
                    ? willSteer
                      ? "Steering…"
                      : "Continuing…"
                    : "Continue the story"}
                </button>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="rounded-sm border border-[var(--line)] px-4 py-2 text-sm text-[#c4b7a8]"
                >
                  Copy image prompt
                </button>
              </div>
              {!hasStory && (
                <p className="text-xs text-[#c4b7a8]">
                  Continue the story unlocks after you generate (or load) a
                  scene.
                </p>
              )}
              {hasStory && boxSteer && (
                <p className="text-xs leading-relaxed text-[var(--accent-strong)]">
                  Next steer: {boxSteer}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Story · {loc.name}
                </p>
                {sourceBadge && (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent-strong)]">
                    {sourceBadge}
                  </span>
                )}
              </div>
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
              <label className="grid gap-1 text-sm">
                <span className="uppercase tracking-[0.16em] text-[var(--muted)]">
                  Optional text steer
                </span>
                <textarea
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  rows={2}
                  disabled={!hasStory}
                  placeholder={
                    hasStory
                      ? "Optional — boxes already steer Continue. Add a specific beat if you want."
                      : "Generate a scene first, then steer with boxes or text."
                  }
                  className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm disabled:opacity-50"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveCurrent}
                  disabled={!draft || busy}
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
                        onClick={() => loadScene(s)}
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
