"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { CatalogMultiSelect } from "@/components/CatalogMultiSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { PartnerCard } from "@/components/PartnerCard";
import { UiButton } from "@/components/UiButton";
import {
  ACT_GROUPS,
  DYN_TAGS,
  KINK_GROUPS,
  MAX_MUSE_CAST_MATES,
  MUSE_SORT_OPTIONS,
  PARTNER_PHOTO_LIMITS,
  PERSON_GENDERS,
  PERSON_LABEL,
  arkDemoRoster,
  canonicalizeAct,
  displayName,
  emptyPartner,
  fileToPartnerPhoto,
  genderLabel,
  loadMuseOrder,
  mainPhoto,
  normalizeDoneActs,
  normalizeKinks,
  normalizePairedWith,
  pairedMusesFor,
  samePartnerId,
  saveMuseOrder,
  sortMuses,
  toggleMusePairing,
  withMainPhoto,
  type MuseSortMode,
  type PartnerRecord,
  type PersonType,
} from "@/lib/artOfX";
import {
  OUTLETS,
  museMatchesOutlet,
  parseOutletParam,
  partnersHrefForOutlet,
  type OutletId,
} from "@/lib/outlets";
import {
  consumePartnersPersistNotice,
  fetchPartners,
  getStoreMode,
  persistPartners,
  type StoreMode,
} from "@/lib/artOfXStore";
import { markDemoMusesSeeded, narcissusDemoRoster } from "@/lib/demoMuses";
import {
  applyDreamMuseFill,
  parseDreamMuseLocal,
} from "@/lib/dreamMuse";
import { pullLooksFromPhotos } from "@/lib/looksFromPhoto";
import {
  MuseVoicePreviewBar,
  useMuseVoicePreview,
} from "@/components/MuseVoicePreview";
import {
  accentFromVoiceId,
  defaultVoiceGender,
  encodeAccentVoiceId,
  MUSE_VOICE_ACCENTS,
  presetsForGender,
  voiceSettingsFromPartner,
  type MuseVoiceAccentId,
  type MuseVoiceGender,
  type MuseVoicePresetId,
} from "@/lib/museVoice";

const TYPES: PersonType[] = ["Real", "Dream", "Wanted"];
const VOICE_GENDERS: MuseVoiceGender[] = ["female", "male"];

export default function PartnersPage() {
  return (
    <Suspense
      fallback={
        <PageShell width="lg">
          <AppNav />
          <p className="mt-8 text-sm text-[var(--muted)]">Loading Muses…</p>
        </PageShell>
      }
    >
      <PartnersPageInner />
    </Suspense>
  );
}

function PartnersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outlet = parseOutletParam(searchParams.get("outlet"));
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [filter, setFilter] = useState<"all" | PersonType>("all");
  const [sortMode, setSortMode] = useState<MuseSortMode>("manual");
  const [manualOrder, setManualOrder] = useState<number[]>([]);
  const [editing, setEditing] = useState<PartnerRecord | null>(null);
  /** Muse id waiting on delete confirm — null when no dialog. */
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const voicePreview = useMuseVoicePreview();
  /** Photo indexes chosen as sources for “Pull looks” */
  const [looksFromIdx, setLooksFromIdx] = useState<number[]>([]);
  const [pullingLooks, setPullingLooks] = useState(false);
  const [looksNote, setLooksNote] = useState<string | null>(null);
  const [storeMode, setStoreMode] = useState<StoreMode>("local");
  const [ready, setReady] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [dreamDesc, setDreamDesc] = useState("");
  const [dreamNote, setDreamNote] = useState<string | null>(null);
  const [dreaming, setDreaming] = useState(false);
  const [pairingForId, setPairingForId] = useState<number | null>(null);
  /** Skip the persist effect when applying server-returned ids. */
  const syncingFromServer = useRef(false);
  const editorRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = searchParams.get("imported");
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      setImportNote(
        `Imported ${n} ${n === 1 ? PERSON_LABEL.singularLower : PERSON_LABEL.pluralLower} to your account`,
      );
    }
    const next = partnersHrefForOutlet(outlet);
    window.history.replaceState({}, "", next);
  }, [searchParams, outlet]);

  function setOutlet(next: OutletId | null) {
    router.replace(partnersHrefForOutlet(next), { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mode = await getStoreMode();
      const list = await fetchPartners();
      if (cancelled) return;
      setStoreMode(mode);
      syncingFromServer.current = true;
      setPartners(list);
      const stored = loadMuseOrder();
      const ids = list.map((p) => Number(p.id));
      const merged = [
        ...stored.filter((id) => ids.includes(id)),
        ...ids.filter((id) => !stored.includes(id)),
      ];
      setManualOrder(merged);
      saveMuseOrder(merged);
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
    if (syncingFromServer.current) {
      syncingFromServer.current = false;
      return;
    }
    let cancelled = false;
    void persistPartners(partners)
      .then((saved) => {
        if (cancelled) return;
        setSaveError(null);
        const notice = consumePartnersPersistNotice();
        setSaveNote(notice);
        const sameIds =
          saved.length === partners.length &&
          saved.every((p) =>
            partners.some((q) => samePartnerId(q.id, p.id)),
          );
        const photosChanged = saved.some((p) => {
          const q = partners.find((row) => samePartnerId(row.id, p.id));
          if (!q) return true;
          return (
            (q.photos?.length || 0) !== (p.photos?.length || 0) ||
            (q.photos || []).some(
              (src, i) => (p.photos?.[i]?.length || 0) !== (src?.length || 0),
            )
          );
        });
        if (!sameIds || photosChanged || notice) {
          syncingFromServer.current = true;
          setPartners(saved);
          // Keep the open editor pointed at the remapped / compacted row
          setEditing((ed) => {
            if (!ed) return ed;
            const match =
              saved.find((p) => samePartnerId(p.id, ed.id)) ||
              saved.find(
                (p) =>
                  p.createdAt === ed.createdAt &&
                  p.name.trim().toLowerCase() === ed.name.trim().toLowerCase(),
              );
            return match
              ? {
                  ...ed,
                  id: Number(match.id),
                  photos: [...(match.photos || [])],
                  mainPhotoIndex: match.mainPhotoIndex ?? 0,
                }
              : ed;
          });
          const ids = saved.map((p) => Number(p.id));
          setManualOrder((prev) => {
            const next = [
              ...prev.filter((id) => ids.includes(id)),
              ...ids.filter((id) => !prev.includes(id)),
            ];
            saveMuseOrder(next);
            return next;
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSaveNote(null);
        setSaveError(
          err instanceof Error
            ? err.message
            : `Could not save ${PERSON_LABEL.pluralLower} to your account`,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [partners, ready]);

  const visible = useMemo(() => {
    let list = partners;
    if (outlet) {
      list = list.filter((p) => museMatchesOutlet(p.gender, outlet));
    }
    if (filter !== "all") {
      list = list.filter((p) => p.type === filter);
    }
    return sortMuses(list, sortMode, manualOrder);
  }, [partners, filter, outlet, sortMode, manualOrder]);

  const outletTitle = outlet
    ? OUTLETS.find((o) => o.id === outlet)?.label ?? PERSON_LABEL.plural
    : PERSON_LABEL.plural;

  function scrollEditorIntoView() {
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openNew() {
    setEditing(emptyPartner("", partners));
    setLooksFromIdx([]);
    setLooksNote(null);
    setDreamDesc("");
    setDreamNote(null);
    scrollEditorIntoView();
  }

  function openEdit(p: PartnerRecord) {
    const main = p.mainPhotoIndex ?? 0;
    setEditing({
      ...p,
      id: Number(p.id),
      kinks: normalizeKinks(p.kinks),
      photos: [...(p.photos || [])],
      mainPhotoIndex: main,
      doneActs: [...(p.doneActs || [])],
      dynTags: [...(p.dynTags || [])],
      pairedWith: normalizePairedWith(p.pairedWith, p.id),
    });
    setLooksFromIdx(p.photos?.length ? [main] : []);
    setLooksNote(null);
    setDreamDesc("");
    setDreamNote(null);
    scrollEditorIntoView();
  }

  async function fillFromDescription() {
    if (!editing) return;
    const description = dreamDesc.trim();
    if (!description) {
      setDreamNote("Describe your dream Muse first — looks, kinks, vibe.");
      return;
    }
    setDreaming(true);
    setDreamNote(null);
    try {
      const res = await fetch("/api/art-of-x/dream-muse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          fill?: Parameters<typeof applyDreamMuseFill>[1];
          note?: string;
          source?: string;
        };
        if (data.fill) {
          setEditing((prev) =>
            prev ? applyDreamMuseFill(prev, data.fill!) : prev,
          );
          setDreamNote(data.note || "Filled from description — tweak chips as you like.");
          return;
        }
      }
      const local = parseDreamMuseLocal(description);
      setEditing((prev) =>
        prev ? applyDreamMuseFill(prev, local.fill) : prev,
      );
      setDreamNote(local.note);
    } catch {
      const local = parseDreamMuseLocal(description);
      setEditing((prev) =>
        prev ? applyDreamMuseFill(prev, local.fill) : prev,
      );
      setDreamNote(local.note);
    } finally {
      setDreaming(false);
    }
  }

  function setPairWith(aId: number, bId: number) {
    setPartners((prev) => toggleMusePairing(prev, aId, bId));
    setPairingForId(null);
    // Keep open editor draft in sync so Save doesn’t wipe the toggle
    setEditing((ed) => {
      if (!ed) return ed;
      if (!samePartnerId(ed.id, aId) && !samePartnerId(ed.id, bId)) return ed;
      const otherId = samePartnerId(ed.id, aId) ? bId : aId;
      const cur = normalizePairedWith(ed.pairedWith, ed.id);
      const has = cur.some((id) => samePartnerId(id, otherId));
      if (!has && cur.length >= MAX_MUSE_CAST_MATES) return ed;
      return {
        ...ed,
        pairedWith: has
          ? cur.filter((id) => !samePartnerId(id, otherId))
          : normalizePairedWith([...cur, otherId], ed.id),
      };
    });
  }

  /** Add/remove a “been together” link from the open Muse editor draft. */
  function toggleEditPair(otherId: number) {
    if (!editing) return;
    const aId = Number(editing.id);
    const bId = Number(otherId);
    if (!Number.isFinite(bId) || samePartnerId(aId, bId)) return;
    const cur = normalizePairedWith(editing.pairedWith, editing.id);
    const has = cur.some((id) => samePartnerId(id, bId));
    if (!has && cur.length >= MAX_MUSE_CAST_MATES) return;
    const nextPaired = has
      ? cur.filter((id) => !samePartnerId(id, bId))
      : normalizePairedWith([...cur, bId], editing.id);
    setEditing({ ...editing, pairedWith: nextPaired });
    // Bidirectional sync when both Muses already exist in the roster
    setPartners((prev) => {
      const aExists = prev.some((p) => samePartnerId(p.id, aId));
      const bExists = prev.some((p) => samePartnerId(p.id, bId));
      if (aExists && bExists) return toggleMusePairing(prev, aId, bId);
      if (!bExists) return prev;
      // New Muse draft: only update the other side’s link
      return prev.map((p) => {
        if (!samePartnerId(p.id, bId)) return p;
        const linked = normalizePairedWith(p.pairedWith, p.id);
        const already = linked.some((id) => samePartnerId(id, aId));
        if (has && already) {
          return {
            ...p,
            pairedWith: linked.filter((id) => !samePartnerId(id, aId)),
            updatedAt: new Date().toISOString(),
          };
        }
        if (!has && !already) {
          return {
            ...p,
            pairedWith: normalizePairedWith([...linked, aId], p.id),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
    });
  }

  const togetherPairs = useMemo(() => {
    const pairs: Array<{ a: PartnerRecord; b: PartnerRecord; key: string }> =
      [];
    const seen = new Set<string>();
    for (const p of partners) {
      for (const other of pairedMusesFor(p, partners)) {
        const lo = Math.min(Number(p.id), Number(other.id));
        const hi = Math.max(Number(p.id), Number(other.id));
        const key = `${lo}-${hi}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ a: p, b: other, key });
      }
    }
    return pairs;
  }, [partners]);

  function persistEditor(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    const next = {
      ...editing,
      id: Number(editing.id),
      name: editing.name.trim(),
      pairedWith: normalizePairedWith(editing.pairedWith, editing.id).slice(
        0,
        MAX_MUSE_CAST_MATES,
      ),
      updatedAt: new Date().toISOString(),
    };
    const desiredPairs = new Set(next.pairedWith.map((id) => Number(id)));
    setPartners((prev) => {
      const i = prev.findIndex((p) => samePartnerId(p.id, next.id));
      let list: PartnerRecord[];
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = next;
        list = copy;
      } else {
        setManualOrder((order) => {
          const ids = [
            Number(next.id),
            ...order.filter((id) => id !== Number(next.id)),
          ];
          saveMuseOrder(ids);
          return ids;
        });
        list = [next, ...prev];
      }
      // Reconcile reciprocal “been together” links from the saved Muse
      return list.map((p) => {
        if (samePartnerId(p.id, next.id)) return p;
        const linked = normalizePairedWith(p.pairedWith, p.id);
        const hasLink = linked.some((id) => samePartnerId(id, next.id));
        const shouldLink = desiredPairs.has(Number(p.id));
        if (hasLink === shouldLink) return p;
        return {
          ...p,
          pairedWith: shouldLink
            ? normalizePairedWith([...linked, next.id], p.id)
            : linked.filter((id) => !samePartnerId(id, next.id)),
          updatedAt: next.updatedAt,
        };
      });
    });
    setEditing(null);
    setLooksFromIdx([]);
    setLooksNote(null);
  }

  function requestRemove(id: number) {
    setPendingDeleteId(Number(id));
  }

  function cancelRemove() {
    setPendingDeleteId(null);
  }

  function confirmRemove() {
    if (pendingDeleteId == null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    remove(id);
  }

  function remove(id: number) {
    setPartners((prev) => prev.filter((p) => !samePartnerId(p.id, id)));
    setManualOrder((prev) => {
      const next = prev.filter((x) => !samePartnerId(x, id));
      saveMuseOrder(next);
      return next;
    });
    if (editing && samePartnerId(editing.id, id)) {
      setEditing(null);
      setLooksFromIdx([]);
      setLooksNote(null);
    }
  }

  const pendingDeleteMuse =
    pendingDeleteId != null
      ? partners.find((p) => samePartnerId(p.id, pendingDeleteId)) ?? null
      : null;
  const pendingDeleteName = pendingDeleteMuse
    ? displayName(pendingDeleteMuse)
    : editing &&
        pendingDeleteId != null &&
        samePartnerId(editing.id, pendingDeleteId)
      ? displayName(editing)
      : null;

  function moveMuse(id: number, dir: -1 | 1) {
    setSortMode("manual");
    setManualOrder((prev) => {
      const ids = prev.length
        ? [...prev]
        : partners.map((p) => Number(p.id));
      // Ensure every current muse is represented
      for (const p of partners) {
        const n = Number(p.id);
        if (!ids.includes(n)) ids.push(n);
      }
      const i = ids.findIndex((x) => samePartnerId(x, id));
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= ids.length) return prev;
      const copy = [...ids];
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
      saveMuseOrder(copy);
      return copy;
    });
  }

  function setFeaturedPhoto(id: number, index: number) {
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? withMainPhoto(p, index) : p)),
    );
  }

  function toggleAct(act: string) {
    if (!editing) return;
    const tag = canonicalizeAct(act);
    if (!tag) return;
    const current = normalizeDoneActs(editing.doneActs);
    const has = current.includes(tag);
    setEditing({
      ...editing,
      doneActs: has
        ? current.filter((a) => a !== tag)
        : [...current, tag],
    });
  }

  /** Inline Muse-row act toggle — persists without opening the full editor. */
  function togglePartnerAct(partnerId: number, act: string) {
    const tag = canonicalizeAct(act);
    setPartners((prev) =>
      prev.map((p) => {
        if (!samePartnerId(p.id, partnerId)) return p;
        const current = normalizeDoneActs(p.doneActs);
        const has = current.includes(tag);
        return {
          ...p,
          doneActs: has
            ? current.filter((a) => a !== tag)
            : [...current, tag],
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    setEditing((ed) => {
      if (!ed || !samePartnerId(ed.id, partnerId)) return ed;
      const current = normalizeDoneActs(ed.doneActs);
      const has = current.includes(tag);
      return {
        ...ed,
        doneActs: has
          ? current.filter((a) => a !== tag)
          : [...current, tag],
      };
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
      setLooksNote(`Limit reached — ${cap} photos per Muse.`);
      if (input) input.value = "";
      return;
    }
    const selected = Array.from(files);
    const truncated = selected.length > room;
    const batch = selected.slice(0, room);
    const hadNone = editing.photos.length === 0;
    const next = [...editing.photos];
    const failed: string[] = [];
    for (const file of batch) {
      if (!file.type.startsWith("image/")) {
        failed.push(file.name || "file");
        continue;
      }
      try {
        next.push(await fileToPartnerPhoto(file));
      } catch {
        failed.push(file.name || "photo");
      }
    }
    if (next.length === editing.photos.length) {
      setLooksNote(
        failed.length
          ? `Couldn’t read ${failed.length === 1 ? "that photo" : "those photos"} — try JPEG/PNG/WebP.`
          : "No photos added.",
      );
      if (input) input.value = "";
      return;
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
    const notes: string[] = [];
    if (truncated) {
      notes.push(`Only ${room} more photo${room === 1 ? "" : "s"} fit — extras skipped.`);
    }
    if (failed.length) {
      notes.push(
        `${failed.length} file${failed.length === 1 ? "" : "s"} couldn’t be read.`,
      );
    }
    if (notes.length) setLooksNote(notes.join(" "));
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
          : "Sensual looks draft from chosen photo(s) — edit as needed. Vision was unavailable (key, size, or upstream) — local draft used.",
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
      !confirm(
        `Replace current ${PERSON_LABEL.pluralLower} with ArkOfX demo people?`,
      )
    ) {
      return;
    }
    const demo = arkDemoRoster();
    setPartners(demo);
    const ids = demo.map((p) => Number(p.id));
    setManualOrder(ids);
    saveMuseOrder(ids);
  }

  function loadStarterMuses() {
    if (
      partners.length &&
      !confirm(
        `Replace current ${PERSON_LABEL.pluralLower} with Woman, Rocky, and Jaxx?`,
      )
    ) {
      return;
    }
    const demo = narcissusDemoRoster();
    markDemoMusesSeeded();
    setPartners(demo);
    const ids = demo.map((p) => Number(p.id));
    setManualOrder(ids);
    saveMuseOrder(ids);
  }

  return (
    <PageShell width="lg">
      <AppNav />
      {importNote && (
        <p
          role="status"
          className="mb-4 rounded-sm border border-[var(--ok)]/35 bg-[var(--ok)]/10 px-3 py-2 text-sm text-[var(--ok)]"
        >
          {importNote}
        </p>
      )}
      {saveError && (
        <p
          role="alert"
          className="mb-4 rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          Save failed: {saveError}
        </p>
      )}
      {saveNote && !saveError && (
        <p
          role="status"
          className="mb-4 rounded-sm border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent-strong)]"
        >
          {saveNote}
        </p>
      )}

      <PageHeader
        dense
        kicker={outlet ? `Outlet · ${outletTitle}` : "All outlets"}
        kickerTone="glow"
        title={outlet ? `${outletTitle}` : PERSON_LABEL.plural}
        lede={
          <>
            Dense ledger — scan every Muse, log sexual acts inline, expand for
            details.
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
          </>
        }
        actions={
          <>
            <UiButton tone="ghost" onClick={loadStarterMuses}>
              Starter Muses
            </UiButton>
            <UiButton tone="ghost" onClick={loadDemo}>
              Ark demo
            </UiButton>
            <UiButton tone="primary" onClick={openNew}>
              Add {PERSON_LABEL.singularLower}
            </UiButton>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="navigation" aria-label="Outlets">
        <button
          type="button"
          onClick={() => setOutlet(null)}
          className={`outlet-chip ${outlet === null ? "is-active" : ""}`}
        >
          All
        </button>
        {OUTLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOutlet(o.id)}
            className={`outlet-chip ${outlet === o.id ? "is-active" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
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
              {f === "all" ? "Type · all" : f}
            </button>
          ))}
        </div>
        <label className="grid gap-1.5 text-xs text-[#c4b7a8]">
          <span className="uppercase tracking-[0.18em] text-[var(--muted)]">
            Sort
          </span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as MuseSortMode)}
            className="rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm text-[var(--ink)]"
          >
            {MUSE_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {editing && (
        <form
          ref={editorRef}
          onSubmit={persistEditor}
          className="mb-10 scroll-mt-6 grid gap-4 border border-[var(--accent)]/40 bg-[var(--bg-elevated)]/60 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              className="text-2xl text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {partners.some((p) => samePartnerId(p.id, editing.id))
                ? "Edit"
                : "New"}{" "}
              {PERSON_LABEL.singularLower}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {partners.some((p) => samePartnerId(p.id, editing.id)) && (
                <button
                  type="button"
                  onClick={() => requestRemove(Number(editing.id))}
                  className="text-xs text-[var(--danger)] underline-offset-2 hover:underline"
                  data-testid="muse-edit-delete"
                >
                  Delete {PERSON_LABEL.singularLower}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setLooksFromIdx([]);
                  setLooksNote(null);
                  setDreamDesc("");
                  setDreamNote(null);
                }}
                className="text-xs text-[#c4b7a8]"
              >
                Cancel
              </button>
            </div>
          </div>

          <fieldset className="space-y-3 rounded-sm border border-[var(--accent)]/30 bg-[#14111a]/55 p-4">
            <legend className="px-1 text-sm uppercase tracking-[0.16em] text-[var(--accent-strong)]">
              Dream from description
            </legend>
            <p className="text-xs leading-relaxed text-[#c4b7a8]">
              Describe your dream Muse — looks, kinks, dynamics, vibe. We&apos;ll
              auto-pick matching chips on this form (xAI when available, keywords
              otherwise). Tweak anything after.
            </p>
            <textarea
              value={dreamDesc}
              onChange={(e) => {
                setDreamDesc(e.target.value);
                setDreamNote(null);
              }}
              rows={4}
              placeholder="e.g. Dream: fierce brunette femdom who loves bondage, pegging, dirty talk — rough but playful, free-use energy…"
              className="prompt-field w-full rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void fillFromDescription()}
                disabled={dreaming || !dreamDesc.trim()}
                className="rounded-sm border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {dreaming ? "Filling…" : "Fill from description"}
              </button>
              {dreamNote && (
                <p className="text-xs text-[#c4b7a8]" role="status">
                  {dreamNote}
                </p>
              )}
            </div>
          </fieldset>

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
                        aria-label={`Delete photo ${i + 1}`}
                        data-testid="muse-photo-delete"
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
                    onClick={() => {
                      const nextVoice = defaultVoiceGender(g);
                      const keepVoice =
                        editing.voiceGender ===
                        defaultVoiceGender(editing.gender);
                      setEditing({
                        ...editing,
                        gender: g,
                        isCouple: g === "couple",
                        voiceGender: keepVoice
                          ? nextVoice
                          : editing.voiceGender,
                        voicePreset: keepVoice ? "auto" : editing.voicePreset,
                      });
                    }}
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

          <fieldset className="space-y-3" data-testid="muse-voice-settings">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Chat voice
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Sexy female or male narration for Companion chat. Natural OpenAI TTS
              when <code className="text-[var(--soft)]">OPENAI_API_KEY</code> is
              set on Vercel; otherwise this browser’s voice (soft recovery — never
              blocks chat). Pick gender, accent (locale), and delivery — each
              selection plays a short preview.
            </p>
            <div className="flex flex-wrap gap-2">
              {VOICE_GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    const next = {
                      ...editing,
                      voiceGender: g,
                      voicePreset: "auto" as MuseVoicePresetId,
                      // Keep accent locale across gender flips
                      voiceId: encodeAccentVoiceId(
                        accentFromVoiceId(editing.voiceId),
                      ),
                    };
                    setEditing(next);
                    voicePreview.preview(voiceSettingsFromPartner(next));
                  }}
                  className={`rounded-sm border px-3 py-1.5 text-sm capitalize ${
                    editing.voiceGender === g
                      ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                      : "border-[var(--line)] text-[#c4b7a8]"
                  }`}
                  data-testid={`muse-voice-gender-${g}`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Accent
              </p>
              <div className="muse-voice-chip-row">
                {MUSE_VOICE_ACCENTS.map((a) => {
                  const selected =
                    accentFromVoiceId(editing.voiceId) === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      title={a.blurb}
                      onClick={() => {
                        const next = {
                          ...editing,
                          voiceId: encodeAccentVoiceId(
                            a.id as MuseVoiceAccentId,
                          ),
                        };
                        setEditing(next);
                        voicePreview.preview(voiceSettingsFromPartner(next));
                      }}
                      className={`muse-voice-chip ${
                        selected ? "muse-voice-chip--on" : ""
                      }`}
                      data-testid={`muse-voice-accent-${a.id}`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Delivery
              </p>
              <div className="flex flex-wrap gap-2">
                {presetsForGender(editing.voiceGender || "female").map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.blurb}
                    onClick={() => {
                      const next = {
                        ...editing,
                        voicePreset: p.id as MuseVoicePresetId,
                      };
                      setEditing(next);
                      voicePreview.preview(voiceSettingsFromPartner(next));
                    }}
                    className={`rounded-sm border px-3 py-1.5 text-sm ${
                      editing.voicePreset === p.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[#c4b7a8]"
                    }`}
                    data-testid={`muse-voice-preset-${p.id}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <MuseVoicePreviewBar
              api={voicePreview}
              settings={voiceSettingsFromPartner(editing)}
            />
          </fieldset>

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
              placeholder="Sexy, specific looks — hair, body, presence — or pull from chosen photos"
              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 leading-relaxed"
            />
            {looksNote && (
              <p className="text-xs text-[#c4b7a8]">{looksNote}</p>
            )}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Acts logged
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Tap a labeled box to log or undo — same pick style as voice and
              Dynamics. Filter when the list is long; selected glow shows what
              counts for this Muse.
            </p>
            <CatalogMultiSelect
              groups={ACT_GROUPS}
              selected={normalizeDoneActs(editing.doneActs)}
              onToggle={toggleAct}
              label="Filter acts"
              searchPlaceholder="Filter boxes — blowjob, given, anal…"
              allowCustom
              customPlaceholder="Add custom act…"
            />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Kinks
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Tap boxes for desires — oral, toys, power, and more. Glow means
              on; tap again to clear. Filter or add custom when you need it.
            </p>
            <CatalogMultiSelect
              groups={KINK_GROUPS}
              selected={normalizeKinks(editing.kinks).map((k) => k.tag)}
              onToggle={toggleKink}
              label="Filter kinks"
              searchPlaceholder="Filter boxes — bondage, free-use…"
              allowCustom
              customPlaceholder="Add custom kink…"
            />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Dynamics
            </legend>
            {editing.dynTags.length > 0 && (
              <ul className="border border-[var(--line)] bg-[#0f0d0b]/55 px-3 py-2">
                {editing.dynTags.map((tag) => (
                  <li
                    key={tag}
                    className="flex items-center justify-between gap-3 border-b border-[var(--line)]/70 py-1.5 last:border-0"
                  >
                    <span className="text-sm text-[#f7f1e8]/92%">{tag}</span>
                    <button
                      type="button"
                      onClick={() => toggleDyn(tag)}
                      className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[var(--danger)] underline-offset-2 hover:underline"
                      data-testid="dyn-remove"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
                    aria-pressed={on}
                  >
                    {on ? tag : `+ ${tag}`}
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

          <fieldset className="space-y-3" data-testid="muse-edit-pairing">
            <legend className="text-sm uppercase tracking-[0.16em]">
              Been together
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Pair this Muse with others you&apos;ve played with (up to{" "}
              {MAX_MUSE_CAST_MATES}). Add from the roster; Remove unpairs.
            </p>
            {normalizePairedWith(editing.pairedWith, editing.id).length ===
            0 ? (
              <p className="text-sm text-[var(--muted)]">
                No pairs yet — add another Muse below.
              </p>
            ) : (
              <ul className="border border-[var(--line)] bg-[#0f0d0b]/55 px-3 py-2">
                {normalizePairedWith(editing.pairedWith, editing.id).map(
                  (id) => {
                    const other = partners.find((p) =>
                      samePartnerId(p.id, id),
                    );
                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-3 border-b border-[var(--line)]/70 py-1.5 last:border-0"
                      >
                        <span className="text-sm text-[#f7f1e8]/92%">
                          {other ? displayName(other) : `Muse #${id}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleEditPair(Number(id))}
                          className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[var(--danger)] underline-offset-2 hover:underline"
                          data-testid="muse-edit-unpair"
                        >
                          Remove
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            )}
            {(() => {
              const pairedIds = new Set(
                normalizePairedWith(editing.pairedWith, editing.id).map((id) =>
                  Number(id),
                ),
              );
              const atCap = pairedIds.size >= MAX_MUSE_CAST_MATES;
              const candidates = partners.filter(
                (other) =>
                  !samePartnerId(other.id, editing.id) &&
                  !pairedIds.has(Number(other.id)),
              );
              if (atCap) {
                return (
                  <p className="text-xs text-[var(--muted)]">
                    Cast full ({MAX_MUSE_CAST_MATES} mates) — remove one to add
                    another.
                  </p>
                );
              }
              if (candidates.length === 0) {
                return (
                  <p className="text-xs text-[var(--muted)]">
                    {partners.length <= 1
                      ? "Save this Muse, then add another to pair."
                      : "Already paired with everyone on the list."}
                  </p>
                );
              }
              return (
                <div className="flex flex-wrap gap-1.5">
                  {candidates.map((other) => (
                    <button
                      key={other.id}
                      type="button"
                      onClick={() => toggleEditPair(Number(other.id))}
                      className="rounded-sm border border-[var(--line)] px-2 py-0.5 text-[11px] text-[#c4b7a8] transition hover:border-[var(--accent)]/50 hover:text-[var(--ink)]"
                      data-testid="muse-edit-pair-add"
                    >
                      + {displayName(other)}
                    </button>
                  ))}
                </div>
              );
            })()}
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
            Save {PERSON_LABEL.singularLower}
          </button>
        </form>
      )}

      {togetherPairs.length > 0 && (
        <section
          className="mb-8 border border-[var(--line)] bg-[var(--bg-elevated)]/40 p-4 sm:p-5"
          aria-label={`${PERSON_LABEL.plural} who've been together`}
        >
          <h2
            className="text-xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Been together
          </h2>
          <p className="mt-1 text-xs text-[#c4b7a8]">
            Muses who&apos;ve played with each other — open a pair in chat, or
            add more from the cast picker (up to four).
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {togetherPairs.map(({ a, b, key }) => (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] bg-[#12101a]/55 px-3 py-2.5"
              >
                <p className="text-sm text-[var(--ink)]">
                  <span style={{ fontFamily: "var(--font-display), serif" }}>
                    {displayName(a)}
                  </span>
                  <span className="mx-2 text-[var(--muted)]">×</span>
                  <span style={{ fontFamily: "var(--font-display), serif" }}>
                    {displayName(b)}
                  </span>
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <a
                    href={`/art-of-x/chat?muse=${a.id}&with=${b.id}`}
                    className="text-[var(--glow-mid)] underline-offset-2 hover:text-[var(--glow)] hover:underline"
                  >
                    Chat together
                  </a>
                  <button
                    type="button"
                    onClick={() => setPairWith(a.id, b.id)}
                    className="text-[var(--danger)] underline-offset-2 hover:underline"
                  >
                    Unpair
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="muse-ledger" data-testid="muse-ledger">
        {visible.length === 0 && (
          <p className="text-sm text-[#c4b7a8]">
            No {PERSON_LABEL.pluralLower} yet
            {outlet ? ` in ${outletTitle}` : ""}. Add one or load starter
            Muses (Woman · Rocky · Jaxx).
          </p>
        )}
        {visible.map((p, cardIndex) => (
          <PartnerCard
            key={p.id}
            partner={p}
            roster={partners}
            pairingOpen={pairingForId != null && samePartnerId(pairingForId, p.id)}
            onTogglePairing={() =>
              setPairingForId((cur) =>
                cur != null && samePartnerId(cur, p.id) ? null : Number(p.id),
              )
            }
            onPairWith={(otherId) => setPairWith(p.id, otherId)}
            onUnpair={(otherId) => setPairWith(p.id, otherId)}
            onEdit={() => openEdit(p)}
            onRemove={() => requestRemove(p.id)}
            onSelectPhoto={(photoIndex) => setFeaturedPhoto(p.id, photoIndex)}
            onToggleAct={(act) => togglePartnerAct(p.id, act)}
            onMoveUp={
              sortMode === "manual" ? () => moveMuse(p.id, -1) : undefined
            }
            onMoveDown={
              sortMode === "manual" ? () => moveMuse(p.id, 1) : undefined
            }
            canMoveUp={sortMode === "manual" && cardIndex > 0}
            canMoveDown={
              sortMode === "manual" && cardIndex < visible.length - 1
            }
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title={
          pendingDeleteName
            ? `Delete ${pendingDeleteName}?`
            : `Delete this ${PERSON_LABEL.singularLower}?`
        }
        description={
          pendingDeleteName
            ? `Are you sure you want to delete ${pendingDeleteName}? This removes the ${PERSON_LABEL.singularLower} from your list. You can’t undo this.`
            : `Are you sure you want to delete this ${PERSON_LABEL.singularLower}? This removes them from your list. You can’t undo this.`
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        danger
        onCancel={cancelRemove}
        onConfirm={confirmRemove}
        testId="muse-delete-confirm"
      />
    </PageShell>
  );
}
