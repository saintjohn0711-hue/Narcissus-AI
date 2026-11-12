"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import {
  displayName,
  mainPhoto,
  savePartners,
  samePartnerId,
  type PartnerRecord,
} from "@/lib/artOfX";
import { fetchPartners, persistPartners } from "@/lib/artOfXStore";
import {
  MEMORY_KIND_LABEL,
  MEMORY_KINDS,
  mergeMemories,
  normalizeMemories,
  type MuseMemory,
  type MuseMemoryKind,
} from "@/lib/museChatMemory";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MuseMemoriesPage() {
  const params = useParams();
  const rawId = String(params.id || "");
  const museId = Number(rawId);

  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<MuseMemoryKind>("relationship");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const partnersRef = useRef<PartnerRecord[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchPartners();
        if (cancelled) return;
        setPartners(list);
        partnersRef.current = list;
      } catch {
        if (!cancelled) setError("Couldn’t load Muses.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const partner = useMemo(() => {
    if (!Number.isFinite(museId)) return null;
    return partners.find((p) => samePartnerId(p.id, museId)) || null;
  }, [partners, museId]);

  const memories = useMemo(
    () => normalizeMemories(partner?.memories),
    [partner?.memories],
  );

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(t);
  }, [flash]);

  async function persistPatch(patch: (p: PartnerRecord) => PartnerRecord) {
    if (!partner) return;
    const next = partnersRef.current.map((p) =>
      samePartnerId(p.id, partner.id) ? patch(p) : p,
    );
    setPartners(next);
    partnersRef.current = next;
    setSaving(true);
    setError(null);
    try {
      try {
        savePartners(next);
      } catch {
        // local quota / private mode
      }
      const saved = await persistPartners(next);
      setPartners(saved);
      partnersRef.current = saved;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Saved on this device — cloud sync failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !partner) return;

    if (editingId) {
      await persistPatch((p) => ({
        ...p,
        memories: normalizeMemories(p.memories).map((m) =>
          m.id === editingId
            ? {
                ...m,
                text,
                kind,
                source: "explicit" as const,
                at: new Date().toISOString(),
              }
            : m,
        ),
        updatedAt: new Date().toISOString(),
      }));
      setEditingId(null);
      setDraft("");
      setKind("relationship");
      setFlash("Memory updated");
      return;
    }

    const mem: MuseMemory = {
      id: `mem_${Date.now()}`,
      text,
      kind,
      at: new Date().toISOString(),
      source: "explicit",
      pairWith: null,
    };
    setDraft("");
    setKind("relationship");
    await persistPatch((p) => ({
      ...p,
      memories: mergeMemories(normalizeMemories(p.memories), [mem]),
      updatedAt: new Date().toISOString(),
    }));
    setFlash("Memory added");
  }

  async function forgetMemory(memoryId: string) {
    if (!partner) return;
    await persistPatch((p) => ({
      ...p,
      memories: normalizeMemories(p.memories).filter((m) => m.id !== memoryId),
      updatedAt: new Date().toISOString(),
    }));
    if (editingId === memoryId) {
      setEditingId(null);
      setDraft("");
      setKind("relationship");
    }
    setFlash("Memory forgotten");
  }

  function beginEdit(m: MuseMemory) {
    setEditingId(m.id);
    setDraft(m.text);
    setKind(m.kind);
    inputRef.current?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setKind("relationship");
  }

  const photo = partner ? mainPhoto(partner) : null;
  const name = partner ? displayName(partner) : "Muse";

  return (
    <main className="muse-memory-page mx-auto min-h-screen w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <AppNav />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <Link
          href="/art-of-x/partners"
          className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
        >
          Muses
        </Link>
        <span aria-hidden>/</span>
        {partner ? (
          <Link
            href={`/art-of-x/chat?muse=${partner.id}`}
            className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span>{Number.isFinite(museId) ? `Muse #${rawId}` : "Unknown"}</span>
        )}
        <span aria-hidden>/</span>
        <span className="text-[var(--accent-strong)]">Memories</span>
      </div>

      <header className="muse-memory-hero relative overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/50 px-5 py-6 sm:px-7 sm:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(520px 220px at 0% 0%, rgba(196,160,140,0.16), transparent 62%), radial-gradient(420px 200px at 100% 20%, rgba(0,163,255,0.08), transparent 55%)",
          }}
        />
        <div className="relative flex flex-wrap items-start gap-4 sm:gap-5">
          <div className="h-16 w-16 shrink-0 overflow-hidden border border-[var(--line)] bg-[#0c0a09] sm:h-20 sm:w-20">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl text-[var(--accent-strong)]/70">
                {(name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              What she remembers
            </p>
            <h1
              className="mt-1 text-2xl text-[var(--ink)] sm:text-[1.85rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
              data-testid="muse-memory-page-title"
            >
              {ready && !partner ? "Muse not found" : `${name}'s memories`}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#c4b7a8]">
              Durable facts that survive chat reset and load into Companion —
              nicknames, relationships, places, preferences. Synced to this
              device and your account when signed in.
            </p>
            {partner && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/art-of-x/chat?muse=${partner.id}`}
                  className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--soft)] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)]"
                >
                  Open chat
                </Link>
                <Link
                  href="/art-of-x/partners"
                  className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--soft)] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)]"
                >
                  All Muses
                </Link>
                <span className="self-center text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {memories.length} saved
                  {saving ? " · saving…" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {flash && (
        <p
          className="mt-4 text-xs text-[var(--accent-strong)]"
          data-testid="muse-memory-flash"
        >
          {flash}
        </p>
      )}
      {error && (
        <p className="mt-4 border border-[var(--danger)]/35 bg-[#3a1814]/80 px-3 py-2 text-sm text-[#f0c4b8]">
          {error}
        </p>
      )}

      {!ready ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Loading memories…</p>
      ) : !partner ? (
        <div className="mt-8 border border-[var(--line)] bg-[var(--bg-elevated)]/40 px-5 py-6">
          <p className="text-sm text-[#c4b7a8]">
            No Muse matches this link. Pick one from your list.
          </p>
          <Link
            href="/art-of-x/partners"
            className="mt-4 inline-block text-sm text-[var(--accent-strong)] underline-offset-2 hover:underline"
          >
            Back to Muses
          </Link>
        </div>
      ) : (
        <>
          <form
            className="muse-memory-form mt-6 border border-[var(--line)] bg-[#0a0e18]/80 px-4 py-4 sm:px-5"
            onSubmit={(e) => void onSubmit(e)}
            data-testid="muse-memory-page-form"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p
                className="text-sm text-[var(--ink)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {editingId ? "Edit memory" : "Add memory"}
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Grok-style · explicit save
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-xs text-[var(--muted)]">
                Memory
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Joey is her boyfriend"
                  maxLength={220}
                  className="mt-1 w-full rounded-sm border border-[var(--line)] bg-[#12182a] px-3 py-2.5 text-sm text-[var(--ink)]"
                  data-testid="muse-memory-page-input"
                />
              </label>
              <label className="text-xs text-[var(--muted)] sm:w-40">
                Kind
                <select
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as MuseMemoryKind)
                  }
                  className="mt-1 w-full rounded-sm border border-[var(--line)] bg-[#12182a] px-2 py-2.5 text-sm text-[var(--ink)]"
                  data-testid="muse-memory-page-kind"
                >
                  {MEMORY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {MEMORY_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-sm border border-[var(--line)] px-3 py-2.5 text-xs font-medium text-[var(--soft)]"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!draft.trim() || saving}
                  className="rounded-sm bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-[var(--on-accent)] disabled:opacity-50"
                  data-testid="muse-memory-page-save"
                >
                  {editingId ? "Update" : "Add memory"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
              Tip: “Joey is her boyfriend” (Relationship) · “Wants Joey to be
              bisexual” (Preference). Chat can also auto-save from “remember …”.
            </p>
          </form>

          <section
            className="mt-6"
            aria-label={`${name} memory list`}
            data-testid="muse-memory-page-list"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2
                className="text-lg text-[var(--ink)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Saved
              </h2>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Newest first
              </p>
            </div>

            {memories.length === 0 ? (
              <div className="border border-dashed border-[var(--line)] bg-[var(--bg-elevated)]/30 px-4 py-8 text-center">
                <p className="text-sm text-[#c4b7a8]">
                  Nothing saved yet — add one above.
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Example: Joey is her boyfriend · Wants Joey bisexual
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {memories.map((m) => (
                  <li
                    key={m.id}
                    className="muse-memory-row flex items-start justify-between gap-3 border border-[var(--line)]/80 bg-[#12182a]/55 px-3 py-3 sm:px-4"
                    data-testid={`muse-memory-row-${m.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">
                        {MEMORY_KIND_LABEL[m.kind] || m.kind}
                        {m.source === "explicit" ? " · saved" : " · auto"}
                        {m.pairWith != null ? " · dual-cast" : ""}
                        {m.at ? ` · ${formatWhen(m.at)}` : ""}
                      </p>
                      <p className="mt-1 text-[0.95rem] leading-snug text-[#f7f1e8]">
                        {m.text}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => beginEdit(m)}
                        className="rounded-sm border border-[var(--line)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--soft)] hover:text-[var(--ink)]"
                        data-testid={`muse-memory-edit-${m.id}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void forgetMemory(m.id)}
                        className="rounded-sm border border-[var(--danger)]/35 px-2.5 py-1.5 text-[10px] font-medium text-[#f0c4b8] hover:bg-[var(--danger)]/10"
                        data-testid={`muse-memory-forget-${m.id}`}
                      >
                        Forget
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
