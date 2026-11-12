/**
 * Art of X / ArkOfX — craft rules + data model ported from
 * /cursor/stores/self/docs/arkofx-demo.html (adults only).
 */

export type PersonType = "Real" | "Dream" | "Wanted";
export type PersonGender =
  | "woman"
  | "man"
  | "trans"
  | "crossdresser"
  | "couple";

export const PERSON_GENDERS: PersonGender[] = [
  "woman",
  "man",
  "trans",
  "crossdresser",
  "couple",
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
    default:
      return g;
  }
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
  /** data-URL photos (local persistence; keep few + small) */
  photos: string[];
  /** Index into photos for the primary/top image */
  mainPhotoIndex: number;
  favorite: boolean;
  isCouple: boolean;
  partnerA: string;
  partnerB: string;
  locations: string;
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
  | "manual"
  | "name-asc"
  | "name-desc"
  | "updated-desc"
  | "newest";

export const MUSE_SORT_OPTIONS: { value: MuseSortMode; label: string }[] = [
  { value: "manual", label: "Your order" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "updated-desc", label: "Recently updated" },
  { value: "newest", label: "Newest added" },
];

export function samePartnerId(a: unknown, b: unknown): boolean {
  return Number(a) === Number(b) && Number.isFinite(Number(a));
}

export function sortMuses(
  list: PartnerRecord[],
  mode: MuseSortMode,
  manualOrder: number[] = [],
): PartnerRecord[] {
  const copy = [...list];
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
    blurb: "Swingers discovery — profiles, photos, share codes (Echo).",
  },
] as const;

/** Grouped catalog for acts logged (editor multi-select). */
export const ACT_GROUPS: Array<{ cat: string; tags: string[] }> = [
  {
    cat: "Kiss / touch",
    tags: ["Kissed", "Made out", "Handjob", "Received handjob", "Massage / body worship"],
  },
  {
    cat: "Oral",
    tags: [
      "Blowjob given",
      "Blowjob received",
      "Facial",
      "Cum in mouth",
      "Rimming",
      "69",
      "Face-fucking",
    ],
  },
  {
    cat: "Penetration",
    tags: [
      "Vaginal sex",
      "Anal sex (gave)",
      "Anal sex (received)",
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

export const DEFAULT_LOCS: SceneLocation[] = [
  {
    id: "bedroom",
    name: "Bedroom / Home",
    desc: "Soft lamp light, messy sheets. Private enough to get loud.",
  },
  {
    id: "hotel",
    name: "Hotel / Motel",
    desc: "One big bed, blackout curtains. Anonymous.",
  },
  {
    id: "car",
    name: "Car / Vehicle",
    desc: "Fogged windows, leather and skin. Risk of being seen.",
  },
  {
    id: "shower",
    name: "Shower / Bathroom",
    desc: "Steam, tile, water over bodies.",
  },
  {
    id: "public",
    name: "Public risk",
    desc: "Somewhere you should not be doing this.",
  },
  {
    id: "cabin",
    name: "Private cabin",
    desc: "Wood walls, remote. No neighbors.",
  },
  {
    id: "apartment",
    name: "Empty apartment",
    desc: "Bare floors, echo. No one will know.",
  },
  {
    id: "party",
    name: "Party / House",
    desc: "Music through walls. They might hear you.",
  },
  {
    id: "kitchen",
    name: "Kitchen counter",
    desc: "Cold stone, half-cleared dishes. Home but not the bed.",
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
    id: "balcony",
    name: "City balcony",
    desc: "Rail against your back. Traffic below, curtains half-drawn.",
  },
  {
    id: "pool",
    name: "Pool / Hot tub",
    desc: "Warm water, wet skin, chlorine and steam.",
  },
  {
    id: "sauna",
    name: "Sauna / Spa",
    desc: "Heat, cedar, towels that keep slipping.",
  },
  {
    id: "beach",
    name: "Beach at night",
    desc: "Salt air, dark water, sand that sticks to skin.",
  },
  {
    id: "forest",
    name: "Forest clearing",
    desc: "Trees close in. Quiet except for breath.",
  },
  {
    id: "camping",
    name: "Tent / Camping",
    desc: "Thin walls, sleeping bags unzipped. Outside feels near.",
  },
  {
    id: "yacht",
    name: "Yacht cabin",
    desc: "Gentle rock of the hull. Ocean nowhere and everywhere.",
  },
  {
    id: "jet",
    name: "Private jet",
    desc: "Narrow aisle, leather seats, clouds outside the window.",
  },
  {
    id: "limo",
    name: "Limo backseat",
    desc: "Partition up. Soft leather, city lights sliding past.",
  },
  {
    id: "train",
    name: "Train sleeper",
    desc: "Rhythmic sway, thin door. Corridor footsteps possible.",
  },
  {
    id: "elevator",
    name: "Elevator",
    desc: "Mirrored walls, floors ticking by. Could stop any second.",
  },
  {
    id: "fitting",
    name: "Fitting room",
    desc: "Thin curtain, harsh light. Shoppers just outside.",
  },
  {
    id: "office",
    name: "Office after hours",
    desc: "Desk lamp only. Cubicles empty, building locked.",
  },
  {
    id: "club-vip",
    name: "Club VIP room",
    desc: "Bass through the wall. Bottle service, velvet, locked door.",
  },
  {
    id: "dancefloor",
    name: "Dark dance floor",
    desc: "Bodies packed close. Hands can wander without a name.",
  },
  {
    id: "library",
    name: "Quiet library",
    desc: "Stacks and silence. Whisper only — or try not to.",
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    desc: "Humid glass, leaves brushing skin. Soft dirt underfoot.",
  },
];

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
    photos: [],
    mainPhotoIndex: 0,
    favorite: false,
    isCouple: false,
    partnerA: "",
    partnerB: "",
    locations: "",
    createdAt: now,
    updatedAt: now,
  };
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
  if (p.isCouple || p.gender === "couple") {
    if (p.partnerA && p.partnerB) return `${p.partnerA} and ${p.partnerB}`;
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
    doneActs: [],
    photos: [],
    mainPhotoIndex: 0,
    favorite: false,
    isCouple: false,
    partnerA: "",
    partnerB: "",
    locations: "",
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
          doneActs: Array.isArray(p.doneActs) ? p.doneActs : [],
          dynTags: Array.isArray(p.dynTags) ? p.dynTags : [],
        })).map((p) => {
          const id = Number(p.id);
          const base = {
            ...p,
            id: Number.isFinite(id) && id > 0 ? id : nextPartnerId([]),
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

export function savePartners(list: PartnerRecord[]) {
  localStorage.setItem(STORAGE.partners, JSON.stringify(list));
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
  perPartner: 24,
  maxSidePx: 960,
  jpegQuality: 0.88,
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
