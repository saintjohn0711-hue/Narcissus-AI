/**
 * Dream Muse — parse a free-text description into existing Muse form fields.
 * Prefer xAI when available; always keep a solid local keyword heuristic.
 */

import {
  ALL_KINKS,
  DONE_ACTS,
  DYN_TAGS,
  PERSON_GENDERS,
  normalizeKinks,
  type KinkEntry,
  type KinkRole,
  type KinkStatus,
  type PartnerRecord,
  type PersonGender,
  type PersonType,
} from "@/lib/artOfX";

export type DreamMuseFill = {
  name?: string;
  type?: PersonType;
  gender?: PersonGender;
  looks?: string;
  notes?: string;
  history?: string;
  dynamics?: string;
  dynTags?: string[];
  kinks?: KinkEntry[];
  doneActs?: string[];
  locations?: string;
  partnerA?: string;
  partnerB?: string;
  isCouple?: boolean;
};

export type DreamMuseParseResult = {
  fill: DreamMuseFill;
  source: "xai" | "local";
  note: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+/&\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Loose token match — tag words appear in text (order-insensitive for multi-word). */
function textMentions(hay: string, tag: string): boolean {
  const t = norm(tag);
  if (!t) return false;
  if (hay.includes(t)) return true;
  // Alias glue: "dom / sub" → try "dom"+"sub", "femdom", etc.
  const parts = t.split(/[\s/]+/).filter((p) => p.length > 2);
  if (parts.length >= 2 && parts.every((p) => hay.includes(p))) return true;
  return false;
}

const GENDER_HINTS: Array<{ re: RegExp; gender: PersonGender }> = [
  { re: /\b(cross\s*dress(?:er|ing)?|cd)\b/i, gender: "crossdresser" },
  { re: /\b(trans(?:gender| woman| man| girl| guy)?|mtf|ftm)\b/i, gender: "trans" },
  { re: /\b(couple|throuple|pair of|both of them)\b/i, gender: "couple" },
  {
    re: /\b(woman|girl|lady|female|she\/her|fem(?:me)?)\b/i,
    gender: "woman",
  },
  { re: /\b(man|guy|male|he\/him|himbo)\b/i, gender: "man" },
];

const TYPE_HINTS: Array<{ re: RegExp; type: PersonType }> = [
  { re: /\b(dream|fantasy|imaginary|ideal)\b/i, type: "Dream" },
  { re: /\b(wanted|wishlist|crush|desire|seeking)\b/i, type: "Wanted" },
  { re: /\b(real|ex|current|actual|irl)\b/i, type: "Real" },
];

const ROLE_HINTS: Array<{ re: RegExp; role: KinkRole }> = [
  { re: /\b(watch(?:er|ing)?|voyeur)\b/i, role: "Watch" },
  { re: /\b(receive|receiving|bottom|submissive|take[ns]?)\b/i, role: "Receive" },
  { re: /\b(give|giving|top|dominant|do(?:es|ing) (?:it )?to)\b/i, role: "Give" },
  { re: /\b(both|switch|versatile|vers)\b/i, role: "Both" },
];

function inferStatus(text: string, tag: string): KinkStatus {
  const window = vicinity(text, tag, 48);
  if (/\b(hard\s*limit|never|no way|deal.?breaker)\b/i.test(window)) {
    return "Hard limit";
  }
  if (/\b(soft\s*limit|maybe not|hesitant|careful)\b/i.test(window)) {
    return "Soft limit";
  }
  if (/\b(favorit|obsess|love[sd]?|crave|need)\b/i.test(window)) {
    return "Favorite";
  }
  if (/\b(curious|intrigued|want to try|open to)\b/i.test(window)) {
    return "Curious";
  }
  return "Like";
}

function inferIntensity(text: string, tag: string): number {
  const window = vicinity(text, tag, 56);
  const m = window.match(/\b([1-9]|10)\s*\/\s*10\b/);
  if (m) return Number(m[1]);
  if (/\b(obsess|extreme|intense|hard|fierce|filthy)\b/i.test(window)) return 9;
  if (/\b(favorit|love|crave|strong)\b/i.test(window)) return 8;
  if (/\b(curious|soft|gentle|light)\b/i.test(window)) return 4;
  return 6;
}

function inferRole(text: string, tag: string): KinkRole {
  const window = vicinity(text, tag, 56);
  for (const h of ROLE_HINTS) {
    if (h.re.test(window)) return h.role;
  }
  return "Both";
}

function vicinity(text: string, tag: string, radius: number): string {
  const hay = norm(text);
  const needle = norm(tag);
  const idx = hay.indexOf(needle);
  if (idx < 0) return hay;
  const start = Math.max(0, idx - radius);
  const end = Math.min(hay.length, idx + needle.length + radius);
  return hay.slice(start, end);
}

const LOOKS_CUES =
  /\b(hair|eyes?|lips?|body|curves?|tall|short|petite|curvy|slim|athletic|breasts?|hips?|skin|tattoo|piercing|blonde|brunette|redhead|brunette|black hair|asian|latina|pale|olive|soft|fierce|anime|gorgeous|beautiful|sexy)\b/i;

/** Keyword / phrase aliases → catalog kink tags. */
const KINK_ALIASES: Array<{ re: RegExp; tag: string }> = [
  { re: /\bbj\b|\bblow\s*jobs?\b/i, tag: "Blowjob" },
  { re: /\bcnn?\b|\bcum\s*in\s*mouth\b/i, tag: "Cum play" },
  { re: /\bfree\s*use\b/i, tag: "Free-use" },
  { re: /\bfem\s*dom\b|\bmistress\b/i, tag: "Femdom" },
  { re: /\bd\/?s\b|\bdom(?:me)?\s*\/?\s*sub\b|\bbdsm\b/i, tag: "Dom / Sub" },
  { re: /\bhot\s*wife\b/i, tag: "Hotwife" },
  { re: /\bcuck(?:old(?:ing)?)?\b/i, tag: "Cuckold" },
  { re: /\bdp\b|\bdouble\s*pen/i, tag: "Double penetration" },
  { re: /\bpublic\s*(?:sex|play|risk)?\b/i, tag: "Public" },
  { re: /\bgroup\s*(?:sex|play)?\b|\borgy\b/i, tag: "Group" },
  { re: /\b3\s*some\b|\bthreesomes?\b/i, tag: "Threesome" },
  { re: /\bstrap\s*-?\s*ons?\b|\bpegging\b/i, tag: "Pegging" },
  { re: /\bbondage\b|\brope\b|\bcuffs?\b/i, tag: "Bondage" },
  { re: /\bspanking\b|\bpaddle\b/i, tag: "Spanking" },
  { re: /\bedging\b|\bdenied?\b/i, tag: "Edging" },
  { re: /\bdegrad(?:e|ation|ing)\b/i, tag: "Degradation" },
  { re: /\bpraise\b/i, tag: "Praise" },
  { re: /\bbreeding\b|\bcreampies?\b/i, tag: "Breeding" },
  { re: /\banal\b/i, tag: "Anal" },
  { re: /\bvaginal\b|\bpussy\b/i, tag: "Vaginal" },
  { re: /\boral\b/i, tag: "Oral" },
  { re: /\bfacials?\b/i, tag: "Facial" },
  { re: /\btoys?\b|\bdildo\b|\bvibrator\b/i, tag: "Toys" },
  { re: /\bplug\b/i, tag: "Plug" },
  { re: /\bcage\b|\bchastity\b/i, tag: "Cage" },
  { re: /\bvoyeur/i, tag: "Voyeur" },
  { re: /\bcross\s*dress/i, tag: "Crossdressing" },
  { re: /\brole\s*-?\s*play\b/i, tag: "Roleplay" },
  { re: /\bdirty\s*talk\b/i, tag: "Dirty talk" },
  { re: /\bpiss\b|\bwatersports?\b/i, tag: "Piss play" },
  { re: /\bownership\b|\bowned\b|\bowns\s+me\b/i, tag: "Ownership" },
  { re: /\bdirected\b|\bdirects?\s+me\b/i, tag: "Directed" },
];

const DYN_ALIASES: Array<{ re: RegExp; tag: string }> = [
  { re: /\blong[\s-]?term\b/i, tag: "Long-term" },
  { re: /\bfwb\b|\bfriends?\s+with\s+benefits\b/i, tag: "Friends with benefits" },
  { re: /\bfree[\s-]?use\b/i, tag: "Free-use" },
  { re: /\bhotwife|cuck/i, tag: "Hotwife/Cuck" },
  { re: /\bdominan/i, tag: "Dominant" },
  { re: /\bsubmiss/i, tag: "Submissive" },
  { re: /\bcontroll/i, tag: "Controlling" },
  { re: /\bowns?\s+me\b|\bownership\b/i, tag: "Owns me" },
  { re: /\bcasual\b/i, tag: "Casual" },
  { re: /\brough\b/i, tag: "Rough" },
  { re: /\bgentle\b|\bsoft\b/i, tag: "Gentle" },
  { re: /\bsecret\b|\bhush/i, tag: "Secret" },
  { re: /\bpublic\s*risk\b/i, tag: "Public risk" },
  { re: /\bemotional\b/i, tag: "Emotional" },
  { re: /\bongoing\b/i, tag: "Ongoing" },
  { re: /\bex\b/i, tag: "Ex" },
  { re: /\bfirst\b/i, tag: "First" },
];

/**
 * Local heuristic: map free text onto catalog chips + prose fields.
 * Conservative on acts (only clear past-tense / “we’ve done” cues).
 */
export function parseDreamMuseLocal(description: string): DreamMuseParseResult {
  const raw = description.trim();
  const hay = norm(raw);
  const fill: DreamMuseFill = {};

  if (!raw) {
    return {
      fill: {},
      source: "local",
      note: "Add a short description of your dream Muse first.",
    };
  }

  // Type
  for (const h of TYPE_HINTS) {
    if (h.re.test(raw)) {
      fill.type = h.type;
      break;
    }
  }
  if (!fill.type) fill.type = "Dream";

  // Gender
  for (const h of GENDER_HINTS) {
    if (h.re.test(raw)) {
      fill.gender = h.gender;
      if (h.gender === "couple") fill.isCouple = true;
      break;
    }
  }

  // Name — “named X”, “called X”, leading Propercase token before “who/with”
  const nameMatch =
    raw.match(
      /\b(?:named|called|name(?:'s| is)?)\s+([A-Z][a-zA-Z'’-]{1,24})\b/,
    ) ||
    raw.match(/^([A-Z][a-zA-Z'’-]{1,24})\b(?:\s*[,:—-]|\s+(?:is|who|with))/);
  if (nameMatch?.[1]) fill.name = nameMatch[1];

  // Kinks from catalog + aliases
  const kinkTags = new Set<string>();
  for (const tag of ALL_KINKS) {
    if (textMentions(hay, tag)) kinkTags.add(tag);
  }
  for (const a of KINK_ALIASES) {
    if (a.re.test(raw) && ALL_KINKS.includes(a.tag)) kinkTags.add(a.tag);
  }
  fill.kinks = [...kinkTags].map((tag) => ({
    tag,
    role: inferRole(raw, tag),
    status: inferStatus(raw, tag),
    intensity: inferIntensity(raw, tag),
  }));

  // Dynamics tags
  const dyn = new Set<string>();
  for (const tag of DYN_TAGS) {
    if (textMentions(hay, tag)) dyn.add(tag);
  }
  for (const a of DYN_ALIASES) {
    if (a.re.test(raw) && (DYN_TAGS as readonly string[]).includes(a.tag)) {
      dyn.add(a.tag);
    }
  }
  if (dyn.size) fill.dynTags = [...dyn];

  // Acts — only when past-tense / history framing is present
  const actCue =
    /\b(we('ve| have)?\s+(done|had|tried)|already\s+done|logged|history|together\s+we|she\s+(?:gave|took|did)|he\s+(?:gave|took|did))\b/i.test(
      raw,
    );
  if (actCue) {
    const acts = DONE_ACTS.filter((tag) => textMentions(hay, tag));
    if (acts.length) fill.doneActs = acts;
  }

  // Looks vs notes vs history vs dynamics prose
  if (LOOKS_CUES.test(raw) || raw.length < 280) {
    fill.looks = raw.length > 420 ? `${raw.slice(0, 417).trim()}…` : raw;
  } else {
    fill.notes = raw.length > 500 ? `${raw.slice(0, 497).trim()}…` : raw;
  }

  // Dynamics summary from power words
  if (fill.dynTags?.length) {
    fill.dynamics = fill.dynTags.slice(0, 4).join(" · ");
  }

  // Locations free text
  const locBits = [
    /\bhotel\b/i.test(raw) && "hotel",
    /\bcar\b/i.test(raw) && "car",
    /\bbedroom\b|\bhome\b/i.test(raw) && "home / bedroom",
    /\bpublic\b/i.test(raw) && "public risk",
    /\bclub\b|\bparty\b/i.test(raw) && "party / club",
  ].filter(Boolean) as string[];
  if (locBits.length) fill.locations = locBits.join(", ");

  const picked =
    (fill.kinks?.length || 0) +
    (fill.dynTags?.length || 0) +
    (fill.doneActs?.length || 0);
  return {
    fill,
    source: "local",
    note:
      picked > 0
        ? `Filled ${picked} chip${picked === 1 ? "" : "s"} from keywords — tweak anything before saving.`
        : "Drafted looks/notes from your description — pick chips manually if nothing matched.",
  };
}

/** Merge a Dream fill onto an existing editor draft (user can still tweak). */
export function applyDreamMuseFill(
  draft: PartnerRecord,
  fill: DreamMuseFill,
  opts?: { replaceChips?: boolean },
): PartnerRecord {
  const replace = Boolean(opts?.replaceChips);
  const nextKinks = normalizeKinks(fill.kinks);
  const mergedKinks = replace
    ? nextKinks
    : mergeKinks(normalizeKinks(draft.kinks), nextKinks);
  const mergedDyn = replace
    ? fill.dynTags || draft.dynTags
    : uniqueStrings([...(draft.dynTags || []), ...(fill.dynTags || [])]);
  const mergedActs = replace
    ? fill.doneActs || draft.doneActs
    : uniqueStrings([...(draft.doneActs || []), ...(fill.doneActs || [])]);

  return {
    ...draft,
    name: fill.name?.trim() || draft.name,
    type: fill.type || draft.type,
    gender: fill.gender || draft.gender,
    isCouple:
      typeof fill.isCouple === "boolean"
        ? fill.isCouple
        : fill.gender === "couple"
          ? true
          : draft.isCouple,
    partnerA: fill.partnerA ?? draft.partnerA,
    partnerB: fill.partnerB ?? draft.partnerB,
    looks: fill.looks?.trim() ? fill.looks.trim() : draft.looks,
    notes: fill.notes?.trim() ? fill.notes.trim() : draft.notes,
    history: fill.history?.trim() ? fill.history.trim() : draft.history,
    dynamics: fill.dynamics?.trim() ? fill.dynamics.trim() : draft.dynamics,
    locations: fill.locations?.trim() ? fill.locations.trim() : draft.locations,
    dynTags: mergedDyn,
    doneActs: mergedActs,
    kinks: mergedKinks,
    updatedAt: new Date().toISOString(),
  };
}

function uniqueStrings(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const key = s.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function mergeKinks(base: KinkEntry[], extra: KinkEntry[]): KinkEntry[] {
  const map = new Map<string, KinkEntry>();
  for (const k of base) map.set(k.tag, k);
  for (const k of extra) {
    const prev = map.get(k.tag);
    map.set(k.tag, prev ? { ...prev, ...k, tag: k.tag } : k);
  }
  return [...map.values()];
}

/** Validate LLM JSON against known catalogs — drop unknown tags. */
export function sanitizeDreamMuseFill(raw: unknown): DreamMuseFill {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const fill: DreamMuseFill = {};

  if (typeof o.name === "string" && o.name.trim()) fill.name = o.name.trim().slice(0, 80);
  if (o.type === "Real" || o.type === "Dream" || o.type === "Wanted") {
    fill.type = o.type;
  }
  if (
    typeof o.gender === "string" &&
    PERSON_GENDERS.includes(o.gender as PersonGender)
  ) {
    fill.gender = o.gender as PersonGender;
  }
  if (typeof o.isCouple === "boolean") fill.isCouple = o.isCouple;
  for (const key of [
    "looks",
    "notes",
    "history",
    "dynamics",
    "locations",
    "partnerA",
    "partnerB",
  ] as const) {
    if (typeof o[key] === "string" && (o[key] as string).trim()) {
      fill[key] = (o[key] as string).trim().slice(0, 2000);
    }
  }

  if (Array.isArray(o.dynTags)) {
    fill.dynTags = uniqueStrings(
      o.dynTags.filter(
        (t): t is string =>
          typeof t === "string" &&
          (DYN_TAGS as readonly string[]).includes(t),
      ),
    );
  }
  if (Array.isArray(o.doneActs)) {
    fill.doneActs = uniqueStrings(
      o.doneActs.filter(
        (t): t is string => typeof t === "string" && DONE_ACTS.includes(t),
      ),
    );
  }
  if (Array.isArray(o.kinks)) {
    const entries: KinkEntry[] = [];
    for (const item of o.kinks) {
      if (!item || typeof item !== "object") continue;
      const k = item as Record<string, unknown>;
      const tag = typeof k.tag === "string" ? k.tag : "";
      if (!ALL_KINKS.includes(tag)) continue;
      const role =
        k.role === "Both" ||
        k.role === "Receive" ||
        k.role === "Give" ||
        k.role === "Watch"
          ? (k.role as KinkRole)
          : "Both";
      const status =
        k.status === "Like" ||
        k.status === "Favorite" ||
        k.status === "Curious" ||
        k.status === "Soft limit" ||
        k.status === "Hard limit"
          ? (k.status as KinkStatus)
          : "Like";
      const intensity =
        typeof k.intensity === "number" && k.intensity >= 1 && k.intensity <= 10
          ? Math.round(k.intensity)
          : 6;
      entries.push({ tag, role, status, intensity });
    }
    fill.kinks = normalizeKinks(entries);
  }

  return fill;
}

export function dreamMuseCatalogPromptBlock(): string {
  return [
    `Allowed type values: Real | Dream | Wanted`,
    `Allowed gender values: ${PERSON_GENDERS.join(" | ")}`,
    `Allowed dynTags (subset only): ${DYN_TAGS.join(", ")}`,
    `Allowed kink tags (subset only): ${ALL_KINKS.join(", ")}`,
    `Allowed doneActs (subset only): ${DONE_ACTS.join(", ")}`,
    `Each kink object: { "tag": string, "role": "Both"|"Receive"|"Give"|"Watch", "status": "Like"|"Favorite"|"Curious"|"Soft limit"|"Hard limit", "intensity": 1-10 }`,
  ].join("\n");
}
