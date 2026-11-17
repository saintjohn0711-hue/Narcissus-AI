/**
 * Muse sexual-activity aggregates + overscore for Echo / account.
 * Counts are Muse-based (how many Muses you’ve logged an act with),
 * not event-based — each Muse contributes at most once per act label.
 */

import {
  ACT_GROUPS,
  DONE_ACTS,
  canonicalizeAct,
  genderLabel,
  normalizeDoneActs,
  type PartnerRecord,
  type PersonGender,
  type PersonType,
} from "@/lib/artOfX";
import {
  museMatchesOutlet,
  type OutletId,
} from "@/lib/outlets";

export type ActDirection = "given" | "received" | "shared";

export type ActMeta = {
  tag: string;
  cat: string;
  /** Weight used in overscore (higher = more “complete” encounter). */
  weight: number;
  direction: ActDirection;
  /** Pair stem for given/received twins, e.g. "Blowjob". */
  stem: string | null;
};

export type MuseActFilters = {
  type: PersonType | "All";
  outlet: OutletId | null;
  gender: PersonGender | "All";
};

export type ActStatRow = {
  tag: string;
  cat: string;
  direction: ActDirection;
  stem: string | null;
  /** Muses in the filtered set that have this exact act logged. */
  museCount: number;
  museNames: string[];
};

export type DirectionPairStat = {
  stem: string;
  cat: string;
  given: ActStatRow | null;
  received: ActStatRow | null;
};

export type MuseActScoreboard = {
  filters: MuseActFilters;
  museTotal: number;
  musesWithActs: number;
  actLogs: number;
  distinctActs: number;
  /** Weighted overscore from filtered logs. */
  overscore: number;
  tier: { id: string; label: string; blurb: string };
  /** Flat rows sorted by museCount desc, then catalog order. */
  byAct: ActStatRow[];
  /** Given/received pairs (and orphans) for the directional summary. */
  pairs: DirectionPairStat[];
  /** Shared (non-directional) acts only. */
  shared: ActStatRow[];
  byType: Array<{ type: PersonType; muses: number; actLogs: number }>;
  byOutlet: Array<{
    outlet: OutletId | "other";
    label: string;
    muses: number;
    actLogs: number;
  }>;
};

const CAT_WEIGHT: Record<string, number> = {
  "Kiss / hands": 1,
  Oral: 3,
  Penetration: 4,
  "Power / sensation": 2,
  "Social / place": 3,
  "Play / identity": 2,
};

const TYPE_MULT: Record<PersonType, number> = {
  Real: 3,
  Dream: 2,
  Wanted: 1,
};

const DIRECTION_RE = /^(.*) (given|received)$/i;

function parseDirection(tag: string): {
  direction: ActDirection;
  stem: string | null;
} {
  const m = tag.match(DIRECTION_RE);
  if (m) {
    return {
      direction: m[2]!.toLowerCase() as "given" | "received",
      stem: m[1]!.trim(),
    };
  }
  return { direction: "shared", stem: null };
}

function buildActMeta(): Map<string, ActMeta> {
  const map = new Map<string, ActMeta>();
  for (const g of ACT_GROUPS) {
    const weight = CAT_WEIGHT[g.cat] ?? 2;
    for (const tag of g.tags) {
      const { direction, stem } = parseDirection(tag);
      map.set(tag, { tag, cat: g.cat, weight, direction, stem });
    }
  }
  return map;
}

export const ACT_META = buildActMeta();

export function actMetaFor(tag: string): ActMeta {
  const canon = canonicalizeAct(tag);
  const known = ACT_META.get(canon);
  if (known) return known;
  const { direction, stem } = parseDirection(canon);
  return {
    tag: canon,
    cat: "Other",
    weight: 2,
    direction,
    stem,
  };
}

export const DEFAULT_ACT_FILTERS: MuseActFilters = {
  type: "All",
  outlet: null,
  gender: "All",
};

export function filterMusesForStats(
  partners: PartnerRecord[],
  filters: MuseActFilters = DEFAULT_ACT_FILTERS,
): PartnerRecord[] {
  return partners.filter((p) => {
    if (filters.type !== "All" && p.type !== filters.type) return false;
    if (filters.gender !== "All" && p.gender !== filters.gender) return false;
    if (filters.outlet && !museMatchesOutlet(p.gender, filters.outlet)) {
      return false;
    }
    return true;
  });
}

function catalogIndex(tag: string): number {
  const i = DONE_ACTS.indexOf(tag);
  return i === -1 ? 9999 : i;
}

export function overscoreTier(score: number): {
  id: string;
  label: string;
  blurb: string;
} {
  if (score >= 120) {
    return {
      id: "legend",
      label: "Legend",
      blurb: "A deep, varied ledger across your Muses.",
    };
  }
  if (score >= 70) {
    return {
      id: "seasoned",
      label: "Seasoned",
      blurb: "Broad experience with real weight behind it.",
    };
  }
  if (score >= 35) {
    return {
      id: "active",
      label: "Active",
      blurb: "Solid trail of acts — keep logging to climb.",
    };
  }
  if (score >= 12) {
    return {
      id: "curious",
      label: "Curious",
      blurb: "Started the ledger — a few acts, room to grow.",
    };
  }
  return {
    id: "fresh",
    label: "Fresh",
    blurb: "Log acts on Muses to build your Echo overscore.",
  };
}

/**
 * Overscore = Σ (actWeight × typeMultiplier) for each Muse×act log
 * + 2 × distinct act labels in the filtered set.
 *
 * Real Muses weigh more than Dream/Wanted; penetration/oral weigh more
 * than kiss/hands — so a rich Real ledger outscores thin Dream checklists.
 */
export function computeOverscore(
  partners: PartnerRecord[],
): { overscore: number; actLogs: number; distinctActs: number } {
  let overscore = 0;
  let actLogs = 0;
  const distinct = new Set<string>();
  for (const p of partners) {
    const acts = normalizeDoneActs(p.doneActs);
    const mult = TYPE_MULT[p.type] ?? 1;
    for (const tag of acts) {
      const meta = actMetaFor(tag);
      overscore += meta.weight * mult;
      actLogs += 1;
      distinct.add(meta.tag);
    }
  }
  overscore += distinct.size * 2;
  return {
    overscore: Math.round(overscore),
    actLogs,
    distinctActs: distinct.size,
  };
}

export function buildMuseActScoreboard(
  partners: PartnerRecord[],
  filters: MuseActFilters = DEFAULT_ACT_FILTERS,
): MuseActScoreboard {
  const filtered = filterMusesForStats(partners, filters);
  const { overscore, actLogs, distinctActs } = computeOverscore(filtered);

  const byTag = new Map<string, ActStatRow>();
  for (const p of filtered) {
    const acts = normalizeDoneActs(p.doneActs);
    for (const raw of acts) {
      const meta = actMetaFor(raw);
      const row = byTag.get(meta.tag);
      if (row) {
        row.museCount += 1;
        row.museNames.push(p.name);
      } else {
        byTag.set(meta.tag, {
          tag: meta.tag,
          cat: meta.cat,
          direction: meta.direction,
          stem: meta.stem,
          museCount: 1,
          museNames: [p.name],
        });
      }
    }
  }

  const byAct = [...byTag.values()].sort((a, b) => {
    if (b.museCount !== a.museCount) return b.museCount - a.museCount;
    return catalogIndex(a.tag) - catalogIndex(b.tag);
  });

  const pairMap = new Map<string, DirectionPairStat>();
  const shared: ActStatRow[] = [];
  for (const row of byAct) {
    if (row.stem && (row.direction === "given" || row.direction === "received")) {
      const existing = pairMap.get(row.stem) || {
        stem: row.stem,
        cat: row.cat,
        given: null,
        received: null,
      };
      if (row.direction === "given") existing.given = row;
      else existing.received = row;
      pairMap.set(row.stem, existing);
    } else {
      shared.push(row);
    }
  }

  // Include catalog directional stems even when only one side is logged,
  // and surface empty-but-known stems that appear in catalog with 0? Skip zeros.
  const pairs = [...pairMap.values()].sort((a, b) => {
    const aN = (a.given?.museCount || 0) + (a.received?.museCount || 0);
    const bN = (b.given?.museCount || 0) + (b.received?.museCount || 0);
    if (bN !== aN) return bN - aN;
    return a.stem.localeCompare(b.stem);
  });

  const typeOrder: PersonType[] = ["Real", "Dream", "Wanted"];
  const byType = typeOrder.map((type) => {
    const set = filtered.filter((p) => p.type === type);
    let logs = 0;
    for (const p of set) logs += normalizeDoneActs(p.doneActs).length;
    return { type, muses: set.length, actLogs: logs };
  });

  const outletBuckets: Array<{
    outlet: OutletId | "other";
    label: string;
    genders: PersonGender[];
  }> = [
    { outlet: "women", label: "Women", genders: ["woman"] },
    { outlet: "men", label: "Men", genders: ["man"] },
    { outlet: "trans", label: "Trans", genders: ["trans"] },
    {
      outlet: "other",
      label: "Other",
      genders: ["crossdresser", "couple"],
    },
  ];
  const byOutlet = outletBuckets.map((b) => {
    const set = filtered.filter((p) =>
      b.genders.includes(p.gender as PersonGender),
    );
    let logs = 0;
    for (const p of set) logs += normalizeDoneActs(p.doneActs).length;
    return {
      outlet: b.outlet,
      label: b.label,
      muses: set.length,
      actLogs: logs,
    };
  });

  return {
    filters,
    museTotal: filtered.length,
    musesWithActs: filtered.filter(
      (p) => normalizeDoneActs(p.doneActs).length > 0,
    ).length,
    actLogs,
    distinctActs,
    overscore,
    tier: overscoreTier(overscore),
    byAct,
    pairs,
    shared,
    byType,
    byOutlet,
  };
}

export function filterSummary(filters: MuseActFilters): string {
  const bits: string[] = [];
  bits.push(filters.type === "All" ? "All types" : `${filters.type} Muses`);
  if (filters.outlet) {
    bits.push(
      filters.outlet === "women"
        ? "Women"
        : filters.outlet === "men"
          ? "Men"
          : "Trans",
    );
  } else if (filters.gender !== "All") {
    bits.push(genderLabel(filters.gender));
  } else {
    bits.push("All outlets");
  }
  return bits.join(" · ");
}
