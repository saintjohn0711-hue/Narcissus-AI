/**
 * Durable Muse chat memories + “try new things” / mode-shift gating.
 * Memories live on PartnerRecord (localStorage + Neon partners sync).
 */

export type MuseMemoryKind =
  | "fact"
  | "relationship"
  | "kink"
  | "place"
  | "nickname"
  | "scene"
  | "preference"
  | "mode";

export type MuseMemory = {
  id: string;
  text: string;
  kind: MuseMemoryKind;
  /** ISO timestamp */
  at: string;
  source: "auto" | "explicit";
  /**
   * When set, this memory is for dual-cast with that Muse id.
   * Solo chat skips pair-only memories; dual cast includes matching ones.
   */
  pairWith?: number | null;
};

export const MEMORY_KINDS: MuseMemoryKind[] = [
  "fact",
  "relationship",
  "kink",
  "place",
  "nickname",
  "scene",
  "preference",
  "mode",
];

export const MEMORY_KIND_LABEL: Record<MuseMemoryKind, string> = {
  fact: "Fact",
  relationship: "Relationship",
  kink: "Kink",
  place: "Place",
  nickname: "Nickname",
  scene: "Scene",
  preference: "Preference",
  mode: "Mode",
};

/**
 * Acceptance example (Carrie): relationship + preference memories that must
 * survive chat reset and re-enter the system brief.
 */
export const CARRIE_JOEY_EXAMPLE_MEMORIES: Array<{
  text: string;
  kind: MuseMemoryKind;
}> = [
  {
    text: "Joey is her boyfriend",
    kind: "relationship",
  },
  {
    text: "Wants Joey to do and be bisexual / bi play",
    kind: "preference",
  },
];

const MAX_MEMORIES_PER_MUSE = 40;
const MAX_MEMORY_TEXT = 220;

export function normalizeMemoryKind(raw: unknown): MuseMemoryKind {
  const s = String(raw || "").toLowerCase().trim();
  if (MEMORY_KINDS.includes(s as MuseMemoryKind)) return s as MuseMemoryKind;
  return "fact";
}

export function normalizeMemories(list: unknown): MuseMemory[] {
  if (!Array.isArray(list)) return [];
  const out: MuseMemory[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Partial<MuseMemory>;
    const text = String(m.text || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAX_MEMORY_TEXT);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const pairRaw = m.pairWith as unknown;
    const pairWith =
      pairRaw == null || pairRaw === ""
        ? null
        : Number.isFinite(Number(pairRaw))
          ? Number(pairRaw)
          : null;
    out.push({
      id:
        typeof m.id === "string" && m.id.trim()
          ? m.id.trim()
          : `mem_${Date.now()}_${out.length}`,
      text,
      kind: normalizeMemoryKind(m.kind),
      at:
        typeof m.at === "string" && m.at.trim()
          ? m.at
          : new Date().toISOString(),
      source: m.source === "explicit" ? "explicit" : "auto",
      pairWith,
    });
    if (out.length >= MAX_MEMORIES_PER_MUSE) break;
  }
  return out;
}

/** Merge new memories onto existing (dedupe by lowercased text). Newest first. */
export function mergeMemories(
  existing: MuseMemory[],
  incoming: MuseMemory[],
): MuseMemory[] {
  const map = new Map<string, MuseMemory>();
  for (const m of [...incoming, ...existing]) {
    const key = m.text.trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) map.set(key, m);
  }
  return Array.from(map.values())
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, MAX_MEMORIES_PER_MUSE);
}

export function memoriesForPrompt(
  memories: MuseMemory[],
  opts?: { pairWith?: number | null },
): MuseMemory[] {
  const pair = opts?.pairWith != null ? Number(opts.pairWith) : null;
  return normalizeMemories(memories).filter((m) => {
    if (m.pairWith == null) return true;
    if (pair == null) return false;
    return Number(m.pairWith) === pair;
  });
}

export function formatMemoriesForPrompt(memories: MuseMemory[]): string {
  if (!memories.length) return "";
  return memories
    .slice(0, 24)
    .map((m) => `- [${m.kind}] ${m.text}`)
    .join("\n");
}

/** Explicit “remember …” / “don’t forget …” from the user turn. */
export function extractExplicitRemember(userText: string): string | null {
  const t = userText.trim();
  if (!t) return null;
  const patterns = [
    /(?:^|\b)(?:please\s+)?remember(?:\s+that)?\s*[:\-]?\s+(.+)$/i,
    /(?:^|\b)don'?t\s+forget(?:\s+that)?\s*[:\-]?\s+(.+)$/i,
    /(?:^|\b)save\s+(?:this|that)\s*(?:memory)?\s*[:\-]?\s+(.+)$/i,
    /(?:^|\b)note\s+to\s+self\s*[:\-]?\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]?.trim()) {
      return m[1].trim().replace(/[.!]+$/, "").slice(0, MAX_MEMORY_TEXT);
    }
  }
  return null;
}

/**
 * Detect in-chat grant / revoke of “try new things” / mode permission.
 * Returns null when the turn does not clearly grant or revoke.
 */
export function detectTryNewThingsConsent(
  userText: string,
): boolean | null {
  const t = userText.toLowerCase();
  if (
    /\b(you can try new things|try something new|surprise me|switch (?:the )?mode|change (?:the )?mode|go (?:more )?dominant|go (?:more )?soft|explore (?:a )?new kink|take (?:the )?lead differently|you have permission to (?:try|explore|switch))\b/.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /\b(stay in (?:this|the) (?:vibe|mode)|don'?t try new things|no new (?:things|kinks|modes)|keep (?:it|the) (?:same|established)|don'?t switch modes|stick to what we know)\b/.test(
      t,
    )
  ) {
    return false;
  }
  return null;
}

/** Heuristic auto-extract when xAI memory extract is unavailable. */
export function heuristicExtractMemories(
  userText: string,
  museReply: string,
  opts?: { pairWith?: number | null },
): MuseMemory[] {
  const now = new Date().toISOString();
  const pairWith = opts?.pairWith ?? null;
  const out: MuseMemory[] = [];
  const push = (text: string, kind: MuseMemoryKind, source: "auto" | "explicit") => {
    const cleaned = text.trim().replace(/\s+/g, " ").slice(0, MAX_MEMORY_TEXT);
    if (!cleaned || cleaned.length < 8) return;
    out.push({
      id: `mem_${Date.now()}_${out.length}`,
      text: cleaned,
      kind,
      at: now,
      source,
      pairWith,
    });
  };

  const explicit = extractExplicitRemember(userText);
  if (explicit) push(explicit, "fact", "explicit");

  const nick = userText.match(
    /\b(?:call me|my (?:name|nickname) is|i(?:'| a)?m called)\s+["']?([A-Za-z][\w\s'-]{1,24})/i,
  );
  if (nick?.[1]) push(`Nickname / name: ${nick[1].trim()}`, "nickname", "auto");

  // Relationship: "Joey is my boyfriend", "Joey is her boyfriend", etc.
  const relationship = userText.match(
    /\b([A-Za-z][\w'-]{1,24})\s+is\s+(my|her|his|their)\s+(boyfriend|girlfriend|husband|wife|partner|fiancé|fiance|fiancé(?:e)?|dom|sub|owner)\b/i,
  );
  if (relationship?.[1] && relationship?.[2] && relationship?.[3]) {
    push(
      `${relationship[1]} is ${relationship[2].toLowerCase()} ${relationship[3].toLowerCase()}`,
      "relationship",
      "auto",
    );
  }
  const relationshipAlt = userText.match(
    /\b(?:i(?:'| a)?m|he(?:'| i)?s|she(?:'| i)?s)\s+(?:dating|with)\s+([A-Za-z][\w'-]{1,24})\b/i,
  );
  if (relationshipAlt?.[1] && !relationship) {
    push(`In a relationship with ${relationshipAlt[1]}`, "relationship", "auto");
  }

  // Orientation / bi play preference for a named partner (Carrie→Joey example).
  const biPref = userText.match(
    /\b(?:want(?:s)?|make|get)\s+([A-Za-z][\w'-]{1,24})\s+(?:to\s+)?(?:do\s+and\s+be\s+|be\s+|play\s+)?(bisexual|bi)\b/i,
  );
  if (biPref?.[1]) {
    push(
      `Wants ${biPref[1]} to do and be bisexual / bi play`,
      "preference",
      "auto",
    );
  }

  const place = userText.match(
    /\b(?:at|in) (?:the |our )?(hotel|motel|bedroom|car|shower|cabin|office|rooftop|balcony|pool|beach|tent|yacht)\b/i,
  );
  if (place?.[1]) push(`Place that mattered: ${place[1].toLowerCase()}`, "place", "auto");

  const pref = userText.match(
    /\b(?:i (?:love|like|want|prefer|hate|can'?t stand)|my soft limit|my hard limit)\b[^.!?\n]{4,80}/i,
  );
  if (pref?.[0] && !biPref) push(pref[0].trim(), "preference", "auto");

  const kinkTried =
    /\b(we (?:tried|did)|first time|finally)\b[^.!?\n]{4,80}/i.exec(userText) ||
    /\b(we (?:tried|did)|first time)\b[^.!?\n]{4,80}/i.exec(museReply);
  if (kinkTried?.[0]) push(kinkTried[0].trim(), "kink", "auto");

  return normalizeMemories(out);
}

export function tryNewThingsPromptBlock(enabled: boolean): string {
  if (enabled) {
    return [
      "Try new things / mode shifts: GRANTED.",
      "You may introduce new acts, tones, or modes (e.g. soft → dominant, new kink exploration) when it fits — still respect hard limits and stop immediately if they pull back.",
      "Name the shift lightly in character (“want to try something different?”) rather than dumping a menu.",
    ].join("\n");
  }
  return [
    "Try new things / mode shifts: NOT granted.",
    "Stay in the established vibe, dynamics, and acts already known. Do not spring new modes or unfamiliar kinks unless they clearly ask.",
  ].join("\n");
}

export function memoriesPromptBlock(formatted: string): string {
  if (!formatted.trim()) {
    return "Memories: (none saved yet — build them naturally as you learn this person.)";
  }
  return [
    "Durable memories (bring these back up naturally for realism — do not dump as a list):",
    formatted,
  ].join("\n");
}
