"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  ALL_KINKS,
  DONE_ACTS,
  DYN_TAGS,
  arkDemoRoster,
  emptyPartner,
  fileToPartnerPhoto,
  loadPartners,
  mainPhoto,
  normalizeKinks,
  savePartners,
  withMainPhoto,
  type PartnerRecord,
  type PersonGender,
  type PersonType,
} from "@/lib/artOfX";

const TYPES: PersonType[] = ["Real", "Dream", "Wanted"];
const GENDERS: PersonGender[] = ["woman", "man", "trans", "couple"];

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [filter, setFilter] = useState<"all" | PersonType>("all");
  const [editing, setEditing] = useState<PartnerRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPartners(loadPartners());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePartners(partners);
  }, [partners, ready]);

  const visible = useMemo(
    () =>
      filter === "all" ? partners : partners.filter((p) => p.type === filter),
    [partners, filter],
  );

  function openNew() {
    setEditing(emptyPartner(""));
  }

  function openEdit(p: PartnerRecord) {
    setEditing({
      ...p,
      kinks: normalizeKinks(p.kinks),
      photos: [...(p.photos || [])],
      mainPhotoIndex: p.mainPhotoIndex ?? 0,
      doneActs: [...(p.doneActs || [])],
      dynTags: [...(p.dynTags || [])],
    });
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
  }

  function remove(id: number) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
    if (editing?.id === id) setEditing(null);
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

  async function onPhoto(files: FileList | null) {
    if (!editing || !files?.length) return;
    const hadNone = editing.photos.length === 0;
    const next = [...editing.photos];
    for (const file of Array.from(files).slice(0, 4)) {
      if (next.length >= 6) break;
      next.push(await fileToPartnerPhoto(file));
    }
    setEditing({
      ...editing,
      photos: next,
      // First upload becomes main photo at the top
      mainPhotoIndex: hadNone ? 0 : editing.mainPhotoIndex,
    });
  }

  function setMainPhoto(index: number) {
    if (!editing) return;
    setEditing(withMainPhoto(editing, index));
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
            Stored on this device.
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
              onClick={() => setEditing(null)}
              className="text-xs text-[#c4b7a8]"
            >
              Cancel
            </button>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Main photo
            </legend>
            {mainPhoto(editing) ? (
              <div className="overflow-hidden border border-[var(--accent)]/50 bg-[#12100e]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainPhoto(editing)!}
                  alt="Main partner photo"
                  className="max-h-80 w-full object-cover object-top"
                />
                <p className="px-3 py-2 text-xs text-[#c4b7a8]">
                  This is the top / primary photo for cards and chat.
                </p>
              </div>
            ) : (
              <p className="border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[#c4b7a8]">
                No main photo yet — upload below, then tap Set as main.
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onPhoto(e.target.files)}
              className="text-sm text-[#c4b7a8] file:mr-3 file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-sm file:text-[#1a120c]"
            />
            {editing.photos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {editing.photos.map((src, i) => {
                  const isMain = (editing.mainPhotoIndex ?? 0) === i;
                  return (
                    <div key={i} className="relative w-24">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className={`h-24 w-24 object-cover border ${
                          isMain
                            ? "border-[var(--accent)]"
                            : "border-[var(--line)]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 bg-black/70 px-1.5 text-xs text-[var(--danger)]"
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        onClick={() => setMainPhoto(i)}
                        className={`mt-1 w-full rounded-sm border px-1 py-1 text-[10px] uppercase tracking-wide ${
                          isMain
                            ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent-strong)]"
                            : "border-[var(--line)] text-[#c4b7a8]"
                        }`}
                      >
                        {isMain ? "Main" : "Set as main"}
                      </button>
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
                {GENDERS.map((g) => (
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
                    {g}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="uppercase tracking-[0.16em]">Looks</span>
            <input
              value={editing.looks}
              onChange={(e) =>
                setEditing({ ...editing, looks: e.target.value })
              }
              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2"
            />
          </label>

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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero}
                  alt=""
                  className="max-h-56 w-full object-cover object-top"
                />
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
                      {p.type} · {p.gender}
                      {p.doneActs.length
                        ? ` · ${p.doneActs.length} acts logged`
                        : ""}
                      {p.photos.length > 1
                        ? ` · ${p.photos.length} photos`
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
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
