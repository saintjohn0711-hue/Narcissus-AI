/**
 * Light sex-ribbons game layer for Muse companion chat.
 * Tasks award named collectible ribbons; persist on PartnerRecord.
 */

export type SexRibbonId =
  | "silk-memory"
  | "open-door"
  | "twin-flame"
  | "heat-crest"
  | "first-confession"
  | "afterglow";

export type SexRibbonTier = 1 | 2 | 3;

export type SexRibbonAward = {
  id: string;
  ribbonId: SexRibbonId;
  /** ISO timestamp */
  at: string;
  source: "claim" | "auto";
  note?: string;
};

export type SexRibbonDef = {
  id: SexRibbonId;
  name: string;
  tier: SexRibbonTier;
  /** Short collectible label */
  blurb: string;
  /** Challenge shown in chat */
  task: string;
};

export const SEX_RIBBON_CATALOG: SexRibbonDef[] = [
  {
    id: "silk-memory",
    name: "Silk Memory",
    tier: 1,
    blurb: "Saved something lasting with a Muse.",
    task: "Add a durable memory (Memories panel or “remember …” in chat).",
  },
  {
    id: "open-door",
    name: "Open Door",
    tier: 1,
    blurb: "Gave permission to try something new.",
    task: "Turn on Try new things for this Muse.",
  },
  {
    id: "twin-flame",
    name: "Twin Flame",
    tier: 2,
    blurb: "Played a dual-cast scene.",
    task: "Cast a second Muse you’ve been with and exchange a turn.",
  },
  {
    id: "heat-crest",
    name: "Heat Crest",
    tier: 2,
    blurb: "Hit an intensity beat in chat.",
    task: "Reach a hot beat — desire, climax, edge, or “harder” energy in the thread.",
  },
  {
    id: "first-confession",
    name: "First Confession",
    tier: 2,
    blurb: "Shared a kink or preference memory.",
    task: "Save a kink or preference memory with this Muse.",
  },
  {
    id: "afterglow",
    name: "Afterglow",
    tier: 3,
    blurb: "Stayed in a long intimate exchange.",
    task: "Keep a chat going for at least three full turns (six messages).",
  },
];

const RIBBON_IDS = new Set<SexRibbonId>(
  SEX_RIBBON_CATALOG.map((r) => r.id),
);

const MAX_AWARDS_PER_MUSE = 24;

export function ribbonDef(id: SexRibbonId): SexRibbonDef {
  return (
    SEX_RIBBON_CATALOG.find((r) => r.id === id) || SEX_RIBBON_CATALOG[0]!
  );
}

export function normalizeRibbonId(raw: unknown): SexRibbonId | null {
  const s = String(raw || "").trim();
  return RIBBON_IDS.has(s as SexRibbonId) ? (s as SexRibbonId) : null;
}

export function normalizeSexRibbons(list: unknown): SexRibbonAward[] {
  if (!Array.isArray(list)) return [];
  const out: SexRibbonAward[] = [];
  const seenRibbon = new Set<SexRibbonId>();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Partial<SexRibbonAward>;
    const ribbonId = normalizeRibbonId(a.ribbonId);
    if (!ribbonId || seenRibbon.has(ribbonId)) continue;
    seenRibbon.add(ribbonId);
    out.push({
      id:
        typeof a.id === "string" && a.id.trim()
          ? a.id.trim()
          : `rib_${ribbonId}_${out.length}`,
      ribbonId,
      at:
        typeof a.at === "string" && a.at.trim()
          ? a.at
          : new Date().toISOString(),
      source: a.source === "auto" ? "auto" : "claim",
      note:
        typeof a.note === "string" && a.note.trim()
          ? a.note.trim().slice(0, 120)
          : undefined,
    });
    if (out.length >= MAX_AWARDS_PER_MUSE) break;
  }
  return out;
}

export function hasRibbon(
  awards: SexRibbonAward[] | undefined,
  ribbonId: SexRibbonId,
): boolean {
  return (awards || []).some((a) => a.ribbonId === ribbonId);
}

export function awardRibbon(
  awards: SexRibbonAward[] | undefined,
  ribbonId: SexRibbonId,
  source: "claim" | "auto" = "claim",
  note?: string,
): SexRibbonAward[] {
  const current = normalizeSexRibbons(awards);
  if (hasRibbon(current, ribbonId)) return current;
  return [
    ...current,
    {
      id: `rib_${ribbonId}_${Date.now()}`,
      ribbonId,
      at: new Date().toISOString(),
      source,
      note,
    },
  ];
}

export type RibbonTaskContext = {
  memories?: Array<{ kind?: string; source?: string }>;
  tryNewThings?: boolean;
  dualCast?: boolean;
  messageCount?: number;
  recentText?: string;
};

const INTENSITY_RE =
  /\b(harder|deeper|climax|orgasm|cum(?:ming)?|edge(?:d|ing)?|moan(?:ing)?|throbbing|soak(?:ed|ing)?|beg(?:ging)?|fuck\s+me|want\s+you|so\s+close|don'?t\s+stop)\b/i;

export function isTaskComplete(
  ribbonId: SexRibbonId,
  ctx: RibbonTaskContext,
): boolean {
  const memories = ctx.memories || [];
  const msgs = ctx.messageCount ?? 0;
  const blob = ctx.recentText || "";

  switch (ribbonId) {
    case "silk-memory":
      return memories.length > 0;
    case "open-door":
      return Boolean(ctx.tryNewThings);
    case "twin-flame":
      return Boolean(ctx.dualCast) && msgs >= 2;
    case "heat-crest":
      return INTENSITY_RE.test(blob);
    case "first-confession":
      return memories.some(
        (m) => m.kind === "kink" || m.kind === "preference",
      );
    case "afterglow":
      return msgs >= 6;
    default:
      return false;
  }
}

/** Ribbons newly completable that are not yet awarded. */
export function pendingCompletableRibbons(
  awards: SexRibbonAward[] | undefined,
  ctx: RibbonTaskContext,
): SexRibbonId[] {
  const current = normalizeSexRibbons(awards);
  return SEX_RIBBON_CATALOG.map((r) => r.id).filter(
    (id) => !hasRibbon(current, id) && isTaskComplete(id, ctx),
  );
}

/**
 * Auto-award clear completions after a chat event.
 * Returns updated awards + which ribbons were newly granted.
 */
export function autoAwardFromContext(
  awards: SexRibbonAward[] | undefined,
  ctx: RibbonTaskContext,
): { awards: SexRibbonAward[]; granted: SexRibbonId[] } {
  let next = normalizeSexRibbons(awards);
  const granted: SexRibbonId[] = [];
  for (const id of pendingCompletableRibbons(next, ctx)) {
    // Intensity / long-play stay claim-first so the UI feels intentional;
    // clear structural tasks auto-grant.
    if (
      id === "silk-memory" ||
      id === "open-door" ||
      id === "twin-flame" ||
      id === "first-confession"
    ) {
      next = awardRibbon(next, id, "auto");
      granted.push(id);
    }
  }
  return { awards: next, granted };
}

export type GlobalRibbonCollection = {
  /** Total ribbon awards across every Muse */
  totalCount: number;
  /** Distinct ribbon types collected anywhere */
  uniqueTypes: SexRibbonId[];
  /** Per-Muse counts */
  byMuse: Array<{ partnerId: number; name: string; count: number }>;
};

export function globalRibbonCollection(
  partners: Array<{
    id: number;
    name: string;
    sexRibbons?: SexRibbonAward[];
  }>,
): GlobalRibbonCollection {
  const typeSet = new Set<SexRibbonId>();
  let totalCount = 0;
  const byMuse: GlobalRibbonCollection["byMuse"] = [];

  for (const p of partners) {
    const awards = normalizeSexRibbons(p.sexRibbons);
    if (!awards.length) continue;
    totalCount += awards.length;
    for (const a of awards) typeSet.add(a.ribbonId);
    byMuse.push({
      partnerId: p.id,
      name: p.name || `Muse ${p.id}`,
      count: awards.length,
    });
  }

  byMuse.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    totalCount,
    uniqueTypes: SEX_RIBBON_CATALOG.map((r) => r.id).filter((id) =>
      typeSet.has(id),
    ),
    byMuse,
  };
}

export function tierLabel(tier: SexRibbonTier): string {
  switch (tier) {
    case 1:
      return "Soft";
    case 2:
      return "Heat";
    case 3:
      return "Deep";
    default:
      return "Soft";
  }
}
