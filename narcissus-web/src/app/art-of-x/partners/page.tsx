"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  ALL_KINKS,
  DONE_ACTS,
  DYN_TAGS,
  PARTNER_PHOTO_LIMITS,
  PERSON_GENDERS,
  arkDemoRoster,
  emptyPartner,
  fileToPartnerPhoto,
  genderLabel,
  mainPhoto,
  normalizeKinks,
  withMainPhoto,
  type PartnerRecord,
  type PersonType,
} from "@/lib/artOfX";
import {
  fetchPartners,
  getStoreMode,
  persistPartners,
  type StoreMode,
} from "@/lib/artOfXStore";
import { pullLooksFromPhotos } from "@/lib/looksFromPhoto";

const TYPES: PersonType[] = ["Real", "Dream", "Wanted"];

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [filter, setFilter] = useState<"all" | PersonType>("all");
  const [editing, setEditing] = useState<PartnerRecord | null>(null);
  /** Photo indexes chosen as sources for “Pull looks” */
  const [looksFromIdx, setLooksFromIdx] = useState<number[]>([]);
  const [pullingLooks, setPullingLooks] = useState(false);
  const [looksNote, setLooksNote] = useState<string | null>(null);
  const [storeMode, setStoreMode] = useState<StoreMode>("local");
  const [ready, setReady] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("imported");
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      setImportNote(
        `Imported ${n} partner${n === 1 ? "" : "s"} to your account`,
      );
    }
    window.history.replaceState({}, "", "/art-of-x/partners");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mode = await getStoreMode();
      const list = await fetchPartners();
      if (cancelled) return;
      setStoreMode(mode);
      setPartners(list);
      setReady(true);
    })().catch(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void persistPartners(partners).catch(() => {
      /* keep UI responsive if save fails */
    });
  }, [partners, ready]);

  const visible = useMemo(
    () =>
      filter === "all" ? partners : partners.filter((p) => p.type === filter),
    [partners, filter],
  );

  function openNew() {
    setEditing(emptyPartner(""));
    setLooksFromIdx([]);
    setLooksNote(null);
  }

  function openEdit(p: PartnerRecord) {
    const main = p.mainPhotoIndex ?? 0;
    setEditing({
      ...p,
      kinks: normalizeKinks(p.kinks),
      photos: [...(p.photos || [])],
      mainPhotoIndex: main,
      doneActs: [...(p.doneActs || [])],
      dynTags: [...(p.dynTags || [])],
    });
    setLooksFromIdx(p.photos?.length ? [main] : []);
    setLooksNote(null);
  }

  function persistEditor(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    const next = {
      ...editing,
      name: editing.name.trim(),
      updatedAt: new Date().toISOString(),
    };
    setPartners((prev) => {
      const i = prev.findIndex((p) => p.id === next.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = next;
        return copy;
      }
      return [next, ...prev];
    });
    setEditing(null);
    setLooksFromIdx([]);
    setLooksNote(null);
  }

  function remove(id: number) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
    if (editing?.id === id) {
      setEditing(null);
      setLooksFromIdx([]);
      setLooksNote(null);
    }
  }

  function toggleAct(act: string) {
    if (!editing) return;
    const has = editing.doneActs.includes(act);
    setEditing({
      ...editing,
      doneActs: has
        ? editing.doneActs.filter((a) => a !== act)
        : [...editing.doneActs, act],
    });
  }

  function toggleKink(tag: string) {
    if (!editing) return;
    const has = editing.kinks.some((k) => k.tag === tag);
    setEditing({
      ...editing,
      kinks: has
        ? editing.kinks.filter((k) => k.tag !== tag)
        : [
            ...editing.kinks,
            { tag, role: "Both", status: "Like", intensity: 6 },
          ],
    });
  }

  function toggleDyn(tag: string) {
    if (!editing) return;
    const has = editing.dynTags.includes(tag);
    setEditing({
      ...editing,
      dynTags: has
        ? editing.dynTags.filter((t) => t !== tag)
        : [...editing.dynTags, tag],
    });
  }

  async function onPhoto(
    files: FileList | null,
    input?: HTMLInputElement | null,
  ) {
    if (!editing || !files?.length) return;
    const cap = PARTNER_PHOTO_LIMITS.perPartner;
    const room = cap - editing.photos.length;
    if (room <= 0) {
      if (input) input.value = "";
      return;
    }
    const hadNone = editing.photos.length === 0;
    const next = [...editing.photos];
    for (const file of Array.from(files).slice(0, room)) {
      next.push(await fileToPartnerPhoto(file));
    }
    setEditing({
      ...editing,
      photos: next,
      mainPhotoIndex: hadNone ? 0 : editing.mainPhotoIndex,
    });
    if (hadNone) setLooksFromIdx([0]);
    else {
      const added = Array.from(
        { length: next.length - editing.photos.length },
        (_, i) => editing.photos.length + i,
      );
      setLooksFromIdx((prev) => [...new Set([...prev, ...added])]);
    }
    if (input) input.value = "";
  }

  function setMainPhoto(index: number) {
    if (!editing) return;
    setEditing(withMainPhoto(editing, index));
  }

  function toggleLooksSource(index: number) {
    setLooksFromIdx((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index].sort((a, b) => a - b),
    );
    setLooksNote(null);
  }

  function removePhoto(index: number) {
    if (!editing) return;
    const photos = editing.photos.filter((_, j) => j !== index);
    let mainPhotoIndex = editing.mainPhotoIndex ?? 0;
    if (index === mainPhotoIndex) mainPhotoIndex = 0;
    else if (index < mainPhotoIndex) mainPhotoIndex -= 1;
    if (photos.length === 0) mainPhotoIndex = 0;
    else mainPhotoIndex = Math.min(mainPhotoIndex, photos.length - 1);
    setEditing({ ...editing, photos, mainPhotoIndex });
    setLooksFromIdx((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
        .filter((i) => i < photos.length),
    );
  }

  async function pullLooks() {
    if (!editing || !looksFromIdx.length) {
      setLooksNote("Choose one or more photos below first.");
      return;
    }
    const urls = looksFromIdx
      .map((i) => editing.photos[i])
      .filter(Boolean);
    if (!urls.length) {
      setLooksNote("Chosen photos are missing — pick again.");
      return;
    }
    const gender = editing.gender;
    const name = editing.name;
    setPullingLooks(true);
    setLooksNote(null);
    try {
      const result = await pullLooksFromPhotos(urls, { gender, name });
      setEditing((prev) => (prev ? { ...prev, looks: result.looks } : prev));
      setLooksNote(
        result.source === "vision"
          ? "Sexy looks blurb filled from chosen photo(s) via vision — edit freely."
          : "Sensual looks draft from chosen photo(s) — edit as needed. Add a vision API key for sharper photo-true descriptions.",
      );
    } catch (err) {
      setLooksNote(
        err instanceof Error ? err.message : "Could not pull looks from photos.",
      );
    } finally {
      setPullingLooks(false);
    }
  }

  function loadDemo() {
    if (
      partners.length &&
      !confirm("Replace current partners with ArkOfX demo people?")
    ) {
      return;
    }
    setPartners(arkDemoRoster());
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      {importNote && (
        <p
          role="status"
          className="mb-4 rounded-sm border border-[var(--ok)]/35 bg-[var(--ok)]/10 px-3 py-2 text-sm text-[var(--ok)]"
        >
          {importNote}
        </p>
      )}

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Partners
          </h1>
          <p className="mt-2 max-w-xl text-sm font-light text-[#c4b7a8]">
            Sex tracker — who, what you&apos;ve done, kinks, dynamics, photos.
            {storeMode === "database"
              ? " Saved to your Narcissus account."
              : " Stored on this device — "}
            {storeMode !== "database" && (
              <a
                href="/sign-in"
                className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
              >
                sign in
              </a>
            )}
            {storeMode !== "database" && " to save to your account."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadDemo}
            className="rounded-sm border border-[var(--line)] px-3 py-2 text-xs text-[#c4b7a8]"
          >
            Load Ark demo people
          </button>
          <button
            type="button"
            onClick={openNew}
            className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a120c]"
          >
            Add partner
          </button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", ...TYPES] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-sm border px-3 py-1.5 text-sm ${
              filter === f
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                : "border-[var(--line)] text-[#c4b7a8]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {editing && (
        <form
          onSubmit={persistEditor}
          className="mb-10 grid gap-4 border border-[var(--accent)]/40 bg-[var(--bg-elevated)]/60 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              className="text-2xl text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {partners.some((p) => p.id === editing.id) ? "Edit" : "New"}{" "}
              partner
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setLooksFromIdx([]);
                setLooksNote(null);
              }}
              className="text-xs text-[#c4b7a8]"
            >
              Cancel
            </button>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Photo file
            </legend>
            {mainPhoto(editing) ? (
              <div className="overflow-hidden border border-[var(--accent)]/50 bg-[#12100e]">
                <div className="flex max-h-96 min-h-48 w-full items-center justify-center bg-[#0c0a09]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainPhoto(editing)!}
                    alt="Main partner photo"
                    className="max-h-96 w-full object-contain"
                  />
                </div>
                <p className="px-3 py-2 text-xs text-[#c4b7a8]">
                  Main photo on top — fits full frame (no crop). Mark another
                  below to replace it.
                </p>
              </div>
            ) : (
              <p className="border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[#c4b7a8]">
                Empty photo file — add photos, then set one as main.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#c4b7a8]">
              <span>
                {editing.photos.length} / {PARTNER_PHOTO_LIMITS.perPartner}{" "}
                photos
                <span className="text-[var(--muted)]">
                  {" "}
                  · account limits later
                </span>
              </span>
              <label
                className={`cursor-pointer rounded-sm border px-3 py-1.5 text-xs uppercase tracking-wide ${
                  editing.photos.length >= PARTNER_PHOTO_LIMITS.perPartner
                    ? "pointer-events-none border-[var(--line)] opacity-40"
                    : "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                }`}
              >
                Add photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={
                    editing.photos.length >= PARTNER_PHOTO_LIMITS.perPartner
                  }
                  onChange={(e) => onPhoto(e.target.files, e.target)}
                  className="sr-only"
                />
              </label>
            </div>
            {editing.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {editing.photos.map((src, i) => {
                  const isMain = (editing.mainPhotoIndex ?? 0) === i;
                  const forLooks = looksFromIdx.includes(i);
                  return (
                    <div key={i} className="relative">
                      <button
                        type="button"
                        onClick={() => setMainPhoto(i)}
                        className={`block w-full overflow-hidden border bg-[#0c0a09] ${
                          isMain
                            ? "border-[var(--accent)]"
                            : "border-[var(--line)]"
                        }`}
                        title={isMain ? "Main photo" : "Set as main"}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          className="aspect-square h-auto w-full object-contain"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 bg-black/70 px-1.5 text-xs text-[var(--danger)]"
                      >
                        ×
                      </button>
                      <div className="mt-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => setMainPhoto(i)}
                          className={`w-full text-center text-[10px] uppercase tracking-wide ${
                            isMain
                              ? "text-[var(--accent-strong)]"
                              : "text-[#c4b7a8]"
                          }`}
                        >
                          {isMain ? "Main" : "Set main"}
                        </button>
                        <label className="flex cursor-pointer items-center justify-center gap-1 text-[10px] text-[#c4b7a8]">
                          <input
                            type="checkbox"
                            checked={forLooks}
                            onChange={() => toggleLooksSource(i)}
                            className="accent-[var(--accent)]"
                          />
                          For looks
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>

          <label className="grid gap-2 text-sm">
            <span className="uppercase tracking-[0.16em]">Name</span>
            <input
              required
              value={editing.name}
              onChange={(e) =>
                setEditing({ ...editing, name: e.target.value })
              }
              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="text-sm uppercase tracking-[0.16em]">
                Type
              </legend>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditing({ ...editing, type: t })}
                    className={`rounded-sm border px-3 py-1.5 text-sm ${
                      editing.type === t
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[#c4b7a8]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm uppercase tracking-[0.16em]">
                Gender
              </legend>
              <div className="flex flex-wrap gap-2">
                {PERSON_GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        gender: g,
                        isCouple: g === "couple",
                      })
                    }
                    className={`rounded-sm border px-3 py-1.5 text-sm ${
                      editing.gender === g
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[#c4b7a8]"
                    }`}
                  >
                    {genderLabel(g)}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <span className="uppercase tracking-[0.16em]">Looks</span>
              <button
                type="button"
                onClick={pullLooks}
                disabled={pullingLooks || !looksFromIdx.length}
                className="rounded-sm border border-[var(--accent)]/60 px-3 py-1.5 text-xs uppercase tracking-wide text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pullingLooks
                  ? "Pulling…"
                  : `Pull looks from ${looksFromIdx.length || 0} photo${
                      looksFromIdx.length === 1 ? "" : "s"
                    }`}
              </button>
            </div>
            <textarea
              value={editing.looks}
              onChange={(e) => {
                setEditing({ ...editing, looks: e.target.value });
                setLooksNote(null);
              }}
              rows={4}
              placeholder="Hair, eyes, body, style, vibe — or pull a sexy description from chosen photos"
              className="prompt-field min-h-[6rem] resize-y rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            />
            {looksNote && (
              <p className="text-xs text-[#c4b7a8]">{looksNote}</p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Types of sex / acts done
            </legend>
            <div className="flex flex-wrap gap-2">
              {DONE_ACTS.map((act) => {
                const on = editing.doneActs.includes(act);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => toggleAct(act)}
                    className={`rounded-sm border px-2.5 py-1 text-xs ${
                      on
                        ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[#c4b7a8]"
                    }`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Kinks
            </legend>
            <div className="flex flex-wrap gap-2">
              {ALL_KINKS.map((tag) => {
                const on = editing.kinks.some((k) => k.tag === tag);
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

          <fieldset className="space-y-2">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Dynamics
            </legend>
            <div className="flex flex-wrap gap-2">
              {DYN_TAGS.map((tag) => {
                const on = editing.dynTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDyn(tag)}
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
            <input
              value={editing.dynamics}
              onChange={(e) =>
                setEditing({ ...editing, dynamics: e.target.value })
              }
              placeholder="Dynamics summary…"
              className="prompt-field mt-2 w-full rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm"
            />
          </fieldset>

          <label className="grid gap-2 text-sm">
            <span className="uppercase tracking-[0.16em]">
              Sexual history with them
            </span>
            <textarea
              value={editing.history}
              onChange={(e) =>
                setEditing({ ...editing, history: e.target.value })
              }
              rows={3}
              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
              placeholder="What you've done, how it felt, ongoing dynamics…"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="uppercase tracking-[0.16em]">Notes</span>
            <textarea
              value={editing.notes}
              onChange={(e) =>
                setEditing({ ...editing, notes: e.target.value })
              }
              rows={2}
              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            />
          </label>

          <button
            type="submit"
            className="justify-self-start rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#1a120c]"
          >
            Save partner
          </button>
        </form>
      )}

      <div className="space-y-4">
        {visible.length === 0 && (
          <p className="text-sm text-[#c4b7a8]">
            No partners yet. Add one or load Ark demo people.
          </p>
        )}
        {visible.map((p) => {
          const hero = mainPhoto(p);
          return (
            <article
              key={p.id}
              className="overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/30"
            >
              {hero && (
                <div className="flex max-h-64 min-h-40 w-full items-center justify-center bg-[#0c0a09]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hero}
                    alt=""
                    className="max-h-64 w-full object-contain"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2
                      className="text-2xl text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {p.name}
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {p.type} · {genderLabel(p.gender)}
                      {p.doneActs.length
                        ? ` · ${p.doneActs.length} acts logged`
                        : ""}
                      {p.photos.length
                        ? ` · ${p.photos.length} photo${p.photos.length === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-[var(--accent-strong)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="text-[var(--danger)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {p.looks && (
                  <p className="mt-2 text-sm text-[#c4b7a8]">{p.looks}</p>
                )}
                {p.history && (
                  <p className="mt-2 text-sm leading-relaxed text-[#f7f1e8]/90]">
                    {p.history}
                  </p>
                )}
                {p.doneActs.length > 0 && (
                  <p className="mt-2 text-xs text-[#c4b7a8]">
                    <span className="text-[var(--ink)]">Acts:</span>{" "}
                    {p.doneActs.join(" · ")}
                  </p>
                )}
                {p.kinks.length > 0 && (
                  <p className="mt-1 text-xs text-[#c4b7a8]">
                    <span className="text-[var(--ink)]">Kinks:</span>{" "}
                    {normalizeKinks(p.kinks)
                      .map((k) => k.tag)
                      .join(" · ")}
                  </p>
                )}
                {p.photos.length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {p.photos.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className={`h-14 w-14 shrink-0 object-contain bg-[#0c0a09] border ${
                          (p.mainPhotoIndex ?? 0) === i
                            ? "border-[var(--accent)]"
                            : "border-[var(--line)]"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
