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

export const DONE_ACTS = [
  "Kissed",
  "Made out",
  "Handjob",
  "Received handjob",
  "Blowjob given",
  "Blowjob received",
  "Facial",
  "Cum in mouth",
  "Creampie",
  "Creampie cleanup",
  "Vaginal sex",
  "Anal sex (gave)",
  "Anal sex (received)",
  "Pegging / strap-on",
  "Rimming",
  "69",
  "Threesome",
  "Group sex",
  "Swinging",
  "Public / semi-public",
  "Watched by others",
  "Voyeur",
  "Dirty talk",
  "Domination",
  "Submission",
  "Bondage",
  "Spanking",
  "Chastity / cage",
  "Piss play",
  "Roleplay",
  "Crossdressing",
  "Hotel / travel",
  "Car sex",
  "Overnight",
] as const;

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
    tags: ["Vaginal", "Anal", "Pegging", "Breeding", "Toys"],
  },
  {
    cat: "Power",
    tags: ["Dom / Sub", "Free-use", "Femdom", "Ownership", "Directed"],
  },
  {
    cat: "Restraint / sensation",
    tags: ["Bondage", "Spanking", "Cage", "Edging", "Praise", "Degradation"],
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

function surpriseBeats(n: number): string {
  const count = Math.max(0, Math.min(5, Math.floor(n)));
  if (count <= 0) return "";
  const pool = [...SURPRISES];
  const out: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const j = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(j, 1)[0]!);
  }
  return `\n\nSurprises:\n- ${out.join("\n- ")}`;
}

/** Port of ArkOfX buildStory — long explicit second-person scene craft. */
export function buildStory(opts: {
  partners: PartnerRecord[];
  location: SceneLocation;
  kinks: string[];
  length: SceneLength;
  intensity: number;
  extra?: string;
  roles?: string;
  surpriseCount?: number;
}): string {
  const picks = opts.partners;
  if (!picks.length) return "";
  const a = displayName(picks[0]!);
  const b = picks[1] ? displayName(picks[1]) : null;
  const c = picks[2] ? displayName(picks[2]) : null;
  const loc = opts.location;
  const kinkArr = opts.kinks;
  const intensity = opts.intensity;

  let scene =
    `${loc.desc} The air already feels thick with it — heat, breath, the knowledge of what is about to happen.\n\n` +
    `You end up where they want you. ${a}`;
  if (b) scene += ` and ${b}`;
  if (c) scene += `, with ${c} close enough to touch`;
  scene +=
    " move in without hesitation, like this was decided before anyone spoke.\n\n";

  if (b) {
    scene +=
      `${a} wraps fingers around the base of your cock and takes time looking at it before leaning down. Mouth opens over the head — warm, wet, deliberate — sucking slowly, taking a little more with each pass. Tongue works the underside; wet sound fills the space. A look up, then focus, spit already running down the shaft.\n\n` +
      `${b} settles lower without being asked. Nuzzles under your balls, breathes on the skin, then drags tongue over them in long slow strokes. A hand slides between your thighs. A fingertip finds your hole, circles, presses, then pushes in to the first knuckle while mouth keeps working. A hum against you when you tighten.\n\n` +
      `"He's already opening," ${b} murmurs. ${a} answers by taking you deeper, holding you in the throat for a beat and swallowing around the head.\n\n` +
      `${a} pulls off just enough to speak, spit shining. "Keep fingering him. I want him soft and ready while I suck every bit of attention out of this cock."\n\n` +
      `${b} adds a second finger. The stretch is slow and intentional. When the spot is found your hips jerk without permission. ${a} uses that moment to push you back into the throat and hold, swallowing, while ${b} finger-fucks your ass in the same rhythm.`;
  } else {
    scene +=
      `${a} takes time. Mouth on your cock — slow, thorough, spit running down the shaft and over fingers. Free hand reaches under you, presses two fingers against your hole, and works them in while keeping sucking. No rush. Every tongue stroke matches the push of fingers.\n\n` +
      `"That's it," comes up for air, voice rough. "Take my fingers while I use this mouth on you. Stay open for me."`;
  }

  if (opts.length !== "short") {
    scene +=
      `\n\nThey settle into a rhythm meant to last. Long wet strokes. Fingers deeper. Edging every time you get close — pace drops, touch lightens, then harder again. Dirty talk stays constant and specific. Intensity sits at ${intensity}/10 and keeps climbing.`;
    if (c) {
      scene += `\n\n${c} watches for a stretch, then moves closer, stroking, waiting. "My turn soon. Don't finish him yet."`;
    }
  }
  if (opts.length === "long") {
    scene +=
      "\n\nTime stretches. Positions shift without announcement. On your side so one can keep sucking while the other has better access to your ass. Then on your back with legs pushed up. Mouths trade places. Fingers become a tongue at your hole, then fingers again — deeper, wetter. They talk over you and to you. Nobody is in a hurry to end this.";
  }

  if (kinkArr.length) scene += `\n\nKinks in play: ${kinkArr.join(", ")}.`;
  if (opts.extra?.trim()) scene += `\n\nDirection applied: ${opts.extra.trim()}`;
  if (opts.roles?.trim()) scene += `\n\nRoles: ${opts.roles.trim()}`;
  scene += surpriseBeats(opts.surpriseCount ?? 0);
  return scene;
}

/** Continue beat — ArkOfX-style append when user gives no new direction. */
export function continueStory(
  previous: string,
  partners: PartnerRecord[],
): string {
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const variants = b
    ? [
        `\n\n---\n\n${a} and ${b} do not let the pace drop. They trade mouths and hands, keeping you right on the edge until one of them decides you have earned more.`,
        `\n\n---\n\n${b} takes over the cock while ${a} focuses lower — tongue, fingers, filthy praise — until your legs shake.`,
        `\n\n---\n\nThey flip you. ${a} holds you open; ${b} uses that opening without hurry. Dirty talk stays specific and mean enough to make you drip.`,
      ]
    : [
        `\n\n---\n\n${a} keeps going — slower, then deeper — talking you through every inch until you forget how to hold still.`,
        `\n\n---\n\n${a} edges you again on purpose, then takes you back into that wet heat and refuses to let you finish yet.`,
      ];
  return previous + variants[Math.floor(Math.random() * variants.length)]!;
}

export function injectStoryDirection(
  previous: string,
  direction: string,
  partners: PartnerRecord[],
): string {
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const d = direction.toLowerCase();
  let beat = `\n\n---\n\nYou say what you want: "${direction.trim()}"\n\n`;
  let acted = false;
  if (/edge|deny|don't come|dont come|not yet/.test(d)) {
    acted = true;
    beat +=
      "They back off the moment you get close. Touch lightens. Mouths hover. You are held right there — shaking — until they decide you can have more.\n\n";
  }
  if (/ass|anal|hole|peg|strap/.test(d)) {
    acted = true;
    beat +=
      "Attention drops lower. Lube. Pressure at your hole. Slow push until you take it. They hold you open and talk while it happens.\n\n";
  }
  if (/group|another|join|third|watch/.test(d)) {
    acted = true;
    beat +=
      "The room gets more crowded. Another body moves in. Hands and mouths multiply. You are being shared.\n\n";
  }
  if (!acted) {
    beat += b
      ? `${a} and ${b} shift immediately to match that. The next stretch of the scene is built around your words — pace, acts, and talk — held long enough to land.\n\n`
      : `${a} shifts immediately to match that. The next stretch of the scene is built around your words — pace, acts, and talk — held long enough to land.\n\n`;
  }
  beat +=
    "They do not snap back to the old rhythm. This is the new line of the story until you steer again.";
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
