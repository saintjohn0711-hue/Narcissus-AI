"use client";

import { FormEvent, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  BODY_TYPES,
  COCK_SIZES,
  COCK_STATES,
  type BodyTypeId,
  type CockSizeId,
  type CockStateId,
} from "@/lib/bodyTypes";
import {
  outputSizeForMode,
  preparePhoto,
  type FitMode,
} from "@/lib/photoPrep";
import {
  ACT_TEMPLATES,
  OUTFIT_TEMPLATES,
  SAY_VOICES,
  VIDEO_ACT_TEMPLATES,
  VIDEO_MOTION_TEMPLATES,
  VIDEO_SPEAK_TEMPLATES,
  VIDEO_SWAP_TEMPLATES,
  VIDEO_TEMPLATES,
  getPhotoTemplate,
  getSayVoice,
  getVideoTemplate,
  type PhotoTemplateId,
  type VideoTemplateId,
} from "@/lib/templates";
import { defaultPromptFor, type JobMode } from "@/lib/workflows";

type JobResult = {
  id: string;
  status: string;
  mode: JobMode;
  filename: string;
  faceFilename?: string | null;
  bodyType?: BodyTypeId | null;
  cockState?: CockStateId | null;
  cockSize?: CockSizeId | null;
  message: string;
  comfyConfigured: boolean;
  mediaKind?: "image" | "video";
  resultUrl?: string | null;
  resultUrls?: string[];
  prompt?: string | null;
  speech?: string | null;
  voice?: string | null;
  speechMuxed?: boolean;
  template?: string | null;
  error?: string;
};

const MODES: Array<[JobMode, string]> = [
  ["scene", "Scene photo"],
  ["faceswap", "Face swap still"],
  ["undress", "Clothing removal"],
  ["video", "Photo → video"],
  ["custom", "Custom photo"],
];

export default function StudioPage() {
  const [adultsOk, setAdultsOk] = useState(false);
  const [mode, setMode] = useState<JobMode>("video");
  const [prompt, setPrompt] = useState(defaultPromptFor("video"));
  const [speech, setSpeech] = useState("Hey… come closer.");
  const [photoTemplate, setPhotoTemplate] =
    useState<PhotoTemplateId>("blowjob");
  const [template, setTemplate] = useState<VideoTemplateId>("face_swap");
  const [voice, setVoice] = useState(SAY_VOICES[0]!.id);
  const [bodyType, setBodyType] = useState<BodyTypeId>("female");
  const [cockState, setCockState] = useState<CockStateId>("hard");
  const [cockSize, setCockSize] = useState<CockSizeId>("average");
  const [identity, setIdentity] = useState(0.9);
  const [fit, setFit] = useState<FitMode>("contain");
  const [cropX, setCropX] = useState(0.5);
  const [cropY, setCropY] = useState(0.5);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobResult | null>(null);

  const activePhotoTemplate = getPhotoTemplate(photoTemplate);
  const activeTemplate = getVideoTemplate(template);
  const activeVoice = getSayVoice(voice);
  const activeBody = BODY_TYPES.find((b) => b.id === bodyType)!;

  const needsFace =
    mode === "faceswap" || (mode === "video" && Boolean(activeTemplate.needsFace));
  const showBodyOptions =
    mode === "undress" ||
    (mode === "scene" && Boolean(activePhotoTemplate.useBodyOptions)) ||
    (mode === "video" && Boolean(activeTemplate.useBodyOptions));
  const showCockOptions = showBodyOptions && activeBody.needsCock;

  const canSubmit = useMemo(() => {
    if (!adultsOk || !file || busy) return false;
    if (needsFace && !faceFile) return false;
    if (mode === "custom" && !prompt.trim()) return false;
    if (mode === "video" && activeTemplate.needsSpeech && !speech.trim()) {
      return false;
    }
    return true;
  }, [
    adultsOk,
    file,
    faceFile,
    busy,
    mode,
    prompt,
    activeTemplate,
    speech,
    needsFace,
  ]);

  function selectMode(next: JobMode) {
    setMode(next);
    setJob(null);
    setError(null);
    setPrompt(defaultPromptFor(next));
    if (next === "video" && !VIDEO_TEMPLATES.some((t) => t.id === template)) {
      setTemplate("natural");
    }
  }

  function onFile(f: File | null) {
    setJob(null);
    setError(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function onFaceFile(f: File | null) {
    setJob(null);
    setError(null);
    setFaceFile(f);
    if (facePreview) URL.revokeObjectURL(facePreview);
    setFacePreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !file) return;
    if (needsFace && !faceFile) return;
    setBusy(true);
    setError(null);
    setJob(null);
    try {
      const size = outputSizeForMode(mode === "scene" ? "custom" : mode);
      // Face swap needs a filled frame with a visible face — cover/center beats letterbox.
      const prepared = await preparePhoto(file, {
        fit: needsFace ? "cover" : fit,
        width: size.width,
        height: size.height,
        cropX: needsFace ? 0.5 : cropX,
        cropY: needsFace ? 0.35 : cropY,
        mime: "image/jpeg",
        quality: 0.95,
      });
      const body = new FormData();
      body.set(
        "photo",
        new File([prepared], file.name.replace(/\.\w+$/, "") + "_prep.jpg", {
          type: "image/jpeg",
        }),
      );
      if (needsFace && faceFile) {
        const facePrepared = await preparePhoto(faceFile, {
          fit: "cover",
          width: 512,
          height: 512,
          cropX: 0.5,
          cropY: 0.35,
          mime: "image/jpeg",
          quality: 0.95,
        });
        body.set(
          "face",
          new File(
            [facePrepared],
            faceFile.name.replace(/\.\w+$/, "") + "_face.jpg",
            { type: "image/jpeg" },
          ),
        );
      }
      body.set("mode", mode);
      body.set("fit", fit);
      body.set("identity", String(identity));
      body.set("adultsConfirmed", "true");
      if (mode === "scene") {
        body.set("template", photoTemplate);
        if (prompt.trim()) body.set("prompt", prompt.trim());
      }
      if (mode === "video") {
        body.set("template", template);
        if (speech.trim()) body.set("speech", speech.trim());
        if (activeTemplate.needsSpeech) body.set("voice", voice);
        if (prompt.trim() && activeTemplate.useBodyOptions) {
          body.set("prompt", prompt.trim());
        }
      }
      if (showBodyOptions) {
        body.set("bodyType", bodyType);
        if (activeBody.needsCock) {
          body.set("cockState", cockState);
          body.set("cockSize", cockSize);
        }
      }
      if (mode === "custom" && prompt.trim()) {
        body.set("prompt", prompt.trim());
      }
      if (mode === "undress" && prompt.trim()) {
        body.set("prompt", prompt.trim());
      }
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

  const previewObjectFit = fit === "cover" ? "cover" : "contain";

  function templateButtonClass(active: boolean) {
    return `rounded-sm border px-4 py-2 text-sm transition ${
      active
        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
        : "border-[var(--line)] text-[#c4b7a8] hover:border-[var(--accent)]/40"
    }`;
  }

  function renderVideoGroup(
    title: string,
    items: typeof VIDEO_TEMPLATES,
  ) {
    if (!items.length) return null;
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
          {title}
        </legend>
        <div className="flex flex-wrap gap-3">
          {items.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id as VideoTemplateId)}
              className={templateButtonClass(template === t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
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
        <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-[#c4b7a8]">
          Face swap still + video, scene acts, undress with gender/cock options,
          and 5s clips (natural, sex acts, say-this). Your face stays yours —
          Muses live in the menu above.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="space-y-3">
            <span className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
              {needsFace ? "Source photo (body / scene)" : "Source photo"}
            </span>
            <div className="relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-sm border border-dashed border-[var(--line)] bg-[#12100e]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Source upload preview"
                  className="absolute inset-0 h-full w-full"
                  style={{
                    objectFit: previewObjectFit,
                    objectPosition: `${cropX * 100}% ${cropY * 100}%`,
                  }}
                />
              ) : (
                <span className="px-6 text-center text-sm text-[#c4b7a8]">
                  {needsFace
                    ? "Body or scene that will receive the new face"
                    : "Drop or choose a clear face photo"}
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="text-sm text-[#c4b7a8] file:mr-4 file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#1a120c]"
              onChange={(ev) => onFile(ev.target.files?.[0] ?? null)}
            />
          </div>

          {needsFace && (
            <div className="space-y-3">
              <span className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                Face to swap
              </span>
              <div className="relative flex min-h-56 w-full items-center justify-center overflow-hidden rounded-sm border border-dashed border-[var(--line)] bg-[#12100e]">
                {facePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={facePreview}
                    alt="Face donor preview"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: "50% 35%" }}
                  />
                ) : (
                  <span className="px-6 text-center text-sm text-[#c4b7a8]">
                    Clear frontal face of the person you want on the source
                    {mode === "video" ? " — then we animate 5s" : ""}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="text-sm text-[#c4b7a8] file:mr-4 file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#1a120c]"
                onChange={(ev) => onFaceFile(ev.target.files?.[0] ?? null)}
              />
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
              Frame
            </legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["contain", "Fit entire photo"],
                  ["cover", "Crop to fill"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFit(value)}
                  className={templateButtonClass(fit === value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {fit === "cover" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[#c4b7a8]">
                  Crop X
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </label>
                <label className="text-xs text-[#c4b7a8]">
                  Crop Y
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={cropY}
                    onChange={(e) => setCropY(Number(e.target.value))}
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
              Mode
            </legend>
            <div className="flex flex-wrap gap-3">
              {MODES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectMode(value)}
                  className={templateButtonClass(mode === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {mode === "scene" && (
            <>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                  Act templates
                </legend>
                <div className="flex flex-wrap gap-3">
                  {ACT_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPhotoTemplate(t.id as PhotoTemplateId)}
                      className={templateButtonClass(photoTemplate === t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                  Outfit changes
                </legend>
                <div className="flex flex-wrap gap-3">
                  {OUTFIT_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPhotoTemplate(t.id as PhotoTemplateId)}
                      className={templateButtonClass(photoTemplate === t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#c4b7a8]">
                  {activePhotoTemplate.blurb}
                </p>
              </fieldset>
            </>
          )}

          {mode === "video" && (
            <div className="space-y-6">
              {renderVideoGroup("Motion", VIDEO_MOTION_TEMPLATES)}
              {renderVideoGroup("Sex acts (5s)", VIDEO_ACT_TEMPLATES)}
              {renderVideoGroup("Speak", VIDEO_SPEAK_TEMPLATES)}
              {renderVideoGroup("Face swap video", VIDEO_SWAP_TEMPLATES)}
              <p className="text-xs text-[#c4b7a8]">{activeTemplate.blurb}</p>
            </div>
          )}

          {showBodyOptions && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                {mode === "undress"
                  ? "Body under the clothes"
                  : "Body / gender in the scene"}
              </legend>
              <div className="flex flex-wrap gap-3">
                {BODY_TYPES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBodyType(b.id)}
                    className={templateButtonClass(bodyType === b.id)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#c4b7a8]">{activeBody.blurb}</p>
            </fieldset>
          )}

          {showCockOptions && (
            <>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                  Cock
                </legend>
                <div className="flex flex-wrap gap-3">
                  {COCK_STATES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCockState(c.id)}
                      className={templateButtonClass(cockState === c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                  Size
                </legend>
                <div className="flex flex-wrap gap-3">
                  {COCK_SIZES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCockSize(c.id)}
                      className={templateButtonClass(cockSize === c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {mode === "video" && activeTemplate.needsSpeech ? (
            <>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                  Voice
                </legend>
                <div className="flex flex-wrap gap-3">
                  {SAY_VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoice(v.id)}
                      className={templateButtonClass(voice === v.id)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#c4b7a8]">{activeVoice.blurb}</p>
              </fieldset>
              <label className="flex flex-col gap-3">
                <span className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                  What should they say
                </span>
                <textarea
                  value={speech}
                  onChange={(e) => setSpeech(e.target.value)}
                  rows={3}
                  placeholder="Type the exact line…"
                  className="prompt-field w-full resize-y rounded-sm border border-[var(--line)] bg-[#1c1814] px-4 py-3 text-base font-medium leading-relaxed text-[#f7f1e8] placeholder:text-[#c4b7a8] focus:border-[var(--accent)] focus:outline-none"
                />
                <p className="text-xs text-[#c4b7a8]">
                  Animates your photo for 5s and muxes {activeVoice.label}’s
                  voice when TTS is available. True lip-sync models land next.
                </p>
              </label>
            </>
          ) : mode === "undress" ? (
            <label className="flex flex-col gap-3">
              <span className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                Extra notes (optional)
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Optional — pose or lighting notes. Body type already sets anatomy."
                className="prompt-field w-full resize-y rounded-sm border border-[var(--line)] bg-[#1c1814] px-4 py-3 text-base font-medium leading-relaxed text-[#f7f1e8] placeholder:text-[#c4b7a8] focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
          ) : mode === "scene" ||
            (mode === "video" && activeTemplate.useBodyOptions) ? (
            <label className="flex flex-col gap-3">
              <span className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                Extra notes (optional)
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Optional — pose, lighting, or extras. Template already sets the scene."
                className="prompt-field w-full resize-y rounded-sm border border-[var(--line)] bg-[#1c1814] px-4 py-3 text-base font-medium leading-relaxed text-[#f7f1e8] placeholder:text-[#c4b7a8] focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
          ) : mode === "custom" ? (
            <label className="flex flex-col gap-3">
              <span className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                Prompt
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe the look — identity stays locked to the upload"
                className="prompt-field w-full resize-y rounded-sm border border-[var(--line)] bg-[#1c1814] px-4 py-3 text-base font-medium leading-relaxed text-[#f7f1e8] placeholder:text-[#c4b7a8] focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
          ) : mode === "faceswap" ||
            (mode === "video" && activeTemplate.needsFace) ? (
            <p className="text-xs leading-relaxed text-[#c4b7a8]">
              {mode === "video"
                ? "ReActor swaps the donor face onto the source, then SVD animates 5s. No prompt needed — both uploads drive the result."
                : "ReActor swaps the donor face onto the source photo with GFPGAN restore. No prompt needed — both uploads drive the result."}
            </p>
          ) : null}

          {mode !== "faceswap" && !(mode === "video" && activeTemplate.needsFace) && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]">
                {mode === "undress"
                  ? `Keep face & hair (${Math.round(identity * 100)}%)`
                  : `Keep original face (${Math.round(identity * 100)}%)`}
              </span>
              <input
                type="range"
                min={mode === "undress" || mode === "scene" ? 0.65 : 0.5}
                max={1}
                step={0.01}
                value={identity}
                onChange={(e) => setIdentity(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <p className="text-xs text-[#c4b7a8]">
                {mode === "undress"
                  ? "Higher locks face and hairstyle from the upload via ReActor boost. Keep this high."
                  : "Higher = closer to the uploaded photo. Default is locked high so results match the person."}
              </p>
            </label>
          )}
        </section>

        <aside className="space-y-6 self-start border border-[var(--line)] bg-[var(--bg-elevated)]/60 p-6 backdrop-blur-sm">
          <label className="flex items-start gap-3 text-sm leading-relaxed text-[#c4b7a8]">
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
            {busy
              ? mode === "video"
                ? activeTemplate.needsFace
                  ? "Swapping + rendering video…"
                  : "Rendering 5s video…"
                : mode === "faceswap"
                  ? "Swapping face…"
                  : mode === "undress"
                    ? "Removing clothes…"
                    : mode === "scene"
                      ? "Building scene…"
                      : "Running on GPU…"
              : mode === "video"
                ? `Make 5s ${activeTemplate.label}`
                : mode === "faceswap"
                  ? "Swap face"
                  : mode === "undress"
                    ? `Undress · ${activeBody.label}`
                    : mode === "scene"
                      ? `Make ${activePhotoTemplate.label}`
                      : "Run job"}
          </button>

          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}

          {job && (
            <div className="space-y-3 border-t border-[var(--line)] pt-4 text-sm">
              <p className="text-[var(--ok)]">Job {job.status}</p>
              <p className="text-[#c4b7a8]">
                <span className="text-[var(--ink)]">{job.id}</span> · {job.mode}
                {job.template ? `/${job.template}` : ""}
                {job.bodyType ? `/${job.bodyType}` : ""}
                {job.cockState ? `/${job.cockState}` : ""}
                {job.cockSize ? `/${job.cockSize}` : ""} · {job.filename}
                {job.faceFilename ? ` + ${job.faceFilename}` : ""}
              </p>
              <p className="text-[#c4b7a8]">{job.message}</p>
              {job.speech && (
                <p className="text-[#f7f1e8]">
                  “{job.speech}”
                  {job.voice ? ` · ${getSayVoice(job.voice).label}` : ""}
                  {job.speechMuxed ? " · audio muxed" : ""}
                </p>
              )}
              {job.resultUrl &&
                (() => {
                  const url = job.resultUrl!;
                  const isMp4 = /\.(mp4|webm)(\?|$)/i.test(url);
                  const isAnimStill = /\.(webp|gif)(\?|$)/i.test(url);
                  if (isMp4 || (job.mediaKind === "video" && !isAnimStill)) {
                    return (
                      <video
                        key={url}
                        src={url}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full border border-[var(--line)] bg-black"
                      />
                    );
                  }
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden border border-[var(--line)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Generation result"
                        className="h-auto w-full object-cover"
                      />
                    </a>
                  );
                })()}
              {job.resultUrl && (
                <a
                  href={job.resultUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[var(--accent-strong)] underline-offset-2 hover:underline"
                >
                  Open / download result
                </a>
              )}
            </div>
          )}
        </aside>
      </form>
    </div>
  );
}
