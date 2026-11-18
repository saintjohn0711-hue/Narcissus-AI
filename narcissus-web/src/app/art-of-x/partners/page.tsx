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
  MEMBER_PRESENTATION_GENDERS,
  MUSE_KIND_MEMBER_LIMITS,
  MUSE_KINDS,
  MUSE_MEMBER_PRESENCES,
  MUSE_MEMBER_ROLE_CHIPS,
  MUSE_SORT_OPTIONS,
  PERSON_GENDERS,
  PERSON_LABEL,
  arkDemoRoster,
  canonicalizeAct,
  displayName,
  emptyMuseMember,
  emptyPartner,
  fileToPartnerPhoto,
  genderLabel,
  hydrateMembersFromLinkedSolos,
  loadMuseOrder,
  mainPhoto,
  memberGuestsOf,
  memberPartnersOf,
  museKindBlurb,
  museKindLabel,
  museMemberPresenceLabel,
  museMembersOf,
  kinksInBucket,
  normalizeDoneActs,
  normalizeKinks,
  normalizeMemberPresence,
  normalizeMuseKind,
  normalizePairedWith,
  normalizeWantActs,
  reconcileWantActs,
  samePartnerId,
  saveMuseOrder,
  syncUnitLinkedSolos,
  toggleKinkBucket,
  toggleMusePairing,
  withMainPhoto,
  withMuseKindFields,
  DEFAULT_MUSE_SORT,
  type MuseKind,
  type MuseKinkBucket,
  type MuseMember,
  type MuseMemberPresence,
  type MuseSortMode,
  type PartnerRecord,
  type PersonGender,
  type PersonType,
} from "@/lib/artOfX";
import { museActRankMap } from "@/lib/museActStats";
import { sortMuses } from "@/lib/museSort";
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
import { musePhotoLimitsForAccount } from "@/lib/musePhotoLimits";
import { authClient } from "@/lib/auth-client";
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

const TYPES: PersonType[] = ["Real", "Dream", "Wanted", "Power"];
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
  const { data: session } = authClient.useSession();
  const photoLimits = useMemo(
    () =>
      musePhotoLimitsForAccount({
        email: session?.user?.email,
        signedIn: Boolean(session?.user?.id),
      }),
    [session?.user?.email, session?.user?.id],
  );
  const perPartnerPhotoCap = photoLimits.perPartner;
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [filter, setFilter] = useState<"all" | PersonType>("all");
  const [sortMode, setSortMode] = useState<MuseSortMode>(DEFAULT_MUSE_SORT);
  const [manualOrder, setManualOrder] = useState<number[]>([]);
  const [editing, setEditing] = useState<PartnerRecord | null>(null);
  /** Muse id waiting on delete confirm — null when no dialog. */
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingClearMemoriesId, setPendingClearMemoriesId] = useState<
    number | null
  >(null);
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
      if (cancelled) return;
      // Never mark an empty roster as "loaded" after a failed fetch —
      // that used to fire persistPartners([]) and wipe Neon.
      syncingFromServer.current = true;
      setSaveError("Failed to load Muses from your account. Refresh to retry.");
      setReady(true);
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

  /** Rank across the full roster (not just the filtered slice). */
  const actRanks = useMemo(() => museActRankMap(partners), [partners]);

  const outletTitle = outlet
    ? OUTLETS.find((o) => o.id === outlet)?.label ?? PERSON_LABEL.plural
    : PERSON_LABEL.plural;

  function scrollEditorIntoView() {
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /** Apply Solo / Couple / Group shape while preserving guests when possible. */
  function partnerWithKind(base: PartnerRecord, kind: MuseKind): PartnerRecord {
    const current = museMembersOf(base);
    const guests = memberGuestsOf(current);
    const { minPartners, max } = MUSE_KIND_MEMBER_LIMITS[kind];
    let partnersOnly = memberPartnersOf(current).slice(0, max);
    const defaults: Array<Partial<MuseMember>> =
      kind === "couple"
        ? [
            { name: "Partner A", gender: "woman", presence: "partner" },
            { name: "Partner B", gender: "man", presence: "partner" },
          ]
        : kind === "group"
          ? [
              { name: "Partner 1", gender: "woman", presence: "partner" },
              { name: "Partner 2", gender: "man", presence: "partner" },
              { name: "Partner 3", gender: "woman", presence: "partner" },
            ]
          : [];
    while (partnersOnly.length < minPartners) {
      const d = defaults[partnersOnly.length] || {
        name: `Partner ${partnersOnly.length + 1}`,
        presence: "partner" as MuseMemberPresence,
      };
      partnersOnly = [...partnersOnly, emptyMuseMember(d)];
    }
    const members =
      kind === "solo"
        ? guests
        : [...partnersOnly, ...guests].slice(0, max);
    return withMuseKindFields(base, {
      museKind: kind,
      members,
      gender:
        kind === "couple"
          ? "couple"
          : kind === "group"
            ? "group"
            : base.gender === "couple" || base.gender === "group"
              ? "woman"
              : base.gender,
    });
  }

  function openNew(kind: MuseKind = "solo") {
    setEditing(partnerWithKind(emptyPartner("", partners), kind));
    setLooksFromIdx([]);
    setLooksNote(null);
    setDreamDesc("");
    setDreamNote(null);
    setSaveError(null);
    scrollEditorIntoView();
  }

  function openEdit(p: PartnerRecord) {
    const main = p.mainPhotoIndex ?? 0;
    const kind = normalizeMuseKind(p.museKind, p);
    const resolvedMembers =
      kind === "solo"
        ? museMembersOf(p)
        : hydrateMembersFromLinkedSolos(p, partners);
    setEditing(
      withMuseKindFields(
        {
          ...p,
          id: Number(p.id),
          kinks: normalizeKinks(p.kinks),
          photos: [...(p.photos || [])],
          mainPhotoIndex: main,
          doneActs: normalizeDoneActs(p.doneActs),
          wantActs: reconcileWantActs(p.doneActs, p.wantActs),
          dynTags: [...(p.dynTags || [])],
          pairedWith: normalizePairedWith(p.pairedWith, p.id),
        },
        {
          museKind: kind,
          members: resolvedMembers.length
            ? resolvedMembers
            : museMembersOf(p),
        },
      ),
    );
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

  function persistEditor(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    const kind = normalizeMuseKind(editing.museKind, editing);
    const members = museMembersOf(editing);
    const partnersOnly = memberPartnersOf(members);
    if (
      kind === "couple" &&
      partnersOnly.filter((m) => m.name.trim()).length < 2
    ) {
      setSaveError("Couple Muses need two partner names (guests are optional).");
      return;
    }
    if (
      kind === "group" &&
      partnersOnly.filter((m) => m.name.trim()).length < 3
    ) {
      setSaveError(
        "Group Muses need at least three partners (guests are optional).",
      );
      return;
    }
    const synced = withMuseKindFields(
      {
        ...editing,
        id: Number(editing.id),
        name: editing.name.trim(),
        pairedWith: normalizePairedWith(editing.pairedWith, editing.id).slice(
          0,
          MAX_MUSE_CAST_MATES,
        ),
        updatedAt: new Date().toISOString(),
      },
      { museKind: kind, members },
    );

    setPartners((prev) => {
      const i = prev.findIndex((p) => samePartnerId(p.id, synced.id));
      let list: PartnerRecord[];
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = synced;
        list = copy;
      } else {
        setManualOrder((order) => {
          const ids = [
            Number(synced.id),
            ...order.filter((id) => id !== Number(synced.id)),
          ];
          saveMuseOrder(ids);
          return ids;
        });
        list = [synced, ...prev];
      }

      // Couple/group → create/update linked Solo Muses for each partner slot.
      if (kind === "couple" || kind === "group") {
        const { roster, unit } = syncUnitLinkedSolos(list, synced);
        const beforeIds = new Set(list.map((p) => Number(p.id)));
        const newIds = roster
          .map((p) => Number(p.id))
          .filter((id) => !beforeIds.has(id));
        if (newIds.length) {
          setManualOrder((order) => {
            const ids = [
              ...order.filter((id) => id === Number(unit.id) || !newIds.includes(id)),
              ...newIds.filter((id) => !order.includes(id)),
            ];
            // Keep unit near top; append new linked solos after it.
            const unitPos = ids.indexOf(Number(unit.id));
            const withoutNew = ids.filter((id) => !newIds.includes(id));
            const insertAt = unitPos >= 0 ? unitPos + 1 : 1;
            const merged = [
              ...withoutNew.slice(0, insertAt),
              ...newIds,
              ...withoutNew.slice(insertAt),
            ];
            saveMuseOrder(merged);
            return merged;
          });
        }
        setSaveError(null);
        setSaveNote(
          `Saved ${kind} + ${memberPartnersOf(unit.members).length} linked Solo${
            memberPartnersOf(unit.members).length === 1 ? "" : "s"
          }${
            memberGuestsOf(unit.members).length
              ? ` · ${memberGuestsOf(unit.members).length} guest${
                  memberGuestsOf(unit.members).length === 1 ? "" : "s"
                } present`
              : ""
          }.`,
        );
        return roster;
      }

      const desiredPairs = new Set(synced.pairedWith.map((id) => Number(id)));
      setSaveError(null);
      return list.map((p) => {
        if (samePartnerId(p.id, synced.id)) return p;
        const linked = normalizePairedWith(p.pairedWith, p.id);
        const hasLink = linked.some((id) => samePartnerId(id, synced.id));
        const shouldLink = desiredPairs.has(Number(p.id));
        if (hasLink === shouldLink) return p;
        return {
          ...p,
          pairedWith: shouldLink
            ? normalizePairedWith([...linked, synced.id], p.id)
            : linked.filter((id) => !samePartnerId(id, synced.id)),
          updatedAt: synced.updatedAt,
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

  function requestClearMemories(id: number) {
    setPendingClearMemoriesId(Number(id));
  }

  function cancelClearMemories() {
    setPendingClearMemoriesId(null);
  }

  function confirmClearMemories() {
    if (pendingClearMemoriesId == null) return;
    const id = pendingClearMemoriesId;
    setPendingClearMemoriesId(null);
    setPartners((prev) =>
      prev.map((p) =>
        samePartnerId(p.id, id)
          ? {
              ...p,
              memories: [],
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
    if (editing && samePartnerId(editing.id, id)) {
      setEditing({
        ...editing,
        memories: [],
        updatedAt: new Date().toISOString(),
      });
    }
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

  const pendingClearMemoriesMuse =
    pendingClearMemoriesId != null
      ? partners.find((p) => samePartnerId(p.id, pendingClearMemoriesId)) ??
        null
      : null;
  const pendingClearMemoriesName = pendingClearMemoriesMuse
    ? displayName(pendingClearMemoriesMuse)
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
    const doneActs = has
      ? current.filter((a) => a !== tag)
      : [...current, tag];
    setEditing({
      ...editing,
      doneActs,
      // Logging as done clears the wishlist for that act.
      wantActs: reconcileWantActs(doneActs, editing.wantActs),
    });
  }

  function toggleWantAct(act: string) {
    if (!editing) return;
    const tag = canonicalizeAct(act);
    if (!tag) return;
    const done = new Set(normalizeDoneActs(editing.doneActs));
    if (done.has(tag)) return;
    const current = normalizeWantActs(editing.wantActs);
    const has = current.includes(tag);
    setEditing({
      ...editing,
      wantActs: has
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
        const doneActs = has
          ? current.filter((a) => a !== tag)
          : [...current, tag];
        return {
          ...p,
          doneActs,
          wantActs: reconcileWantActs(doneActs, p.wantActs),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    setEditing((ed) => {
      if (!ed || !samePartnerId(ed.id, partnerId)) return ed;
      const current = normalizeDoneActs(ed.doneActs);
      const has = current.includes(tag);
      const doneActs = has
        ? current.filter((a) => a !== tag)
        : [...current, tag];
      return {
        ...ed,
        doneActs,
        wantActs: reconcileWantActs(doneActs, ed.wantActs),
      };
    });
  }

  function toggleKinkInBucket(tag: string, bucket: MuseKinkBucket) {
    if (!editing) return;
    setEditing({
      ...editing,
      kinks: toggleKinkBucket(editing.kinks, tag, bucket),
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
    const cap = perPartnerPhotoCap;
    const room = cap - editing.photos.length;
    if (room <= 0) {
      setLooksNote(
        `Limit reached — ${cap} photos per Muse (${photoLimits.label} tier).`,
      );
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
        `Replace current ${PERSON_LABEL.pluralLower} with Woman, Rocky, Jaxx, Heat (couple), and Power Muses (Mistress T, Bailey Jay, Britney Markham, Lexi Mae)?`,
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

  function setEditingKind(kind: MuseKind) {
    if (!editing) return;
    setEditing(partnerWithKind(editing, kind));
  }

  function updateMember(index: number, patch: Partial<MuseMember>) {
    if (!editing) return;
    const kind = normalizeMuseKind(editing.museKind, editing);
    const { max } = MUSE_KIND_MEMBER_LIMITS[kind === "solo" ? "couple" : kind];
    const cap = kind === "solo" ? 3 : max;
    const members = (
      kind === "solo" ? museMembersOf(editing) : museMembersOf(editing)
    ).slice(0, cap);
    while (members.length <= index && members.length < cap) {
      members.push(
        emptyMuseMember({
          name: "",
          presence: kind === "solo" ? "guest" : "partner",
        }),
      );
    }
    if (index < 0 || index >= cap) return;
    const prev = emptyMuseMember(members[index] || { name: "" });
    members[index] = emptyMuseMember({
      ...prev,
      ...patch,
      name: patch.name !== undefined ? patch.name : prev.name,
      role:
        patch.role !== undefined
          ? patch.role.trim() || undefined
          : prev.role,
      presence: patch.presence
        ? normalizeMemberPresence(patch.presence)
        : prev.presence,
    });
    setEditing(withMuseKindFields(editing, { museKind: kind, members }));
  }

  function addGuestMember() {
    if (!editing) return;
    const kind = normalizeMuseKind(editing.museKind, editing);
    const members = [...museMembersOf(editing)];
    const cap =
      kind === "solo" ? 3 : MUSE_KIND_MEMBER_LIMITS[kind].max;
    if (members.length >= cap) {
      setSaveError(
        kind === "solo"
          ? "Up to 3 guests on a Solo session log."
          : `This ${kind} is full (${cap} people including guests).`,
      );
      return;
    }
    members.push(
      emptyMuseMember({
        name: "Roy",
        presence: "guest",
        role: "Boy toy",
        gender: "man",
      }),
    );
    setEditing(withMuseKindFields(editing, { museKind: kind, members }));
    setSaveError(null);
  }

  async function onMemberPhoto(
    index: number,
    files: FileList | null,
    input?: HTMLInputElement | null,
  ) {
    if (!editing || !files?.length) return;
    const members = [...museMembersOf(editing)];
    const member = emptyMuseMember(members[index] || { name: "" });
    const cap = Math.min(4, perPartnerPhotoCap);
    const room = cap - (member.photos?.length || 0);
    if (room <= 0) {
      if (input) input.value = "";
      return;
    }
    const nextPhotos = [...(member.photos || [])];
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        nextPhotos.push(await fileToPartnerPhoto(file));
      } catch {
        /* skip */
      }
    }
    updateMember(index, {
      photos: nextPhotos,
      mainPhotoIndex: member.photos?.length ? member.mainPhotoIndex : 0,
    });
    if (input) input.value = "";
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
            <UiButton
              tone="ghost"
              onClick={() => openNew("couple")}
              data-testid="muse-add-couple"
            >
              Add Couple
            </UiButton>
            <UiButton
              tone="primary"
              onClick={() => openNew("solo")}
              data-testid="muse-add-solo"
            >
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
              {normalizeMuseKind(editing.museKind, editing) === "couple"
                ? "Couple"
                : normalizeMuseKind(editing.museKind, editing) === "group"
                  ? "Group"
                  : PERSON_LABEL.singularLower}
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

          <fieldset
            className="space-y-3 rounded-sm border border-[var(--glow)]/35 bg-[#0a1220]/45 p-4"
            data-testid="muse-kind"
          >
            <legend className="px-1 text-sm uppercase tracking-[0.16em] text-[var(--glow)]">
              Muse shape
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Pick Solo, Couple, or Group first. Couple = two partners as one
              Muse; save still creates linked Solos for together or separate
              play.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {MUSE_KINDS.map((k) => {
                const on =
                  normalizeMuseKind(editing.museKind, editing) === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setEditingKind(k)}
                    className={`rounded-sm border px-3 py-3 text-left transition ${
                      on
                        ? "border-[var(--accent)] bg-[var(--accent)]/18 text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[#c4b7a8] hover:border-[var(--glow)]/45"
                    }`}
                    data-testid={`muse-kind-${k}`}
                    aria-pressed={on}
                  >
                    <span className="block text-sm font-semibold uppercase tracking-[0.14em]">
                      {museKindLabel(k)}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-[var(--muted)]">
                      {museKindBlurb(k)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

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
                {editing.photos.length} / {perPartnerPhotoCap} photos
                <span className="text-[var(--muted)]">
                  {" "}
                  · {photoLimits.label} tier
                </span>
              </span>
              <label
                className={`cursor-pointer rounded-sm border px-3 py-1.5 text-xs uppercase tracking-wide ${
                  editing.photos.length >= perPartnerPhotoCap
                    ? "pointer-events-none border-[var(--line)] opacity-40"
                    : "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                }`}
              >
                Add photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={editing.photos.length >= perPartnerPhotoCap}
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

          {(normalizeMuseKind(editing.museKind, editing) !== "solo" ||
            museMembersOf(editing).length > 0) && (
            <fieldset
              className="space-y-4 border border-[var(--line)] bg-[#0f0d0b]/40 p-4"
              data-testid="muse-members"
            >
              <legend className="px-1 text-sm uppercase tracking-[0.16em]">
                {normalizeMuseKind(editing.museKind, editing) === "solo"
                  ? "Session guests"
                  : normalizeMuseKind(editing.museKind, editing) === "group"
                    ? "Group partners"
                    : "Couple partners"}
              </legend>
              <p className="text-xs text-[var(--muted)]">
                {normalizeMuseKind(editing.museKind, editing) === "solo"
                  ? "Log people who were present (Boy toy / Girl toy) without forcing acts with them."
                  : "Full slots for each person — name, photo, voice, outlet. Save creates linked Solos so you can chat together (this Muse) or separate. Add a guest when someone was present but you didn’t play with them."}
              </p>

              {museMembersOf(editing).map((raw, i) => {
                const member = emptyMuseMember(raw);
                const isGuest =
                  normalizeMemberPresence(member.presence) === "guest";
                const kind = normalizeMuseKind(editing.museKind, editing);
                const minPartners =
                  kind === "solo"
                    ? 0
                    : MUSE_KIND_MEMBER_LIMITS[kind].minPartners;
                const partnerIndex = museMembersOf(editing)
                  .slice(0, i + 1)
                  .filter(
                    (m) => normalizeMemberPresence(m.presence) === "partner",
                  ).length - 1;
                const required =
                  !isGuest && partnerIndex >= 0 && partnerIndex < minPartners;
                return (
                  <div
                    key={`member-${i}-${member.linkedPartnerId || i}`}
                    className={`space-y-3 border px-3 py-3 ${
                      isGuest
                        ? "border-[var(--glow)]/35 bg-[#0a1220]/55"
                        : "border-[var(--line)] bg-[#12100e]/50"
                    }`}
                    data-testid={`muse-member-slot-${i}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        {isGuest
                          ? `Guest ${
                              museMembersOf(editing)
                                .slice(0, i + 1)
                                .filter(
                                  (m) =>
                                    normalizeMemberPresence(m.presence) ===
                                    "guest",
                                ).length
                            } · present`
                          : `Partner ${partnerIndex + 1}`}
                        {member.linkedPartnerId
                          ? ` · Solo #${member.linkedPartnerId}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {kind !== "solo" &&
                          MUSE_MEMBER_PRESENCES.map((pres) => (
                            <button
                              key={pres}
                              type="button"
                              onClick={() =>
                                updateMember(i, { presence: pres })
                              }
                              className={`rounded-sm border px-2 py-0.5 text-[11px] ${
                                normalizeMemberPresence(member.presence) ===
                                pres
                                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                                  : "border-[var(--line)] text-[#c4b7a8]"
                              }`}
                              data-testid={`muse-member-presence-${i}-${pres}`}
                            >
                              {museMemberPresenceLabel(pres)}
                            </button>
                          ))}
                        {(isGuest || !required) && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = museMembersOf(editing).filter(
                                (_, j) => j !== i,
                              );
                              setEditing(
                                withMuseKindFields(editing, {
                                  museKind: kind,
                                  members: next,
                                }),
                              );
                            }}
                            className="text-[11px] uppercase tracking-[0.14em] text-[var(--danger)] underline-offset-2 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[5.5rem_1fr]">
                      <div className="space-y-1.5">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden border border-[var(--line)] bg-[#0c0a09]">
                          {member.photos?.[member.mainPhotoIndex || 0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.photos[member.mainPhotoIndex || 0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                              Photo
                            </span>
                          )}
                        </div>
                        <label className="block cursor-pointer text-[10px] uppercase tracking-[0.14em] text-[var(--accent-strong)]">
                          Add photo
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            data-testid={`muse-member-photo-${i}`}
                            onChange={(e) =>
                              void onMemberPhoto(
                                i,
                                e.target.files,
                                e.currentTarget,
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="grid gap-1 text-xs">
                            <span className="uppercase tracking-[0.14em] text-[var(--muted)]">
                              Name{required ? "" : " (optional)"}
                            </span>
                            <input
                              value={member.name}
                              required={required}
                              onChange={(e) =>
                                updateMember(i, { name: e.target.value })
                              }
                              placeholder={
                                isGuest
                                  ? "Roy"
                                  : i === 0
                                    ? "Lexi"
                                    : i === 1
                                      ? "Dom"
                                      : `Partner ${i + 1}`
                              }
                              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm"
                              data-testid={`muse-member-name-${i}`}
                            />
                          </label>
                          <label className="grid gap-1 text-xs">
                            <span className="uppercase tracking-[0.14em] text-[var(--muted)]">
                              Role
                            </span>
                            <input
                              value={member.role || ""}
                              onChange={(e) =>
                                updateMember(i, { role: e.target.value })
                              }
                              placeholder="Boy toy, Girl toy…"
                              className="prompt-field rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm"
                              data-testid={`muse-member-role-${i}`}
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {MUSE_MEMBER_ROLE_CHIPS.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => updateMember(i, { role: chip })}
                              className={`rounded-sm border px-2 py-0.5 text-[11px] ${
                                member.role === chip
                                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                                  : "border-[var(--line)] text-[#c4b7a8]"
                              }`}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                            Outlet
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {MEMBER_PRESENTATION_GENDERS.map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  const vg = defaultVoiceGender(g);
                                  updateMember(i, {
                                    gender: g,
                                    voiceGender:
                                      member.voiceGender ===
                                      defaultVoiceGender(member.gender || "woman")
                                        ? vg
                                        : member.voiceGender,
                                    voicePreset:
                                      member.voiceGender ===
                                      defaultVoiceGender(member.gender || "woman")
                                        ? "auto"
                                        : member.voicePreset,
                                  });
                                }}
                                className={`rounded-sm border px-2 py-0.5 text-[11px] ${
                                  member.gender === g
                                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                                    : "border-[var(--line)] text-[#c4b7a8]"
                                }`}
                              >
                                {genderLabel(g)}
                              </button>
                            ))}
                          </div>
                        </div>
                        {!isGuest && (
                          <div>
                            <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                              Voice
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {VOICE_GENDERS.map((vg) => (
                                <button
                                  key={vg}
                                  type="button"
                                  onClick={() =>
                                    updateMember(i, {
                                      voiceGender: vg,
                                      voicePreset: "auto",
                                    })
                                  }
                                  className={`rounded-sm border px-2 py-0.5 text-[11px] capitalize ${
                                    member.voiceGender === vg
                                      ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                                      : "border-[var(--line)] text-[#c4b7a8]"
                                  }`}
                                >
                                  {vg}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {isGuest && (
                          <p className="text-[11px] text-[var(--muted)]">
                            Guest / present — logged on this Muse for the
                            session. Acts with you are not required (e.g. Boy
                            toy Roy watching).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addGuestMember}
                className="rounded-sm border border-[var(--glow)]/45 px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--accent-strong)] transition hover:border-[var(--glow)]"
                data-testid="muse-add-guest"
              >
                + Add guest / present (Boy toy · Girl toy)
              </button>
            </fieldset>
          )}

          {normalizeMuseKind(editing.museKind, editing) === "solo" &&
            museMembersOf(editing).length === 0 && (
              <div className="border border-[var(--line)]/80 bg-[#0f0d0b]/35 px-4 py-3">
                <p className="text-xs text-[var(--muted)]">
                  Session log: add a guest who was present without acts — e.g.
                  Boy toy Roy in a threesome you logged on this Muse.
                </p>
                <button
                  type="button"
                  onClick={addGuestMember}
                  className="mt-2 rounded-sm border border-[var(--glow)]/45 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[var(--accent-strong)]"
                  data-testid="muse-add-guest-solo"
                >
                  + Add guest / present
                </button>
              </div>
            )}

          {normalizeMuseKind(editing.museKind, editing) === "solo" ? (
            <fieldset className="space-y-2" data-testid="muse-presentation">
              <legend className="text-sm uppercase tracking-[0.16em]">
                Presentation
              </legend>
              <p className="text-xs text-[var(--muted)]">
                Outlet for this Solo Muse. For Couple / Group, set each
                partner&apos;s outlet in the partner slots above — use Muse
                shape to switch.
              </p>
              <div className="flex flex-wrap gap-2">
                {PERSON_GENDERS.filter(
                  (g) => g !== "couple" && g !== "group",
                ).map((g) => (
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
          ) : (
            <p
              className="text-xs text-[var(--muted)]"
              data-testid="muse-presentation-unit-note"
            >
              {normalizeMuseKind(editing.museKind, editing) === "couple"
                ? "Couple Muse"
                : "Group Muse"}{" "}
              — set each partner&apos;s presentation in the slots above. Muse
              shape (top) is how you pick Couple.
            </p>
          )}

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

          <fieldset
            className="space-y-5"
            data-testid="muse-edit-acts-kinks"
          >
            <legend className="text-sm uppercase tracking-[0.16em]">
              Acts &amp; kinks
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Five buckets per Muse — tap labeled boxes. Acts feed Echo
              overscore; kinks sit in one bucket each (into / try / hard no).
            </p>

            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--glow)]">
                Acts you&apos;ve done
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Logged with this Muse — counts for Echo overscore.
              </p>
              <CatalogMultiSelect
                groups={ACT_GROUPS}
                selected={normalizeDoneActs(editing.doneActs)}
                onToggle={toggleAct}
                label="Filter acts done"
                searchPlaceholder="Filter boxes — blowjob, given, anal…"
                emptySelectedHint="Nothing logged yet — tap a box below."
                allowCustom
                customPlaceholder="Add custom act…"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--glow)]">
                Acts you&apos;d like (not yet)
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Wishlist with them — cleared automatically when you log it as
                done.
              </p>
              <CatalogMultiSelect
                groups={ACT_GROUPS}
                selected={reconcileWantActs(
                  editing.doneActs,
                  editing.wantActs,
                )}
                onToggle={toggleWantAct}
                label="Filter acts wishlist"
                searchPlaceholder="Filter boxes — hotel, pegging…"
                emptySelectedHint="No wishlist yet — tap a box below."
                allowCustom
                customPlaceholder="Add custom want…"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--glow)]">
                Kinks you were into
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Established with them — likes and favorites.
              </p>
              <CatalogMultiSelect
                groups={KINK_GROUPS}
                selected={kinksInBucket(editing.kinks, "into")}
                onToggle={(tag) => toggleKinkInBucket(tag, "into")}
                label="Filter kinks into"
                searchPlaceholder="Filter boxes — bondage, free-use…"
                emptySelectedHint="None marked into yet."
                allowCustom
                customPlaceholder="Add custom kink…"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--glow)]">
                Kinks you want to try
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Curious with them — not established yet.
              </p>
              <CatalogMultiSelect
                groups={KINK_GROUPS}
                selected={kinksInBucket(editing.kinks, "try")}
                onToggle={(tag) => toggleKinkInBucket(tag, "try")}
                label="Filter kinks to try"
                searchPlaceholder="Filter boxes — breeding, public…"
                emptySelectedHint="Nothing on the try list yet."
                allowCustom
                customPlaceholder="Add custom try…"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--glow)]">
                Kinks that are hard no
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Hard limits with this Muse — stay off the table.
              </p>
              <CatalogMultiSelect
                groups={KINK_GROUPS}
                selected={kinksInBucket(editing.kinks, "hardNo")}
                onToggle={(tag) => toggleKinkInBucket(tag, "hardNo")}
                label="Filter hard-no kinks"
                searchPlaceholder="Filter boxes — piss, cuckold…"
                emptySelectedHint="No hard nos set."
                allowCustom
                customPlaceholder="Add hard no…"
              />
            </div>
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

      <div className="muse-ledger" data-testid="muse-ledger">
        {visible.length === 0 && (
          <p className="text-sm text-[#c4b7a8]">
            No {PERSON_LABEL.pluralLower} yet
            {outlet ? ` in ${outletTitle}` : ""}. Add one or load starter
            Muses (Woman · Rocky · Jaxx).
          </p>
        )}
        {visible.map((p, cardIndex) => {
          const rankInfo = actRanks.get(Number(p.id));
          return (
            <PartnerCard
              key={p.id}
              partner={p}
              roster={partners}
              actRank={rankInfo?.rank}
              actContribution={rankInfo?.contribution}
              pairingOpen={
                pairingForId != null && samePartnerId(pairingForId, p.id)
              }
              onTogglePairing={() =>
                setPairingForId((cur) =>
                  cur != null && samePartnerId(cur, p.id)
                    ? null
                    : Number(p.id),
                )
              }
              onPairWith={(otherId) => setPairWith(p.id, otherId)}
              onUnpair={(otherId) => setPairWith(p.id, otherId)}
              onEdit={() => openEdit(p)}
              onRemove={() => requestRemove(p.id)}
              onClearMemories={() => requestClearMemories(p.id)}
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
          );
        })}
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

      <ConfirmDialog
        open={pendingClearMemoriesId != null}
        title={
          pendingClearMemoriesName
            ? `Delete ${pendingClearMemoriesName}'s memories?`
            : "Delete memories?"
        }
        description={
          pendingClearMemoriesName
            ? `Are you sure you want to delete every saved memory for ${pendingClearMemoriesName}? Chat history stays; only this Muse’s durable memories are cleared. You can’t undo this.`
            : "Are you sure you want to delete every saved memory for this Muse? You can’t undo this."
        }
        cancelLabel="Cancel"
        confirmLabel="Delete memories"
        danger
        onCancel={cancelClearMemories}
        onConfirm={confirmClearMemories}
        testId="muse-clear-memories-confirm"
      />
    </PageShell>
  );
}
