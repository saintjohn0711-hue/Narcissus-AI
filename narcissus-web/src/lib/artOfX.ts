/**
 * Art of X / ArkOfX — craft rules + data model ported from
 * /cursor/stores/self/docs/arkofx-demo.html (adults only).
 */

import {
  normalizeMemories,
  type MuseMemory,
} from "@/lib/museChatMemory";
import {
  defaultVoiceGender,
  normalizeVoiceGender,
  normalizeVoicePreset,
  type MuseVoiceGender,
  type MuseVoicePresetId,
} from "@/lib/museVoice";
import {
  normalizeSexRibbons,
  type SexRibbonAward,
} from "@/lib/sexRibbons";

export type PersonType = "Real" | "Dream" | "Wanted";
export type { MuseMemory };

/**
 * How this Muse is cast in chat:
 * - solo — one person (default)
 * - couple — one Muse entry for two named partners (unit chat)
 * - group — one Muse entry for 3–4 named partners (unit chat)
 */
export type MuseKind = "solo" | "couple" | "group";

export const MUSE_KINDS: MuseKind[] = ["solo", "couple", "group"];

/** Solo presentation genders allowed on a couple/group member slot. */
export const MEMBER_PRESENTATION_GENDERS: PersonGender[] = [
  "woman",
  "man",
  "trans",
  "crossdresser",
];

/**
 * How this person shows up in the unit / session log:
 * - partner — full sexual partner (default)
 * - guest — present in the scene; acts with me not required (e.g. Roy watching)
 */
export type MuseMemberPresence = "partner" | "guest";

export const MUSE_MEMBER_PRESENCES: MuseMemberPresence[] = [
  "partner",
  "guest",
];

/** Short role chips for couple/group slots + guest logging. */
export const MUSE_MEMBER_ROLE_CHIPS = [
  "Boy toy",
  "Girl toy",
  "Dom",
  "Switch",
  "Watcher",
  "Third",
  "Husband",
  "Wife",
  "Girlfriend",
  "Boyfriend",
] as const;

export function museMemberPresenceLabel(p: MuseMemberPresence | string): string {
  switch (p) {
    case "guest":
      return "Guest · present";
    case "partner":
      return "Partner";
    default:
      return p;
  }
}

export type MuseMember = {
  name: string;
  /** Optional beat — e.g. Boy toy, Dom, Switch */
  role?: string;
  /**
   * partner = sexual partner in the unit;
   * guest = present in the scene / log without requiring acts with me.
   */
  presence?: MuseMemberPresence;
  /** Outlet / presentation for the linked Solo Muse */
  gender?: PersonGender;
  photos?: string[];
  mainPhotoIndex?: number;
  voiceGender?: MuseVoiceGender;
  voicePreset?: MuseVoicePresetId;
  voiceId?: string;
  /** Solo Muse id created/updated when this unit is saved */
  linkedPartnerId?: number | null;
};

export type PersonGender =
  | "woman"
  | "man"
  | "trans"
  | "crossdresser"
  | "couple"
  | "group";

export const PERSON_GENDERS: PersonGender[] = [
  "woman",
  "man",
  "trans",
  "crossdresser",
  "couple",
  "group",
];

export function genderLabel(g: PersonGender | string): string {
  switch (g) {
    case "woman":
      return "Woman";
    case "man":
      return "Man";
    case "trans":
      return "Trans";
    case "crossdresser":
      return "Cross dresser";
    case "couple":
      return "Couple";
    case "group":
      return "Group";
    default:
      return g;
  }
}

export function museKindLabel(k: MuseKind | string): string {
  switch (k) {
    case "solo":
      return "Solo";
    case "couple":
      return "Couple";
    case "group":
      return "Group";
    default:
      return k;
  }
}

/**
 * Couple = 2 partners (+ optional guests up to 4 total).
 * Group = 3–4 partners (+ guests up to 5 total) so Roy-type extras fit.
 */
export const MUSE_KIND_MEMBER_LIMITS: Record<
  MuseKind,
  { min: number; max: number; minPartners: number }
> = {
  solo: { min: 0, max: 0, minPartners: 0 },
  couple: { min: 2, max: 4, minPartners: 2 },
  group: { min: 3, max: 5, minPartners: 3 },
};

export function isMuseKind(v: unknown): v is MuseKind {
  return v === "solo" || v === "couple" || v === "group";
}

export function normalizeMuseKind(
  raw: unknown,
  fallback?: {
    isCouple?: boolean;
    gender?: string;
    members?: unknown;
    partnerA?: string;
    partnerB?: string;
  },
): MuseKind {
  if (isMuseKind(raw)) return raw;
  const gender = String(fallback?.gender || "").toLowerCase();
  if (gender === "group") return "group";
  if (gender === "couple" || fallback?.isCouple) return "couple";
  const members = normalizeMembers(fallback?.members);
  if (members.length >= 3) return "group";
  if (
    members.length === 2 ||
    (String(fallback?.partnerA || "").trim() &&
      String(fallback?.partnerB || "").trim())
  ) {
    return "couple";
  }
  return "solo";
}

function normalizeMemberGender(raw: unknown): PersonGender | undefined {
  const g = String(raw || "").toLowerCase();
  if (MEMBER_PRESENTATION_GENDERS.includes(g as PersonGender)) {
    return g as PersonGender;
  }
  return undefined;
}

export function normalizeMemberPresence(
  raw: unknown,
): MuseMemberPresence {
  return raw === "guest" ? "guest" : "partner";
}

export function emptyMuseMember(
  partial: Partial<MuseMember> = {},
): MuseMember {
  const gender = normalizeMemberGender(partial.gender) || "woman";
  const photos = Array.isArray(partial.photos)
    ? partial.photos.filter((p): p is string => typeof p === "string" && !!p)
    : [];
  const voiceGender = normalizeVoiceGender(
    partial.voiceGender,
    gender,
  );
  const presence = normalizeMemberPresence(partial.presence);
  return {
    name: typeof partial.name === "string" ? partial.name.trim().slice(0, 80) : "",
    role:
      typeof partial.role === "string" && partial.role.trim()
        ? partial.role.trim().slice(0, 40)
        : undefined,
    presence,
    gender,
    photos,
    mainPhotoIndex:
      typeof partial.mainPhotoIndex === "number" && photos.length
        ? Math.min(Math.max(0, partial.mainPhotoIndex), photos.length - 1)
        : 0,
    voiceGender,
    voicePreset: normalizeVoicePreset(partial.voicePreset, voiceGender),
    voiceId:
      typeof partial.voiceId === "string"
        ? partial.voiceId.trim().slice(0, 200)
        : "",
    linkedPartnerId: (() => {
      const n = Number(partial.linkedPartnerId);
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
  };
}

export function memberPartnersOf(members: MuseMember[]): MuseMember[] {
  return members.filter((m) => normalizeMemberPresence(m.presence) === "partner");
}

export function memberGuestsOf(members: MuseMember[]): MuseMember[] {
  return members.filter((m) => normalizeMemberPresence(m.presence) === "guest");
}

export function normalizeMembers(list: unknown): MuseMember[] {
  if (!Array.isArray(list)) return [];
  const out: MuseMember[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") {
      if (typeof raw === "string" && raw.trim()) {
        const name = raw.trim().slice(0, 80);
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(emptyMuseMember({ name }));
      }
      continue;
    }
    const o = raw as Partial<MuseMember>;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 80) : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(emptyMuseMember({ ...o, name }));
    if (out.length >= 5) break;
  }
  return out;
}

/** Pull member slots from linked Solo Muses (photos / voice / gender edits). */
export function hydrateMembersFromLinkedSolos(
  unit: PartnerRecord,
  roster: PartnerRecord[],
): MuseMember[] {
  const kind = normalizeMuseKind(unit.museKind, unit);
  if (kind === "solo") return [];
  const { max } = MUSE_KIND_MEMBER_LIMITS[kind];
  return museMembersOf(unit)
    .slice(0, max)
    .map((m) => {
      const linkId = Number(m.linkedPartnerId);
      if (!Number.isFinite(linkId) || linkId <= 0) return emptyMuseMember(m);
      const solo = roster.find((p) => samePartnerId(p.id, linkId));
      if (!solo || normalizeMuseKind(solo.museKind, solo) !== "solo") {
        return emptyMuseMember(m);
      }
      return emptyMuseMember({
        ...m,
        name: solo.name || m.name,
        gender: normalizeMemberGender(solo.gender) || m.gender,
        photos: solo.photos?.length ? [...solo.photos] : m.photos,
        mainPhotoIndex: solo.mainPhotoIndex ?? m.mainPhotoIndex,
        voiceGender: solo.voiceGender || m.voiceGender,
        voicePreset: solo.voicePreset || m.voicePreset,
        voiceId: solo.voiceId || m.voiceId,
        linkedPartnerId: Number(solo.id),
        role: m.role,
      });
    });
}

/**
 * Unit gallery = each member's main photo (stable, compact).
 * Keeps couple/group chat portraits without duplicating every solo shot.
 */
export function unitPhotosFromMembers(members: MuseMember[]): string[] {
  const out: string[] = [];
  // Prefer sexual partners for the unit portrait strip; guests optional after.
  const ordered = [
    ...memberPartnersOf(members),
    ...memberGuestsOf(members),
  ];
  for (const m of ordered) {
    const photos = Array.isArray(m.photos) ? m.photos : [];
    if (!photos.length) continue;
    const idx = Math.min(
      Math.max(0, m.mainPhotoIndex ?? 0),
      photos.length - 1,
    );
    const src = photos[idx];
    if (src && !out.includes(src)) out.push(src);
  }
  return out.slice(0, PARTNER_PHOTO_LIMITS.perPartner);
}

/**
 * Saving a couple/group Muse creates or updates linked Solo Muses per member
 * so the same people can chat together (unit) or separately (each solo).
 */
export function syncUnitLinkedSolos(
  roster: PartnerRecord[],
  unitIn: PartnerRecord,
): { roster: PartnerRecord[]; unit: PartnerRecord } {
  const kind = normalizeMuseKind(unitIn.museKind, unitIn);
  if (kind !== "couple" && kind !== "group") {
    return { roster, unit: unitIn };
  }

  const now = new Date().toISOString();
  let working = [...roster];
  const members = museMembersOf(unitIn).map((m) => emptyMuseMember(m));
  const linkedIds: number[] = [];

  const nextMembers: MuseMember[] = members.map((m) => {
    if (!m.name.trim()) return m;
    // Guests stay on the unit ledger only — no Solo Muse / Echo inflation.
    if (normalizeMemberPresence(m.presence) === "guest") {
      return emptyMuseMember({
        ...m,
        linkedPartnerId: null,
      });
    }
    const existingIdx = working.findIndex(
      (p) =>
        m.linkedPartnerId != null &&
        samePartnerId(p.id, m.linkedPartnerId) &&
        normalizeMuseKind(p.museKind, p) === "solo",
    );
    const gender = normalizeMemberGender(m.gender) || "woman";
    const voiceGender = normalizeVoiceGender(m.voiceGender, gender);
    const photos = Array.isArray(m.photos) ? [...m.photos] : [];
    const baseNotes = m.role
      ? `Linked from ${kind} Muse “${unitIn.name}” · ${m.role}`
      : `Linked from ${kind} Muse “${unitIn.name}”`;

    if (existingIdx >= 0) {
      const prev = working[existingIdx]!;
      const updated: PartnerRecord = {
        ...prev,
        name: m.name.trim(),
        type: unitIn.type,
        gender,
        museKind: "solo",
        members: [],
        isCouple: false,
        partnerA: "",
        partnerB: "",
        photos,
        mainPhotoIndex: photos.length
          ? Math.min(Math.max(0, m.mainPhotoIndex ?? 0), photos.length - 1)
          : 0,
        voiceGender,
        voicePreset: normalizeVoicePreset(m.voicePreset, voiceGender),
        voiceId: m.voiceId || "",
        notes: prev.notes?.trim() ? prev.notes : baseNotes,
        updatedAt: now,
      };
      working[existingIdx] = updated;
      linkedIds.push(Number(updated.id));
      return emptyMuseMember({
        ...m,
        linkedPartnerId: Number(updated.id),
        gender,
        photos,
        voiceGender: updated.voiceGender,
        voicePreset: updated.voicePreset,
        voiceId: updated.voiceId,
      });
    }

    const created = emptyPartner(m.name.trim(), working);
    const solo: PartnerRecord = {
      ...created,
      type: unitIn.type,
      gender,
      museKind: "solo",
      members: [],
      isCouple: false,
      photos,
      mainPhotoIndex: photos.length
        ? Math.min(Math.max(0, m.mainPhotoIndex ?? 0), photos.length - 1)
        : 0,
      voiceGender,
      voicePreset: normalizeVoicePreset(m.voicePreset, voiceGender),
      voiceId: m.voiceId || "",
      notes: baseNotes,
      // Share desire tags for continuity; leave doneActs empty so Echo
      // overscore isn't triple-counted from the unit seed.
      kinks: normalizeKinks(unitIn.kinks),
      dynTags: [...(unitIn.dynTags || [])],
      dynamics: unitIn.dynamics || "",
      tryNewThings: Boolean(unitIn.tryNewThings),
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    working = [solo, ...working];
    linkedIds.push(Number(solo.id));
    return emptyMuseMember({
      ...m,
      linkedPartnerId: Number(solo.id),
      gender,
      photos,
      voiceGender: solo.voiceGender,
      voicePreset: solo.voicePreset,
      voiceId: solo.voiceId,
    });
  });

  const unitPhotos = unitPhotosFromMembers(nextMembers);
  let unit = withMuseKindFields(
    {
      ...unitIn,
      photos: unitPhotos.length ? unitPhotos : unitIn.photos || [],
      mainPhotoIndex: 0,
      updatedAt: now,
    },
    { museKind: kind, members: nextMembers },
  );

  // Pair unit ↔ each linked solo, and linked solos with each other.
  const pairTargets = [
    Number(unit.id),
    ...linkedIds.filter((id) => !samePartnerId(id, unit.id)),
  ];
  working = ensureMuseGroupPairings(working, pairTargets);

  // Ensure unit row in working list has latest members/photos/pairs.
  const unitIdx = working.findIndex((p) => samePartnerId(p.id, unit.id));
  const unitFromList =
    unitIdx >= 0
      ? {
          ...unit,
          pairedWith: normalizePairedWith(
            working[unitIdx]!.pairedWith,
            unit.id,
          ),
        }
      : unit;
  unit = unitFromList;
  if (unitIdx >= 0) working[unitIdx] = unit;
  else working = [unit, ...working];

  return { roster: working, unit };
}

/**
 * Resolve named partners for couple/group Muses.
 * Prefers `members`; falls back to partnerA/partnerB for legacy couple rows.
 */
export function museMembersOf(p: {
  museKind?: MuseKind | string;
  members?: MuseMember[] | unknown;
  isCouple?: boolean;
  gender?: string;
  partnerA?: string;
  partnerB?: string;
}): MuseMember[] {
  const kind = normalizeMuseKind(p.museKind, p);
  const fromMembers = normalizeMembers(p.members);
  if (kind === "solo") {
    // Session guests only (present / Boy toy / Girl toy — no acts required).
    return memberGuestsOf(fromMembers).slice(0, 3);
  }
  if (fromMembers.length > 0) {
    const { max } = MUSE_KIND_MEMBER_LIMITS[kind];
    return fromMembers.slice(0, max);
  }
  const a = String(p.partnerA || "").trim();
  const b = String(p.partnerB || "").trim();
  if (a && b) return [emptyMuseMember({ name: a }), emptyMuseMember({ name: b })];
  if (a) return [emptyMuseMember({ name: a })];
  if (b) return [emptyMuseMember({ name: b })];
  return [];
}

/** Keep partnerA/B + isCouple + gender in sync with museKind/members. */
export function withMuseKindFields(
  p: PartnerRecord,
  next: {
    museKind?: MuseKind;
    members?: MuseMember[];
    gender?: PersonGender;
  },
): PartnerRecord {
  const museKind = normalizeMuseKind(next.museKind ?? p.museKind, {
    ...p,
    ...next,
  });
  let members = normalizeMembers(next.members ?? p.members);
  const limits = MUSE_KIND_MEMBER_LIMITS[museKind];
  if (museKind === "solo") {
    // Solo Muses may keep guest-only rows for session logs (present, no acts).
    members = memberGuestsOf(members).slice(0, 3);
  } else {
    members = members.slice(0, limits.max);
  }
  const gender =
    next.gender ??
    (museKind === "couple"
      ? "couple"
      : museKind === "group"
        ? "group"
        : p.gender === "couple" || p.gender === "group"
          ? "woman"
          : p.gender);
  const partnersOnly = memberPartnersOf(members);
  return {
    ...p,
    museKind,
    members,
    gender,
    isCouple: museKind === "couple",
    partnerA: museKind === "solo" ? "" : partnersOnly[0]?.name || members[0]?.name || "",
    partnerB: museKind === "solo" ? "" : partnersOnly[1]?.name || members[1]?.name || "",
  };
}

export function formatMemberNames(members: MuseMember[]): string {
  const names = members.map((m) => m.name).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export type KinkRole = "Both" | "Receive" | "Give" | "Watch";
export type KinkStatus =
  | "Like"
  | "Favorite"
  | "Curious"
  | "Soft limit"
  | "Hard limit";

export type KinkEntry = {
  tag: string;
  role: KinkRole;
  status: KinkStatus;
  intensity: number; // 1–10
};

export type PartnerRecord = {
  id: number;
  name: string;
  type: PersonType;
  gender: PersonGender;
  looks: string;
  notes: string;
  history: string;
  dynamics: string;
  dynTags: string[];
  kinks: KinkEntry[];
  doneActs: string[];
  /**
   * Acts you’d like with this Muse that haven’t happened yet.
   * Mutually exclusive with doneActs for the same label.
   */
  wantActs: string[];
  /** data-URL photos (local persistence; keep few + small) */
  photos: string[];
  /** Index into photos for the primary/top image */
  mainPhotoIndex: number;
  favorite: boolean;
  /**
   * Cast shape for this Muse entry.
   * Couple/group = one ledger row that chats as a multi-partner unit.
   */
  museKind: MuseKind;
  /** Named partners when museKind is couple or group. */
  members: MuseMember[];
  isCouple: boolean;
  partnerA: string;
  partnerB: string;
  locations: string;
  /**
   * Muse ids this Muse has played / had sex with — enables joint chat cast.
   * Stored bidirectionally when toggled from the Muses list.
   */
  pairedWith: number[];
  /**
   * Durable chat memories (facts, nicknames, places, kinks tried…).
   * Synced with partners localStorage + Neon.
   */
  memories: MuseMemory[];
  /**
   * When true, Muse may introduce new acts / tones / modes.
   * When false, stay in the established vibe unless the user asks.
   */
  tryNewThings: boolean;
  /**
   * Sex ribbons earned with this Muse (chat tasks / claims).
   * Synced with partners localStorage + Neon.
   */
  sexRibbons: SexRibbonAward[];
  /**
   * Chat narration voice gender (Web Speech / future TTS).
   * Defaults from Muse presentation gender when unset.
   */
  voiceGender: MuseVoiceGender;
  /** Delivery preset: sultry/soft/bright (female) or deep/warm/smooth (male). */
  voicePreset: MuseVoicePresetId;
  /**
   * Voice target: `accent:<BCP47>` locale preference (e.g. accent:en-GB),
   * or a browser SpeechSynthesisVoice.voiceURI override.
   */
  voiceId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  partnerId: number;
  who: "You" | "Partner";
  text: string;
  at: string;
};

export type SceneLocation = {
  id: string;
  name: string;
  desc: string;
};

export type SceneLength = "short" | "medium" | "long";

/** Story craft POV — initial direction control on Stories. */
export type ScenePov = "you" | "partner" | "third";

export type SavedScene = {
  id: string;
  title: string;
  when: string;
  text: string;
  partnerIds: number[];
  locationId: string;
  kinks: string[];
  intensity: number;
  length: SceneLength;
  imagePrompt?: string;
};

export type SelfProfile = {
  name: string;
  gender: string;
  sexuality: string;
  looks: string;
  into: string;
  kinks: KinkEntry[];
  intensity: string;
  notes: string;
};

export const STORAGE = {
  partners: "narcissus.artOfX.partners.v2",
  scenes: "narcissus.artOfX.scenes.v2",
  self: "narcissus.artOfX.self.v2",
  chats: "narcissus.artOfX.chats.v1",
  /** Client-side Muse list order (id sequence) for “Your order” sort */
  museOrder: "narcissus.artOfX.museOrder.v1",
} as const;

/**
 * User-facing label for Art of X people.
 * Swap these strings to rebrand (API/DB stay `partners`).
 * Confirmed: Muses.
 */
export const PERSON_LABEL = {
  singular: "Muse",
  plural: "Muses",
  singularLower: "muse",
  pluralLower: "muses",
} as const;

export type MuseSortMode =
  | "acts-desc"
  | "manual"
  | "name-asc"
  | "name-desc"
  | "updated-desc"
  | "newest";

/** Default ledger / picker order — highest act rank first. */
export const DEFAULT_MUSE_SORT: MuseSortMode = "acts-desc";

export const MUSE_SORT_OPTIONS: { value: MuseSortMode; label: string }[] = [
  { value: "acts-desc", label: "By acts" },
  { value: "manual", label: "Your order" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "updated-desc", label: "Recently updated" },
  { value: "newest", label: "Newest added" },
];

export function samePartnerId(a: unknown, b: unknown): boolean {
  return Number(a) === Number(b) && Number.isFinite(Number(a));
}

/**
 * Sort Muses for display. Prefer importing `sortMuses` from `@/lib/museSort`
 * so “By acts” uses Echo-aligned overscore weights; this copy keeps non-act
 * modes available without a museActStats cycle.
 */
export function sortMuses(
  list: PartnerRecord[],
  mode: MuseSortMode,
  manualOrder: number[] = [],
): PartnerRecord[] {
  const copy = [...list];
  if (mode === "acts-desc") {
    // Act-weighted order lives in museSort / museActStats — keep insertion
    // order here so this helper never imports scoring.
    return copy;
  }
  if (mode === "manual") {
    if (!manualOrder.length) return copy;
    const rank = new Map(manualOrder.map((id, i) => [Number(id), i]));
    return copy.sort((a, b) => {
      const ra = rank.has(Number(a.id))
        ? rank.get(Number(a.id))!
        : Number.MAX_SAFE_INTEGER;
      const rb = rank.has(Number(b.id))
        ? rank.get(Number(b.id))!
        : Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return Number(a.id) - Number(b.id);
    });
  }
  if (mode === "name-asc") {
    return copy.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }
  if (mode === "name-desc") {
    return copy.sort((a, b) =>
      b.name.localeCompare(a.name, undefined, { sensitivity: "base" }),
    );
  }
  if (mode === "updated-desc") {
    return copy.sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    );
  }
  // newest by createdAt, then id
  return copy.sort((a, b) => {
    const c = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    return c !== 0 ? c : Number(b.id) - Number(a.id);
  });
}

export function loadMuseOrder(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE.museOrder) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

export function saveMuseOrder(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE.museOrder, JSON.stringify(ids));
  } catch {
    // ignore quota
  }
}

export const ART_OF_X_NAV = [
  {
    id: "partners",
    href: "/art-of-x/partners",
    label: PERSON_LABEL.plural,
    blurb: `${PERSON_LABEL.plural} — who, acts, kinks, dynamics, photos.`,
  },
  {
    id: "stories",
    href: "/art-of-x/stories",
    label: "Stories",
    blurb: "Scene builder — cast, place, kinks → explicit story craft.",
  },
  {
    id: "chat",
    href: "/art-of-x/chat",
    label: "AI chat",
    blurb: `Chat with ${PERSON_LABEL.singularLower} cards via xAI Grok (in character, streaming).`,
  },
  {
    id: "circle",
    href: "/circle",
    label: "Circle",
    blurb: "Finding people that fit you.",
  },
] as const;

/**
 * Grouped catalog for acts logged (editor + Muse ledger + Echo stats).
 * Directional acts use a clear “given” / “received” suffix so scoreboard
 * filters can split who did what.
 */
export const ACT_GROUPS: Array<{ cat: string; tags: string[] }> = [
  {
    cat: "Kiss / hands",
    tags: [
      "Kissed",
      "Made out",
      "Handjob given",
      "Handjob received",
      "Massage / body worship",
    ],
  },
  {
    cat: "Oral",
    tags: [
      "Blowjob given",
      "Blowjob received",
      "Cunnilingus given",
      "Cunnilingus received",
      "69",
      "Face-fucking",
      "Facial",
      "Cum in mouth",
      "Rimming given",
      "Rimming received",
    ],
  },
  {
    cat: "Penetration",
    tags: [
      "Vaginal sex",
      "Anal sex given",
      "Anal sex received",
      "Pegging / strap-on",
      "Creampie",
      "Creampie cleanup",
      "Toys",
    ],
  },
  {
    cat: "Power / sensation",
    tags: [
      "Dirty talk",
      "Domination",
      "Submission",
      "Bondage",
      "Spanking",
      "Chastity / cage",
      "Edging",
    ],
  },
  {
    cat: "Social / place",
    tags: [
      "Threesome",
      "Group sex",
      "Swinging",
      "Public / semi-public",
      "Watched by others",
      "Voyeur",
      "Hotel / travel",
      "Car sex",
      "Overnight",
    ],
  },
  {
    cat: "Play / identity",
    tags: ["Roleplay", "Crossdressing", "Piss play"],
  },
];

export const DONE_ACTS = ACT_GROUPS.flatMap((g) => g.tags);

/** Map legacy act labels → refined catalog (stats stay accurate). */
export const ACT_ALIASES: Record<string, string> = {
  Handjob: "Handjob given",
  "Received handjob": "Handjob received",
  "Anal sex (gave)": "Anal sex given",
  "Anal sex (received)": "Anal sex received",
  Rimming: "Rimming given",
};

export function canonicalizeAct(tag: string): string {
  const t = String(tag || "").trim();
  if (!t) return "";
  return ACT_ALIASES[t] || t;
}

/** Dedupe + alias-migrate logged acts onto the current catalog labels. */
export function normalizeDoneActs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const next = canonicalizeAct(String(item || ""));
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

/** Wishlist acts use the same catalog + alias migration as doneActs. */
export function normalizeWantActs(raw: unknown): string[] {
  return normalizeDoneActs(raw);
}

/**
 * Drop any wantActs that are already logged as done (wishlist is “not yet”).
 */
export function reconcileWantActs(
  doneActs: string[] | undefined,
  wantActs: string[] | undefined,
): string[] {
  const done = new Set(normalizeDoneActs(doneActs));
  return normalizeWantActs(wantActs).filter((a) => !done.has(a));
}

export const DYN_TAGS = [
  "Long-term",
  "Casual",
  "First",
  "Ex",
  "Ongoing",
  "Controlling",
  "Dominant",
  "Submissive",
  "Free-use",
  "Directs me",
  "I direct",
  "Hotwife/Cuck",
  "Group regular",
  "Secret",
  "Public risk",
  "Emotional",
  "Rough",
  "Gentle",
  "Owns me",
  "Friends with benefits",
] as const;

export const KINK_GROUPS: Array<{ cat: string; tags: string[] }> = [
  {
    cat: "Oral / fluid",
    tags: [
      "Oral",
      "Blowjob",
      "Facial",
      "Cum play",
      "Creampie",
      "Creampie cleanup",
      "ATM",
      "Face-fucking",
    ],
  },
  {
    cat: "Penetration",
    tags: ["Vaginal", "Anal", "Pegging", "Breeding", "Double penetration"],
  },
  {
    cat: "Toys",
    tags: ["Toys", "Strap-on", "Vibrator", "Plug", "Cage"],
  },
  {
    cat: "Power",
    tags: ["Dom / Sub", "Free-use", "Femdom", "Ownership", "Directed"],
  },
  {
    cat: "Restraint / sensation",
    tags: ["Bondage", "Spanking", "Edging", "Praise", "Degradation"],
  },
  {
    cat: "Social / risk",
    tags: ["Group", "Threesome", "Public", "Voyeur", "Cuckold", "Hotwife"],
  },
  {
    cat: "Identity / play",
    tags: ["Crossdressing", "Roleplay", "Dirty talk", "Piss play"],
  },
];

export const ALL_KINKS = KINK_GROUPS.flatMap((g) => g.tags);

export const ROLES: KinkRole[] = ["Both", "Receive", "Give", "Watch"];
export const STATUSES: KinkStatus[] = [
  "Like",
  "Favorite",
  "Curious",
  "Soft limit",
  "Hard limit",
];

/**
 * Shared scene settings for Stories, Muse chat, and Companion scenes.
 * ~20 sexy / fun-surprise picks — keep names vivid, never bland.
 * Ids stay stable so saved Stories locationId values keep resolving.
 */
export const DEFAULT_LOCS: SceneLocation[] = [
  {
    id: "hotel",
    name: "Hotel suite",
    desc: "King bed, blackout curtains, minibar wrecked. Room service can wait.",
  },
  {
    id: "penthouse",
    name: "Penthouse suite",
    desc: "Floor-to-ceiling glass, city glow. Soft carpets, hard edges.",
  },
  {
    id: "rooftop",
    name: "Rooftop terrace",
    desc: "Night air, skyline. Someone could look up.",
  },
  {
    id: "club-vip",
    name: "Club VIP room",
    desc: "Bass through the wall. Bottle service, velvet, locked door.",
  },
  {
    id: "club-bath",
    name: "Club bathroom",
    desc: "Stall lock clicked. Music thumps; someone waits for the sink.",
  },
  {
    id: "dancefloor",
    name: "Dark dance floor",
    desc: "Bodies packed close. Hands can wander without a name.",
  },
  {
    id: "limo",
    name: "Limo backseat",
    desc: "Partition up. Soft leather, city lights sliding past.",
  },
  {
    id: "jet",
    name: "Private jet",
    desc: "Narrow aisle, leather seats, clouds outside the window.",
  },
  {
    id: "yacht",
    name: "Yacht cabin",
    desc: "Gentle rock of the hull. Ocean nowhere and everywhere.",
  },
  {
    id: "beach-cabana",
    name: "Beach cabana",
    desc: "Sheer curtains, salt air, daybed. Waves cover the sounds.",
  },
  {
    id: "sauna",
    name: "Spa steam room",
    desc: "Heat, cedar, towels that keep slipping. Fog hides everything.",
  },
  {
    id: "pool",
    name: "Pool / Hot tub",
    desc: "Warm water, wet skin, chlorine and steam.",
  },
  {
    id: "dungeon",
    name: "Private dungeon",
    desc: "Leather, hardware, low light. Rules are the only furniture that matters.",
  },
  {
    id: "elevator",
    name: "Elevator",
    desc: "Mirrored walls, floors ticking by. Could stop any second.",
  },
  {
    id: "office",
    name: "Office after hours",
    desc: "Desk lamp only. Cubicles empty, building locked.",
  },
  {
    id: "fitting",
    name: "Fitting room",
    desc: "Thin curtain, harsh light. Shoppers just outside.",
  },
  {
    id: "car",
    name: "Parked car",
    desc: "Fogged windows, leather and skin. Risk of being seen.",
  },
  {
    id: "shower",
    name: "Steamy shower",
    desc: "Tile, water over bodies, fogged glass. Nowhere to hide.",
  },
  {
    id: "train",
    name: "Train sleeper",
    desc: "Rhythmic sway, thin door. Corridor footsteps possible.",
  },
  {
    id: "balcony",
    name: "City balcony",
    desc: "Rail against your back. Traffic below, curtains half-drawn.",
  },
];

/** Resolve a scene location by id; falls back to the first curated pick. */
export function resolveSceneLocation(
  id?: string | null,
): SceneLocation {
  if (id) {
    const hit = DEFAULT_LOCS.find((l) => l.id === id);
    if (hit) return hit;
  }
  return DEFAULT_LOCS[0]!;
}

export const SURPRISES = [
  "Someone unexpected texts that they are five minutes away.",
  "A toy you forgot about gets pulled out and used.",
  "They switch who is in charge mid-scene.",
  "One of them insists on edging you longer than planned.",
  "A light public-risk element creeps in (door unlocked / window open).",
  "Someone wants photos or voice notes for later.",
  "A third person is invited to watch only — at first.",
  "They make you narrate what you want in detail before continuing.",
  "A chastity / denial beat shows up for a stretch.",
  "Cleanup becomes the focus after the main act.",
];

/** Clickable role boxes on Stories — toggle into the roles brief. */
export const SCENE_ROLE_CHIPS = [
  "You lead",
  "Muse leads",
  "Switch",
  "Service top",
  "Service bottom",
  "Dom / sub",
  "Free-use",
  "Watcher joins",
] as const;

/** Snapshot of direction boxes used to detect steer deltas after a scene exists. */
export type StoryDirectionBrief = {
  locId: string;
  locName: string;
  kinks: string[];
  roles: string;
  surprises: number;
  extra: string;
  intensity: number;
};

/**
 * Build a steer `direction` string from box/picker deltas since the last
 * generate or continue. Empty string means no box-driven steer (plain continue).
 */
export function buildSteerDirectionFromBoxes(
  committed: StoryDirectionBrief | null,
  next: StoryDirectionBrief,
): string {
  if (!committed) return "";
  const parts: string[] = [];
  if (next.locId !== committed.locId) {
    parts.push(`Move the scene to ${next.locName}`);
  }
  const added = next.kinks.filter((k) => !committed.kinks.includes(k));
  const removed = committed.kinks.filter((k) => !next.kinks.includes(k));
  if (added.length) parts.push(`Lean into: ${added.join(", ")}`);
  if (removed.length) parts.push(`Ease off: ${removed.join(", ")}`);
  const nextRoles = next.roles.trim();
  const prevRoles = committed.roles.trim();
  if (nextRoles && nextRoles !== prevRoles) {
    parts.push(`Roles / who leads: ${nextRoles}`);
  } else if (!nextRoles && prevRoles) {
    parts.push("Drop the previous role notes and follow the cast’s chemistry");
  }
  if (next.surprises !== committed.surprises) {
    parts.push(
      next.surprises > 0
        ? `Fold in ${next.surprises} surprise turn(s)`
        : "No surprise turns — keep the arc clean",
    );
  }
  if (next.intensity !== committed.intensity) {
    parts.push(`Shift intensity to ${next.intensity}/10`);
  }
  const nextExtra = next.extra.trim();
  const prevExtra = committed.extra.trim();
  if (nextExtra && nextExtra !== prevExtra) {
    parts.push(nextExtra);
  }
  return parts.join(". ");
}

export function normalizeKinks(
  list: Array<string | KinkEntry> | undefined,
): KinkEntry[] {
  if (!list?.length) return [];
  return list
    .map((item) => {
      if (typeof item === "string") {
        return {
          tag: item,
          role: "Both" as const,
          status: "Like" as const,
          intensity: 6,
        };
      }
      return {
        tag: item.tag || "",
        role: item.role || "Both",
        status: item.status || "Like",
        intensity: typeof item.intensity === "number" ? item.intensity : 6,
      };
    })
    .filter((x) => x.tag);
}

/** Muse edit buckets for kink status (one tag → one bucket). */
export type MuseKinkBucket = "into" | "try" | "hardNo";

export function kinkBucketOf(status: KinkStatus | string): MuseKinkBucket {
  if (status === "Curious") return "try";
  if (status === "Hard limit" || status === "Soft limit") return "hardNo";
  return "into";
}

export function kinkStatusForBucket(
  bucket: MuseKinkBucket,
  previous?: KinkEntry,
): KinkStatus {
  if (bucket === "try") return "Curious";
  if (bucket === "hardNo") return "Hard limit";
  if (previous?.status === "Favorite") return "Favorite";
  return "Like";
}

export function kinksInBucket(
  list: Array<string | KinkEntry> | undefined,
  bucket: MuseKinkBucket,
): string[] {
  return normalizeKinks(list)
    .filter((k) => kinkBucketOf(k.status) === bucket)
    .map((k) => k.tag);
}

/**
 * Toggle a kink tag into a Muse bucket. Same tag can’t sit in two buckets —
 * selecting again in the active bucket removes it; selecting in another moves it.
 */
export function toggleKinkBucket(
  list: Array<string | KinkEntry> | undefined,
  tag: string,
  bucket: MuseKinkBucket,
): KinkEntry[] {
  const clean = String(tag || "").trim();
  if (!clean) return normalizeKinks(list);
  const current = normalizeKinks(list);
  const existing = current.find((k) => k.tag === clean);
  if (existing && kinkBucketOf(existing.status) === bucket) {
    return current.filter((k) => k.tag !== clean);
  }
  const next: KinkEntry = {
    tag: clean,
    role: existing?.role || "Both",
    status: kinkStatusForBucket(bucket, existing),
    intensity:
      typeof existing?.intensity === "number" ? existing.intensity : 6,
  };
  return [...current.filter((k) => k.tag !== clean), next];
}

/** Postgres `integer` / `serial` max — client temp ids must fit. */
export const PG_INT4_MAX = 2_147_483_647;

/**
 * Next partner id that fits Postgres int4.
 * Prefer a time-derived slot (not raw Date.now(), which overflows int4),
 * then fall back to unused randoms within the local list.
 */
export function nextPartnerId(existing: { id: number }[] = []): number {
  const used = new Set(
    existing
      .map((p) => p.id)
      .filter((id) => Number.isFinite(id) && id > 0 && id <= PG_INT4_MAX),
  );
  // ~ms within ~24 days — fits int4 and stays unique across rapid adds
  let id = (Date.now() % 2_000_000_000) + 1;
  if (!used.has(id)) return id;
  for (let i = 0; i < 64; i++) {
    id = Math.floor(Math.random() * PG_INT4_MAX) + 1;
    if (!used.has(id)) return id;
  }
  // Last resort: scan upward from 1
  for (let n = 1; n <= PG_INT4_MAX; n++) {
    if (!used.has(n)) return n;
  }
  return 1;
}

export function emptyPartner(
  name = "",
  existing: { id: number }[] = [],
): PartnerRecord {
  const now = new Date().toISOString();
  return {
    id: nextPartnerId(existing),
    name,
    type: "Real",
    gender: "woman",
    looks: "",
    notes: "",
    history: "",
    dynamics: "",
    dynTags: [],
    kinks: [],
    doneActs: [],
    wantActs: [],
    photos: [],
    mainPhotoIndex: 0,
    favorite: false,
    museKind: "solo",
    members: [],
    isCouple: false,
    partnerA: "",
    partnerB: "",
    locations: "",
    pairedWith: [],
    memories: [],
    tryNewThings: false,
    sexRibbons: [],
    voiceGender: defaultVoiceGender("woman"),
    voicePreset: "auto",
    voiceId: "",
    createdAt: now,
    updatedAt: now,
  };
}

/** Normalize paired Muse ids (positive ints, unique, no self). */
export function normalizePairedWith(
  list: unknown,
  selfId?: number,
): number[] {
  if (!Array.isArray(list)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  const self = selfId != null ? Number(selfId) : NaN;
  for (const raw of list) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (Number.isFinite(self) && samePartnerId(n, self)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Primary + up to 3 mates = 4 Muses in one chat. */
export const MAX_MUSE_CAST = 4;
export const MAX_MUSE_CAST_MATES = MAX_MUSE_CAST - 1;

/** Stable chat thread key for a Muse pair (order-independent). */
export function musePairThreadKey(a: number, b: number): string {
  const x = Number(a);
  const y = Number(b);
  return x <= y ? `pair:${x}-${y}` : `pair:${y}-${x}`;
}

/**
 * Thread key for solo / dual / group cast.
 * Dual (exactly one mate) keeps `pair:lo-hi` for existing chats.
 * Three+ Muses use `group:sorted-ids`.
 */
export function museCastThreadKey(
  primaryId: number,
  mateIds: number[],
): string {
  const primary = Number(primaryId);
  const mates = normalizeCastMateIds(mateIds, primary);
  if (mates.length === 0) return String(primary);
  if (mates.length === 1) return musePairThreadKey(primary, mates[0]!);
  const all = [primary, ...mates].sort((a, b) => a - b);
  return `group:${all.join("-")}`;
}

export function isMusePairThreadKey(key: string): boolean {
  return /^pair:\d+-\d+$/.test(key);
}

export function isMuseGroupThreadKey(key: string): boolean {
  return /^group:\d+(?:-\d+)+$/.test(key);
}

export function isMuseCastThreadKey(key: string): boolean {
  return isMusePairThreadKey(key) || isMuseGroupThreadKey(key);
}

/** Normalize cast mate ids (positive ints, unique, no primary, capped). */
export function normalizeCastMateIds(
  list: unknown,
  primaryId?: number,
  maxMates: number = MAX_MUSE_CAST_MATES,
): number[] {
  if (!Array.isArray(list) && typeof list !== "string") {
    if (list == null || list === "") return [];
    const n = Number(list);
    if (!Number.isFinite(n) || n <= 0) return [];
    const primary = primaryId != null ? Number(primaryId) : NaN;
    if (Number.isFinite(primary) && samePartnerId(n, primary)) return [];
    return [n];
  }
  const raw = Array.isArray(list)
    ? list
    : String(list)
        .split(/[,+\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
  const out: number[] = [];
  const seen = new Set<number>();
  const primary = primaryId != null ? Number(primaryId) : NaN;
  for (const item of raw) {
    const n = Number(item);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (Number.isFinite(primary) && samePartnerId(n, primary)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= maxMates) break;
  }
  return out;
}

/** Parse `?with=` — single id or comma/plus-separated list. */
export function parseCastWithParam(
  withParam: string | null | undefined,
  primaryId?: number,
): number[] {
  if (withParam == null || !String(withParam).trim()) return [];
  return normalizeCastMateIds(String(withParam), primaryId);
}

/** Serialize cast mates for `?with=`. */
export function formatCastWithParam(mateIds: number[]): string {
  return normalizeCastMateIds(mateIds).join(",");
}

/** Ensure every pair among ids is marked been-together (bidirectional). */
export function ensureMuseGroupPairings(
  list: PartnerRecord[],
  ids: number[],
): PartnerRecord[] {
  const uniq = normalizeCastMateIds(ids, undefined, MAX_MUSE_CAST);
  if (uniq.length < 2) return list;
  let next = list;
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const aId = uniq[i]!;
      const bId = uniq[j]!;
      const a = next.find((p) => samePartnerId(p.id, aId));
      if (!a) continue;
      const already = normalizePairedWith(a.pairedWith, a.id).some((id) =>
        samePartnerId(id, bId),
      );
      if (!already) next = toggleMusePairing(next, aId, bId);
    }
  }
  return next;
}

/** Toggle a bidirectional “been together” link between two Muses. */
export function toggleMusePairing(
  list: PartnerRecord[],
  aId: number,
  bId: number,
): PartnerRecord[] {
  if (samePartnerId(aId, bId)) return list;
  const a = list.find((p) => samePartnerId(p.id, aId));
  const b = list.find((p) => samePartnerId(p.id, bId));
  if (!a || !b) return list;
  const linked = normalizePairedWith(a.pairedWith, a.id).some((id) =>
    samePartnerId(id, bId),
  );
  const now = new Date().toISOString();
  return list.map((p) => {
    if (samePartnerId(p.id, aId)) {
      const pairedWith = linked
        ? normalizePairedWith(p.pairedWith, p.id).filter(
            (id) => !samePartnerId(id, bId),
          )
        : normalizePairedWith([...normalizePairedWith(p.pairedWith, p.id), bId], p.id);
      return { ...p, pairedWith, updatedAt: now };
    }
    if (samePartnerId(p.id, bId)) {
      const pairedWith = linked
        ? normalizePairedWith(p.pairedWith, p.id).filter(
            (id) => !samePartnerId(id, aId),
          )
        : normalizePairedWith([...normalizePairedWith(p.pairedWith, p.id), aId], p.id);
      return { ...p, pairedWith, updatedAt: now };
    }
    return p;
  });
}

/** Resolve paired Muse records for a given Muse (order follows pairedWith). */
export function pairedMusesFor(
  partner: PartnerRecord,
  roster: PartnerRecord[],
): PartnerRecord[] {
  const ids = normalizePairedWith(partner.pairedWith, partner.id);
  return ids
    .map((id) => roster.find((p) => samePartnerId(p.id, id)))
    .filter((p): p is PartnerRecord => Boolean(p));
}

export function mainPhoto(p: PartnerRecord): string | null {
  if (!p.photos?.length) return null;
  const i = Math.min(
    Math.max(0, p.mainPhotoIndex ?? 0),
    p.photos.length - 1,
  );
  return p.photos[i] || p.photos[0] || null;
}

export function withMainPhoto(
  p: PartnerRecord,
  index: number,
): PartnerRecord {
  if (!p.photos.length) return { ...p, mainPhotoIndex: 0 };
  const i = Math.min(Math.max(0, index), p.photos.length - 1);
  return { ...p, mainPhotoIndex: i };
}

/** Local AI chat stub — partner-aware; swap for real LLM later. */
export function stubPartnerReply(
  partner: PartnerRecord,
  userText: string,
): string {
  const kinkBits = normalizeKinks(partner.kinks)
    .slice(0, 3)
    .map((k) => k.tag.toLowerCase())
    .join(", ");
  const tone =
    partner.dynTags.includes("Dominant") ||
    partner.dynTags.includes("Controlling") ||
    partner.dynTags.includes("Owns me")
      ? "dominant"
      : partner.dynTags.includes("Gentle")
        ? "gentle"
        : "direct";
  const name = displayName(partner);
  const hooks = [
    tone === "dominant"
      ? `${name} doesn't ask twice. "${userText.trim() ? "I heard you." : "Speak up."} Now do what I want."`
      : tone === "gentle"
        ? `${name} softens. "Tell me more about that… I want every detail."`
        : `${name} leans in. "Keep talking. I want the filthy version."`,
    kinkBits
      ? `(They're clearly in a ${kinkBits} headspace with you.)`
      : `(They're watching you the way only someone who knows your history can.)`,
    partner.history
      ? `They reference what you've already done: ${partner.history.slice(0, 120)}${partner.history.length > 120 ? "…" : ""}`
      : "This is still early — they're curious what you'll let them do.",
  ];
  return hooks.join("\n\n");
}

export function emptySelf(): SelfProfile {
  return {
    name: "",
    gender: "",
    sexuality: "",
    looks: "",
    into: "",
    kinks: [],
    intensity: "7–9",
    notes: "",
  };
}

export function displayName(p: PartnerRecord): string {
  const kind = normalizeMuseKind(p.museKind, p);
  if (kind === "couple" || kind === "group") {
    const members = museMembersOf(p);
    const joined = formatMemberNames(members);
    if (joined) {
      // Prefer the unit name when the user set one that isn't just "Couple".
      const unit = (p.name || "").trim();
      if (
        unit &&
        !/^couple$/i.test(unit) &&
        !/^group$/i.test(unit) &&
        unit.toLowerCase() !== joined.toLowerCase()
      ) {
        return unit;
      }
      return joined;
    }
  }
  return p.name;
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function partnerTone(
  p: PartnerRecord,
): "dominant" | "gentle" | "playful" | "direct" {
  const tags = (p.dynTags || []).map((t) => t.toLowerCase());
  const dyn = (p.dynamics || "").toLowerCase();
  if (
    tags.some((t) =>
      /dom|control|owns|rough|command/.test(t),
    ) ||
    /dom|control|owns|command/.test(dyn)
  ) {
    return "dominant";
  }
  if (tags.some((t) => /gentle|soft|care/.test(t)) || /gentle|soft/.test(dyn)) {
    return "gentle";
  }
  if (tags.some((t) => /play|flirt|tease/.test(t))) {
    return "playful";
  }
  return "direct";
}

function lookHook(p: PartnerRecord): string {
  const name = displayName(p);
  if (!p.looks?.trim()) return name;
  const bit = p.looks.split(/[,.]/)[0]?.trim() || p.looks.trim();
  return `${name} (${bit})`;
}

function hasKink(kinks: string[], re: RegExp): boolean {
  return kinks.some((k) => re.test(k));
}

type KinkBeatKind =
  | "oral"
  | "anal"
  | "vaginal"
  | "edge"
  | "talk"
  | "group"
  | "restraint"
  | "toy"
  | "finish"
  | "roleplay"
  | "piss"
  | "generic";

function kinkKind(tag: string): KinkBeatKind {
  const t = tag.toLowerCase();
  if (/oral|blow|face-fuck|facial|throat/.test(t)) return "oral";
  if (/anal|peg|atm|ass|strap-on|strap on/.test(t)) return "anal";
  if (/vaginal|breed|creampie/.test(t)) return "vaginal";
  if (/edg|deny|chast/.test(t)) return "edge";
  if (/cage/.test(t)) return "toy";
  if (/dirty talk|degrad|praise|dom\s*\/\s*sub|femdom|ownership|directed/.test(t))
    return "talk";
  if (/group|threesome|voyeur|cuck|hotwife|free-use|public/.test(t))
    return "group";
  if (/bondage|spank|restrain/.test(t)) return "restraint";
  if (/toy|vibrator|plug/.test(t)) return "toy";
  if (/cum play|cum|facial/.test(t)) return "finish";
  if (/roleplay|crossdress/.test(t)) return "roleplay";
  if (/piss/.test(t)) return "piss";
  return "generic";
}

/**
 * Primary act beats driven by the user's scene kink selections, in selection
 * order. Stock oral/anal only appears when those kinks were chosen.
 */
function kinkDrivenBeats(
  partners: PartnerRecord[],
  kinks: string[],
  intensity: number,
  roles?: string,
): string[] {
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const roleBit = roles?.trim()
    ? ` Roles stay clear: ${roles.trim()}.`
    : "";

  const lines: Record<KinkBeatKind, string> = {
    oral: b
      ? `${a} and ${b} trade your cock between mouths — spit strings, messy sounds, one holding eye contact while the other takes you deeper than polite.${roleBit}`
      : `${a} works your cock with a wet, deliberate mouth — tongue under the head, then deeper, spit shining down the shaft while hands keep you exactly where they want you.${roleBit}`,
    anal: `Attention drops to your ass: lube warm on fingers, pressure circling your hole, then a slow push that makes your breath catch. ${a} talks you through the stretch like it's the point${intensity >= 8 ? " — no mercy once you're open" : ""}.${roleBit}`,
    vaginal: `${a} guides you onto them — heat, stretch, hips locking — fucking with a rhythm that matches the ${intensity}/10 heat they asked for.${roleBit}`,
    edge: `Every time your hips start to chase it, they back off — lighter touch, almost-cruel patience — until you're shaking and swearing. Intensity ${intensity}/10 means they enjoy denying you.`,
    talk: `The talk stays specific: what you look like open, how wet you already are, what they're going to put in you next — not generic porn lines, their voice.${roleBit}`,
    group: b
      ? `The room feels shared. Hands multiply. ${a} uses you while ${b} watches close enough to feel the heat off your skin — then trades places without asking twice.`
      : `${a} treats you like something already claimed for the night — free-use energy, no performance, just appetite.`,
    restraint: `A grip, a cuff, a hand pinning a wrist — bondage and control land as ${kinks.filter((k) => /bondage|spank|restrain/i.test(k)).join(" / ") || "restraint"} — enough that you feel the choice leave your body in the best way.`,
    toy: `A toy comes out like it was always part of the plan — buzz, stretch, or lock — and ${a} uses it to keep you exactly where they want you.`,
    finish: `They talk about finishing in/on you like it's already decided — warm, messy, owned — and make you wait for it anyway.`,
    roleplay: `The roleplay holds: costumes, titles, the agreed fiction — and they refuse to break character while they take you apart.`,
    piss: `${a} leans into the messier hunger you've already named — piss play heat, no flinch, treated as part of the night's claim on you.`,
    generic: `${a} leans into ${kinks[0] || "what you asked for"} — hands and body working that hunger until it owns the room.${roleBit}`,
  };

  const seen = new Set<KinkBeatKind>();
  const out: string[] = [];
  for (const tag of kinks) {
    const kind = kinkKind(tag);
    if (seen.has(kind) && kind !== "generic") continue;
    seen.add(kind);
    if (kind === "generic") {
      out.push(
        `${a} makes "${tag}" the next beat — not a footnote, the act itself — at ${intensity}/10.${roleBit}`,
      );
    } else {
      out.push(lines[kind]);
    }
  }

  if (!out.length) {
    out.push(
      `${a} takes you apart with hands and body first — slow maps of skin, breath, and pressure — learning what makes your thighs jump before they decide how deep the night goes.${roleBit}`,
    );
  }
  return out;
}

function surpriseBeats(n: number): string {
  const count = Math.max(0, Math.min(5, Math.floor(n)));
  if (count <= 0) return "";
  const pool = [...SURPRISES];
  const out: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const j = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(j, 1)[0]!);
  }
  // Weave as narrative turns, not a detached checklist label when possible.
  return `\n\nThen the night twists:\n- ${out.join("\n- ")}`;
}

/**
 * Local scene craft driven by Stories initial-direction selections.
 * (LLM path: POST /api/art-of-x/generate-scene with the same fields.)
 */
export function buildStory(opts: {
  partners: PartnerRecord[];
  location: SceneLocation;
  kinks: string[];
  length: SceneLength;
  intensity: number;
  extra?: string;
  roles?: string;
  surpriseCount?: number;
  pov?: ScenePov;
}): string {
  const picks = opts.partners;
  if (!picks.length) return "";
  const a = picks[0]!;
  const b = picks[1];
  const c = picks[2];
  const loc = opts.location;
  const tone = partnerTone(a);
  const aName = displayName(a);
  const pov = opts.pov || "you";
  const kinkArr = opts.kinks;

  const openings =
    pov === "you"
      ? [
          `${loc.name}. ${loc.desc} Heat hangs in the air already — not rushed, just inevitable.`,
          `${loc.name}. ${loc.desc} You feel it before anyone speaks: the decision already made in the way they look at you.`,
          `${loc.name}. ${loc.desc} Clothes come off like an argument you've already lost — gladly.`,
        ]
      : [
          `${loc.name}. ${loc.desc} The night tilts toward filthy the second ${lookHook(a)} decides it should.`,
          `${loc.name}. ${loc.desc} Nobody pretends this is casual once hands start moving.`,
        ];

  let scene = `${pickOne(openings)}\n\n`;

  if (opts.roles?.trim()) {
    scene += `Agreed roles shape everything from the first touch: ${opts.roles.trim()}.\n\n`;
  }
  if (opts.extra?.trim()) {
    scene += `Your direction sets the night: ${opts.extra.trim()}\n\n`;
  }

  if (pov === "you") {
    scene += `${lookHook(a)}`;
    if (b) scene += ` and ${lookHook(b)}`;
    if (c) scene += `, with ${displayName(c)} close enough to touch`;
    scene +=
      tone === "dominant"
        ? " move in like they own the next hour of your life.\n\n"
        : tone === "gentle"
          ? " ease in close — soft mouths, firm intent.\n\n"
          : " close the distance without hesitation.\n\n";
  } else if (pov === "partner") {
    scene += `${lookHook(a)} takes the lead from inside their own hunger — watching you the way someone does when they already know how this ends.\n\n`;
  } else {
    scene += `${lookHook(a)} takes the lead. The rest of the cast falls into orbit.\n\n`;
  }

  if (a.history?.trim()) {
    scene += `They already know your body from before: ${a.history.trim().slice(0, 140)}${a.history.trim().length > 140 ? "…" : ""}\n\n`;
  }

  // Lead with selected kink acts — never a fixed oral/anal block.
  // Length scales how many selected-kink beats are fully expanded.
  const beats = kinkDrivenBeats(picks, kinkArr, opts.intensity, opts.roles);
  const need =
    opts.length === "short"
      ? Math.min(2, beats.length)
      : opts.length === "long"
        ? beats.length
        : Math.min(beats.length, Math.max(2, Math.ceil(beats.length * 0.75)));
  for (let i = 0; i < need; i++) {
    scene += `${beats[i]!}\n\n`;
  }
  // For short/medium, name kinks that didn't get a dedicated beat.
  if (need < beats.length && kinkArr.length) {
    const seenKinds = new Set<KinkBeatKind>();
    const expandedTags: string[] = [];
    for (const tag of kinkArr) {
      const kind = kinkKind(tag);
      if (seenKinds.has(kind) && kind !== "generic") continue;
      seenKinds.add(kind);
      expandedTags.push(tag);
      if (expandedTags.length >= need) break;
    }
    const rest = kinkArr.filter((t) => !expandedTags.includes(t)).join(", ");
    if (rest) {
      scene += `They keep pulling the night back to the rest of what you chose: ${rest}.\n\n`;
    }
  }

  if (opts.length !== "short") {
    scene += `They settle into a rhythm meant to last — escalation tuned to ${opts.intensity}/10. Pace drops when you get close, then harder again. Talk stays specific to what you asked for.\n\n`;
    if (c) {
      scene += `${displayName(c)} watches for a stretch, then moves closer. "My turn soon."\n\n`;
    }
    if (a.dynTags.length || a.dynamics?.trim()) {
      scene += `The dynamic is unmistakable${a.dynamics?.trim() ? ` — ${a.dynamics.trim()}` : ""}${a.dynTags.length ? ` (${a.dynTags.join(", ")})` : ""}.\n\n`;
    }
  }

  if (opts.length === "long") {
    scene +=
      "Time stretches. Positions shift without announcement. Acts trade places around the kinks you chose. Nobody is in a hurry to end this.\n\n";
  }

  if (kinkArr.length) {
    scene += `Through-line kinks held the whole way: ${kinkArr.join(", ")}.`;
  }

  scene += surpriseBeats(opts.surpriseCount ?? 0);

  if (pov === "third") {
    scene = scene
      .replace(/\bYou\b/g, "They")
      .replace(/\byou\b/g, "they")
      .replace(/\bYour\b/g, "Their")
      .replace(/\byour\b/g, "their");
  }
  return scene.trim();
}

export type StoryContinueOpts = {
  partners: PartnerRecord[];
  pov?: ScenePov;
  kinks?: string[];
  location?: SceneLocation;
  intensity?: number;
  roles?: string;
  extra?: string;
  length?: SceneLength;
};

function applyScenePov(text: string, pov: ScenePov): string {
  if (pov === "third") {
    return text
      .replace(/\bYou\b/g, "They")
      .replace(/\byou\b/g, "they")
      .replace(/\bYour\b/g, "Their")
      .replace(/\byour\b/g, "their")
      .replace(/\bYou've\b/g, "They've")
      .replace(/\byou've\b/g, "they've");
  }
  if (pov === "partner") {
    return text
      .replace(/\bYou say what you want:/g, "They name what they want:")
      .replace(/\bYou say\b/g, "They say");
  }
  return text;
}

/**
 * Local continue/steer paragraph budgets — aligned with sceneLengthBudget
 * paragraph ranges in sceneCraft (short 2–4, medium 4–6, long 6–10).
 */
function continueParagraphTarget(length: SceneLength): number {
  if (length === "short") return 3;
  if (length === "long") return 8;
  return 5;
}

function lengthPadParagraphs(
  seed: string[],
  partners: PartnerRecord[],
  kinks: string[],
  length: SceneLength,
  intensity = 7,
  roles?: string,
): string[] {
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const target = continueParagraphTarget(length);
  const paras = seed.map((p) => p.trim()).filter(Boolean);
  const kinkBeats = kinkDrivenBeats(partners, kinks, intensity, roles);
  const filler = [
    ...kinkBeats,
    kinks.length
      ? `They keep pulling the night back to ${kinks.slice(0, 4).join(", ")} — not as a checklist, as the acts themselves — lingering on each one long enough that your body starts answering before they finish the sentence.`
      : `${a} keeps reading your body and answering whatever makes you shake hardest, mapping the next stretch like they already own the outcome.`,
    b
      ? `${b} takes a turn while ${a} stays close — hands steadying, mouth at your ear, filthy specifics that make the next thrust land harder and leave you nowhere to hide.`
      : `${a} changes the angle without asking — slower, then deeper — narrating every inch until holding still feels impossible and your voice breaks on the next breath.`,
    `Pace drops when you get close, then comes back meaner. Breath, sweat, the wet sound of it — none of it is rushed, and every pause is a threat you want kept.`,
    b
      ? `They trade places again. ${a} holds you open; ${b} uses that opening without hurry, talking through what they can feel while you try to stay coherent.`
      : `${a} edges on purpose, then pulls you back into that heat and refuses the finish a little longer, smiling at how badly you chase it.`,
    `Talk stays specific: how you look open, how wet you already are, what comes next if you ask nicely — or if you don't — and they make you listen while they deliver.`,
    `Positions shift. A knee slots higher. Weight settles differently. The scene stretches because they want it to, and because your body is still asking for more.`,
    `They do not rush the peak. Every few breaths they check you — then take more — until the through-line owns the room and your thighs won't stop shaking.`,
    `Time thins. Another position. Another round of praise and pressure. Nobody is ready to end this stretch yet, and they say so while they keep going.`,
  ];
  // Never truncate acted/seed prose — only pad up to the length target.
  let i = 0;
  while (paras.length < target) {
    paras.push(
      filler[i % filler.length] ||
        `They keep going — another shift, another filthy line — building past the last crest instead of settling.`,
    );
    i += 1;
  }
  if (length === "long") {
    paras.push(
      `They settle into a longer rhythm after that — escalation held, dialogue filthy, sensory detail thick enough that the continue stretch feels like its own chapter.`,
    );
  }
  return paras;
}

/** Continue beat — ArkOfX-style append when user gives no new direction. */
export function continueStory(
  previous: string,
  partnersOrOpts: PartnerRecord[] | StoryContinueOpts,
  povArg: ScenePov = "you",
  kinksArg: string[] = [],
  lengthArg: SceneLength = "medium",
): string {
  const opts: StoryContinueOpts = Array.isArray(partnersOrOpts)
    ? {
        partners: partnersOrOpts,
        pov: povArg,
        kinks: kinksArg,
        length: lengthArg,
      }
    : partnersOrOpts;
  const partners = opts.partners;
  const pov = opts.pov || "you";
  const kinks = opts.kinks || [];
  const length = opts.length || "medium";
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const kinkHint = kinks.length
    ? ` They keep the through-line on ${kinks.slice(0, 3).join(", ")}.`
    : "";
  const locHint = opts.location
    ? ` The ${opts.location.name.toLowerCase()} still frames every move.`
    : "";
  const roleHint = opts.roles?.trim()
    ? ` Roles stay locked: ${opts.roles.trim()}.`
    : "";
  const intensityHint =
    typeof opts.intensity === "number"
      ? ` Intensity holds at ${opts.intensity}/10.`
      : "";
  const extraHint = opts.extra?.trim()
    ? ` Your earlier direction still steers them: ${opts.extra.trim().slice(0, 120)}.`
    : "";
  const variants = b
    ? [
        `${a} and ${b} refuse to let the pace drop. Mouths and hands trade places, keeping the edge sharp until one of them decides you've earned more.${kinkHint}${locHint}${roleHint}${intensityHint}${extraHint}`,
        `${b} takes over while ${a} goes lower — tongue, fingers, filthy praise — until legs shake and breath breaks.${kinkHint}${locHint}${roleHint}${intensityHint}${extraHint}`,
        `They flip the angle. ${a} holds you open; ${b} uses that opening without hurry. Talk stays specific enough to make you drip.${kinkHint}${locHint}${roleHint}${intensityHint}${extraHint}`,
      ]
    : [
        `${a} keeps going — slower, then deeper — narrating every inch until holding still feels impossible.${kinkHint}${locHint}${roleHint}${intensityHint}${extraHint}`,
        `${a} edges on purpose, then pulls you back into that heat and refuses the finish a little longer.${kinkHint}${locHint}${roleHint}${intensityHint}${extraHint}`,
      ];
  const paras = lengthPadParagraphs(
    [pickOne(variants)],
    partners,
    kinks,
    length,
    typeof opts.intensity === "number" ? opts.intensity : 7,
    opts.roles,
  );
  let beat = `\n\n---\n\n${paras.join("\n\n")}`;
  beat = applyScenePov(beat, pov);
  return previous + beat;
}

export function injectStoryDirection(
  previous: string,
  direction: string,
  partnersOrOpts: PartnerRecord[] | StoryContinueOpts,
  lengthArg: SceneLength = "medium",
): string {
  const opts: StoryContinueOpts = Array.isArray(partnersOrOpts)
    ? { partners: partnersOrOpts, length: lengthArg }
    : partnersOrOpts;
  const partners = opts.partners;
  const pov = opts.pov || "you";
  const length = opts.length || lengthArg || "medium";
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const d = direction.toLowerCase();
  const kinkHint = opts.kinks?.length
    ? ` Through-line kinks stay in play: ${opts.kinks.slice(0, 3).join(", ")}.`
    : "";
  const locHint = opts.location
    ? ` Still in the ${opts.location.name.toLowerCase()}.`
    : "";
  const seed: string[] = [
    `You say what you want: "${direction.trim()}"`,
  ];
  let acted = false;
  if (/edge|deny|don't come|dont come|not yet/.test(d)) {
    acted = true;
    seed.push(
      "They back off the second you get close. Touch lightens. Mouths hover. You're held right there — shaking — until they decide you can have more.",
    );
  }
  if (/ass|anal|hole|peg|strap/.test(d)) {
    acted = true;
    seed.push(
      "Attention drops lower. Lube. Pressure at your hole. Slow push until you take it. They hold you open and talk while it happens.",
    );
  }
  if (/group|another|join|third|watch/.test(d)) {
    acted = true;
    seed.push(
      "The room gets more crowded. Another body moves in. Hands and mouths multiply. You're being shared.",
    );
  }
  if (/mouth|suck|oral|throat|blow/.test(d)) {
    acted = true;
    seed.push(
      "A mouth claims you again — wetter, hungrier — while hands keep the rest of you busy so you can't think past the next stroke.",
    );
  }
  if (/bondage|tie|cuff|spank/.test(d)) {
    acted = true;
    seed.push(
      "Restraint tightens — wrists pinned or cuffed — and the next stretch of the scene is about control as much as pleasure.",
    );
  }
  if (!acted) {
    seed.push(
      b
        ? `${a} and ${b} shift immediately to match that. The next stretch is built around your words — pace, acts, talk — held long enough to land.`
        : `${a} shifts immediately to match that. The next stretch is built around your words — pace, acts, talk — held long enough to land.`,
    );
  }
  seed.push(
    `They do not snap back to the old rhythm. This is the new line of the story until you steer again.${kinkHint}${locHint}`,
  );
  const paras = lengthPadParagraphs(
    seed,
    partners,
    opts.kinks || [],
    length,
    typeof opts.intensity === "number" ? opts.intensity : 7,
    opts.roles,
  );
  let beat = `\n\n---\n\n${paras.join("\n\n")}`;
  beat = applyScenePov(beat, pov);
  return previous + beat;
}

export function buildImagePrompt(opts: {
  partners: PartnerRecord[];
  location: SceneLocation;
  kinks: string[];
  roles?: string;
  extra?: string;
}): string {
  const people = opts.partners
    .map(
      (p) =>
        `${p.name}${p.looks ? ` (${p.looks})` : ""}${p.gender ? `, ${p.gender}` : ""}`,
    )
    .join("; ");
  let prompt = `Adult erotic scene, consensual, 18+. Setting: ${opts.location.name}. ${opts.location.desc}. `;
  prompt += `People: ${people}. `;
  if (opts.roles?.trim()) prompt += `Roles: ${opts.roles.trim()}. `;
  if (opts.kinks.length) prompt += `Kinks in frame: ${opts.kinks.join(", ")}. `;
  if (opts.extra?.trim()) prompt += `Direction: ${opts.extra.trim()}. `;
  prompt +=
    "Cinematic lighting, detailed bodies, explicit but not illegal, no minors, no text overlays.";
  return prompt;
}

/** Optional ArkOfX demo people (from uploaded private demo) — load on demand only. */
export function arkDemoRoster(): PartnerRecord[] {
  const now = new Date().toISOString();
  const seed: Array<{
    name: string;
    type: PersonType;
    looks: string;
    notes: string;
    kinks: string[];
    gender: PersonGender;
    history: string;
    dynTags: string[];
    dynamics: string;
    doneActs: string[];
  }> = [
    {
      name: "Carrie",
      type: "Real",
      looks: "Confident, often glasses",
      notes: "Dominant-leaning. Group, oral, free-use, cum play.",
      kinks: ["Oral", "Dirty talk", "Free-use", "Group", "Cum play", "Dom / Sub"],
      gender: "woman",
      history:
        "Oral, group, dirty talk, free-use energy, cum play. Dominant-leaning at times.",
      dynTags: ["Ongoing", "Dominant", "Free-use", "Group regular"],
      dynamics: "Dominant-leaning; free-use energy; group comfortable",
      doneActs: [
        "Blowjob given",
        "Dirty talk",
        "Domination",
        "Group sex",
        "Facial",
      ],
    },
    {
      name: "Cheryl",
      type: "Real",
      looks: "Black hair, MILF",
      notes: "Creampie cleanup, threesomes, strap-on, dirty talk.",
      kinks: ["Oral", "Anal", "Pegging", "Group", "Cum play", "Dirty talk"],
      gender: "woman",
      history:
        "Long-term. Creampie cleanup, threesomes and groups, strap-on, dirty talk.",
      dynTags: ["Long-term", "Ongoing", "Hotwife/Cuck", "Group regular"],
      dynamics: "Long-term partner energy; creampie/cleanup; brings others in",
      doneActs: [
        "Vaginal sex",
        "Creampie",
        "Creampie cleanup",
        "Threesome",
        "Pegging / strap-on",
        "Dirty talk",
      ],
    },
    {
      name: "Matt",
      type: "Real",
      looks: "",
      notes: "Controlling. Ass training, cage, piss play.",
      kinks: ["Anal", "Cage", "Dom / Sub", "Piss play", "Free-use"],
      gender: "man",
      history:
        "Long-term, controlling. Ass training, cage, piss play, directed partners.",
      dynTags: ["Long-term", "Controlling", "Owns me", "Dominant"],
      dynamics: "Calls the shots; directs partners; cage play",
      doneActs: [
        "Anal sex received",
        "Chastity / cage",
        "Domination",
        "Piss play",
        "Overnight",
      ],
    },
    {
      name: "Jules",
      type: "Dream",
      looks: "Femboy",
      notes: "Monster cock, aggressive, huge cum, dirty talk.",
      kinks: [
        "Oral",
        "Anal",
        "Face-fucking",
        "Dirty talk",
        "Dom / Sub",
        "Cum play",
      ],
      gender: "trans",
      history: "Dream/RP. Aggressive dominant; dirty talk.",
      dynTags: ["Dominant", "Rough", "Owns me"],
      dynamics: "Dream femboy; aggressive; dirty talk",
      doneActs: [
        "Blowjob given",
        "Face-fucking",
        "Anal sex received",
        "Dirty talk",
        "Facial",
      ],
    },
  ];
  return seed.map((s, i) => ({
    id: i + 1,
    name: s.name,
    type: s.type,
    gender: s.gender,
    looks: s.looks,
    notes: s.notes,
    history: s.history,
    dynamics: s.dynamics,
    dynTags: s.dynTags,
    kinks: normalizeKinks(s.kinks),
    doneActs: normalizeDoneActs(s.doneActs),
    wantActs: [],
    photos: [],
    mainPhotoIndex: 0,
    favorite: false,
    museKind: "solo" as MuseKind,
    members: [] as MuseMember[],
    isCouple: false,
    partnerA: "",
    partnerB: "",
    locations: "",
    pairedWith: [],
    memories: [],
    tryNewThings: false,
    sexRibbons: [],
    voiceGender: defaultVoiceGender(s.gender),
    voicePreset: "auto",
    voiceId: "",
    createdAt: now,
    updatedAt: now,
  }));
}

export function loadPartners(): PartnerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE.partners);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PartnerRecord[];
    return Array.isArray(parsed)
      ? parsed.map((p) => ({
          ...emptyPartner(p.name),
          ...p,
          kinks: normalizeKinks(p.kinks as unknown as Array<string | KinkEntry>),
          photos: Array.isArray(p.photos) ? p.photos : [],
          mainPhotoIndex:
            typeof p.mainPhotoIndex === "number" ? p.mainPhotoIndex : 0,
          gender: (() => {
            const raw = String(p.gender || "");
            if (PERSON_GENDERS.includes(raw as PersonGender)) {
              return raw as PersonGender;
            }
            if (/cross\s*dresser/i.test(raw)) return "crossdresser";
            return "woman";
          })(),
          museKind: normalizeMuseKind((p as PartnerRecord).museKind, p),
          members: (() => {
            const kind = normalizeMuseKind((p as PartnerRecord).museKind, p);
            const members = museMembersOf({
              ...p,
              museKind: kind,
              members: (p as PartnerRecord).members,
            });
            return members;
          })(),
          isCouple:
            normalizeMuseKind((p as PartnerRecord).museKind, p) === "couple" ||
            Boolean((p as PartnerRecord).isCouple) ||
            String(p.gender || "") === "couple",
          partnerA: String((p as PartnerRecord).partnerA || ""),
          partnerB: String((p as PartnerRecord).partnerB || ""),
          doneActs: normalizeDoneActs(p.doneActs),
          wantActs: reconcileWantActs(p.doneActs, (p as PartnerRecord).wantActs),
          dynTags: Array.isArray(p.dynTags) ? p.dynTags : [],
          pairedWith: normalizePairedWith(
            (p as PartnerRecord).pairedWith,
            Number(p.id),
          ),
          memories: normalizeMemories((p as PartnerRecord).memories),
          tryNewThings: Boolean((p as PartnerRecord).tryNewThings),
          sexRibbons: normalizeSexRibbons((p as PartnerRecord).sexRibbons),
          voiceGender: normalizeVoiceGender(
            (p as PartnerRecord).voiceGender,
            (() => {
              const raw = String(p.gender || "");
              if (PERSON_GENDERS.includes(raw as PersonGender)) {
                return raw as PersonGender;
              }
              return "woman";
            })(),
          ),
          voicePreset: normalizeVoicePreset(
            (p as PartnerRecord).voicePreset,
            normalizeVoiceGender(
              (p as PartnerRecord).voiceGender,
              String(p.gender || "woman"),
            ),
          ),
          voiceId:
            typeof (p as PartnerRecord).voiceId === "string"
              ? (p as PartnerRecord).voiceId.trim().slice(0, 200)
              : "",
        })).map((p) => {
          const id = Number(p.id);
          const kinded = withMuseKindFields(
            {
              ...p,
              id: Number.isFinite(id) && id > 0 ? id : nextPartnerId([]),
              pairedWith: normalizePairedWith(p.pairedWith, Number(p.id)),
            },
            {
              museKind: normalizeMuseKind(p.museKind, p),
              members: museMembersOf(p),
            },
          );
          const base = {
            ...kinded,
            pairedWith: normalizePairedWith(kinded.pairedWith, Number(kinded.id)),
          };
          return base.photos.length
            ? {
                ...base,
                mainPhotoIndex: Math.min(
                  Math.max(0, base.mainPhotoIndex),
                  base.photos.length - 1,
                ),
              }
            : { ...base, mainPhotoIndex: 0 };
        })
      : [];
  } catch {
    return [];
  }
}

/**
 * Soft budget for base64 Muse photos in one partners ledger.
 * Keep under the cloud PUT guard (~3.2M) and typical ~5MB localStorage.
 */
export const PARTNERS_PHOTO_BUDGET_CHARS = 2_800_000;

export function partnersPhotoStats(list: PartnerRecord[]): {
  photoCount: number;
  photoChars: number;
} {
  let photoCount = 0;
  let photoChars = 0;
  for (const p of list) {
    const photos = Array.isArray(p?.photos) ? p.photos : [];
    photoCount += photos.length;
    for (const src of photos) {
      if (typeof src === "string") photoChars += src.length;
    }
  }
  return { photoCount, photoChars };
}

async function shrinkDataUrlPhoto(
  src: string,
  maxSide: number,
  quality: number,
): Promise<string> {
  if (typeof window === "undefined") return src;
  if (typeof src !== "string" || !src.startsWith("data:image/")) return src;
  // Already tiny — skip decode cost.
  if (src.length < 40_000) return src;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = src;
    });
    const scale = Math.min(
      1,
      maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
    );
    const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, w, h);
    const next = canvas.toDataURL("image/jpeg", quality);
    return next.length < src.length ? next : src;
  } catch {
    return src;
  }
}

async function mapPartnerPhotos(
  list: PartnerRecord[],
  mapPhoto: (src: string, partner: PartnerRecord, index: number) => Promise<string>,
): Promise<PartnerRecord[]> {
  const out: PartnerRecord[] = [];
  for (const p of list) {
    const photos = Array.isArray(p.photos) ? p.photos : [];
    const nextPhotos: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      nextPhotos.push(await mapPhoto(photos[i]!, p, i));
    }
    out.push(
      nextPhotos === photos
        ? p
        : {
            ...p,
            photos: nextPhotos,
            mainPhotoIndex: nextPhotos.length
              ? Math.min(
                  Math.max(0, p.mainPhotoIndex ?? 0),
                  nextPhotos.length - 1,
                )
              : 0,
          },
    );
  }
  return out;
}

export type CompactPartnersResult = {
  partners: PartnerRecord[];
  compacted: boolean;
  droppedPhotos: number;
  photoChars: number;
};

/**
 * Fit Muse photo ledger under a char budget so localStorage + cloud PUT can
 * succeed. Re-encodes data-URLs, then drops non-main extras if still over.
 */
export async function compactPartnersForStorage(
  list: PartnerRecord[],
  maxChars = PARTNERS_PHOTO_BUDGET_CHARS,
): Promise<CompactPartnersResult> {
  let partners = list.map((p) => ({
    ...p,
    photos: Array.isArray(p.photos) ? [...p.photos] : [],
  }));
  let { photoChars } = partnersPhotoStats(partners);
  if (photoChars <= maxChars) {
    return { partners: list, compacted: false, droppedPhotos: 0, photoChars };
  }

  let compacted = false;
  let droppedPhotos = 0;

  // Pass 1–2: recompress data-URL photos (keep remote/http URLs untouched).
  for (const [side, quality] of [
    [720, 0.72],
    [512, 0.55],
  ] as const) {
    partners = await mapPartnerPhotos(partners, (src) =>
      shrinkDataUrlPhoto(src, side, quality),
    );
    compacted = true;
    photoChars = partnersPhotoStats(partners).photoChars;
    if (photoChars <= maxChars) {
      return { partners, compacted, droppedPhotos, photoChars };
    }
  }

  // Pass 3: drop non-main photos from heaviest Muses first.
  while (photoChars > maxChars) {
    let bestIdx = -1;
    let bestExtra = -1;
    for (let i = 0; i < partners.length; i++) {
      const p = partners[i]!;
      if (p.photos.length <= 1) continue;
      const main = Math.min(
        Math.max(0, p.mainPhotoIndex ?? 0),
        p.photos.length - 1,
      );
      let extraChars = 0;
      for (let j = 0; j < p.photos.length; j++) {
        if (j === main) continue;
        extraChars += p.photos[j]?.length || 0;
      }
      if (extraChars > bestExtra) {
        bestExtra = extraChars;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    const p = partners[bestIdx]!;
    const main = Math.min(
      Math.max(0, p.mainPhotoIndex ?? 0),
      p.photos.length - 1,
    );
    // Drop the largest non-main photo.
    let dropAt = -1;
    let dropLen = -1;
    for (let j = 0; j < p.photos.length; j++) {
      if (j === main) continue;
      const len = p.photos[j]?.length || 0;
      if (len > dropLen) {
        dropLen = len;
        dropAt = j;
      }
    }
    if (dropAt < 0) break;
    const photos = p.photos.filter((_, j) => j !== dropAt);
    const mainPhotoIndex =
      dropAt < main ? Math.max(0, main - 1) : Math.min(main, photos.length - 1);
    partners[bestIdx] = {
      ...p,
      photos,
      mainPhotoIndex: photos.length ? mainPhotoIndex : 0,
    };
    droppedPhotos += 1;
    compacted = true;
    photoChars = partnersPhotoStats(partners).photoChars;
  }

  // Last resort: shrink remaining mains harder.
  if (photoChars > maxChars) {
    partners = await mapPartnerPhotos(partners, (src) =>
      shrinkDataUrlPhoto(src, 384, 0.45),
    );
    compacted = true;
    photoChars = partnersPhotoStats(partners).photoChars;
  }

  return { partners, compacted, droppedPhotos, photoChars };
}

export function savePartners(list: PartnerRecord[]) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(list);
  try {
    localStorage.setItem(STORAGE.partners, payload);
    return;
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22);
    if (!quota) throw err;
  }
  // Sync fallback: drop non-main extras until it fits (no async canvas here).
  const copy = list.map((p) => ({
    ...p,
    photos: Array.isArray(p.photos) ? [...p.photos] : [],
  }));
  while (copy.some((p) => p.photos.length > 1)) {
    let best = -1;
    let bestLen = -1;
    for (let i = 0; i < copy.length; i++) {
      const p = copy[i]!;
      if (p.photos.length <= 1) continue;
      const total = p.photos.reduce((n, s) => n + (s?.length || 0), 0);
      if (total > bestLen) {
        bestLen = total;
        best = i;
      }
    }
    if (best < 0) break;
    const p = copy[best]!;
    const main = Math.min(
      Math.max(0, p.mainPhotoIndex ?? 0),
      p.photos.length - 1,
    );
    let dropAt = -1;
    let dropLen = -1;
    for (let j = 0; j < p.photos.length; j++) {
      if (j === main) continue;
      const len = p.photos[j]?.length || 0;
      if (len > dropLen) {
        dropLen = len;
        dropAt = j;
      }
    }
    if (dropAt < 0) break;
    const photos = p.photos.filter((_, j) => j !== dropAt);
    copy[best] = {
      ...p,
      photos,
      mainPhotoIndex: photos.length
        ? dropAt < main
          ? Math.max(0, main - 1)
          : Math.min(main, photos.length - 1)
        : 0,
    };
    try {
      localStorage.setItem(STORAGE.partners, JSON.stringify(copy));
      return;
    } catch {
      // keep trimming
    }
  }
  // Keep main photo only.
  const mains = copy.map((p) => {
    if (!p.photos.length) return p;
    const main = Math.min(
      Math.max(0, p.mainPhotoIndex ?? 0),
      p.photos.length - 1,
    );
    return { ...p, photos: [p.photos[main]!], mainPhotoIndex: 0 };
  });
  try {
    localStorage.setItem(STORAGE.partners, JSON.stringify(mains));
  } catch {
    throw new Error(
      "Browser storage is full — remove some Muse photos and try again.",
    );
  }
}

export function loadScenes(): SavedScene[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE.scenes);
    const parsed = raw ? (JSON.parse(raw) as SavedScene[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScenes(list: SavedScene[]) {
  localStorage.setItem(STORAGE.scenes, JSON.stringify(list.slice(0, 40)));
}

export function loadChats(): Record<string, ChatMessage[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE.chats);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveChats(map: Record<string, ChatMessage[]>) {
  localStorage.setItem(STORAGE.chats, JSON.stringify(map));
}

/**
 * Soft photo caps for local MVP. Production will gate these by account tier
 * (free / plus / private vault) — do not hard-code product limits in UI copy.
 */
export const PARTNER_PHOTO_LIMITS = {
  /** Per-partner photo file size until accounts exist */
  perPartner: 12,
  /** Keep new uploads lean so multi-Muse ledgers fit cloud + localStorage. */
  maxSidePx: 720,
  jpegQuality: 0.72,
} as const;

/** Compress image file to a data URL for local partner photo files. */
export async function fileToPartnerPhoto(
  file: File,
  maxSide = PARTNER_PHOTO_LIMITS.maxSidePx,
): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Choose an image file (JPEG, PNG, or WebP)");
  }
  // Soft client cap (~12MB) before decode — keeps canvas path responsive.
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Photo is too large — use an image under 12MB");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load photo"));
      el.src = url;
    });
    const scale = Math.min(
      1,
      maxSide / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(
      "image/jpeg",
      PARTNER_PHOTO_LIMITS.jpegQuality,
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
