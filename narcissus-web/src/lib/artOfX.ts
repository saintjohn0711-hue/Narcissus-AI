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
} as const;

export const ART_OF_X_NAV = [
  {
    id: "partners",
    href: "/art-of-x/partners",
    label: "Partners",
    blurb: "Sex tracker — people, acts, kinks, dynamics, photos.",
  },
  {
    id: "stories",
    href: "/art-of-x/stories",
    label: "Stories",
    blurb: "Scene builder — cast, place, kinks → vivid Grok-style story craft.",
  },
  {
    id: "chat",
    href: "/art-of-x/chat",
    label: "AI chat",
    blurb: "Chat with partner cards (local personality stub → real LLM next).",
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
  name = "New partner",
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

export function surpriseBeats(n: number): string {
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

export type ScenePov = "you" | "partner" | "third";

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function partnerTone(p: PartnerRecord): "dominant" | "gentle" | "playful" | "direct" {
  const tags = p.dynTags.map((t) => t.toLowerCase());
  const dyn = `${p.dynamics} ${p.notes}`.toLowerCase();
  if (
    tags.some((t) =>
      ["dominant", "controlling", "owns me", "rough"].includes(t),
    ) ||
    /dom|control|own|rough|aggress/.test(dyn)
  ) {
    return "dominant";
  }
  if (tags.includes("gentle") || /gentle|soft|tender/.test(dyn)) return "gentle";
  if (tags.includes("free-use") || /teas|playful|brat|flirt/.test(dyn)) {
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

function kinkBeats(
  partners: PartnerRecord[],
  kinks: string[],
  intensity: number,
): string[] {
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const out: string[] = [];
  const has = (re: RegExp) => kinks.some((k) => re.test(k));

  if (has(/oral|blow|face-fuck|facial/i)) {
    out.push(
      b
        ? `${a} and ${b} trade your cock between mouths — spit strings, messy sounds, one holding eye contact while the other takes you deeper than polite.`
        : `${a} works your cock with a wet, deliberate mouth — tongue under the head, then deeper, spit shining down the shaft while hands keep you exactly where they want you.`,
    );
  }
  if (has(/anal|peg|atm|ass/i)) {
    out.push(
      `Attention drops to your ass: lube warm on fingers, pressure circling your hole, then a slow push that makes your breath catch. ${a} talks you through the stretch like it's the point.`,
    );
  }
  if (has(/edg|deny|cage|chast/i)) {
    out.push(
      `Every time your hips start to chase it, they back off — lighter touch, almost-cruel patience — until you're shaking and swearing. Intensity ${intensity}/10 means they enjoy denying you.`,
    );
  }
  if (has(/dirty talk|degrad|praise|dom/i)) {
    out.push(
      `The talk stays specific: what you look like open, how wet you already are, what they're going to put in you next — not generic porn lines, their voice.`,
    );
  }
  if (has(/group|threesome|voyeur|cuck|hotwife|free-use|public/i)) {
    out.push(
      b
        ? `The room feels shared. Hands multiply. ${a} uses you while ${b} watches close enough to feel the heat off your skin — then trades places without asking twice.`
        : `${a} treats you like something already claimed for the night — free-use energy, no performance, just appetite.`,
    );
  }
  if (has(/bondage|spank|restrain/i)) {
    out.push(
      `A grip, a cuff, a hand pinning a wrist to the mattress — enough restraint that you feel the choice leave your body in the best way.`,
    );
  }
  if (has(/creampie|cum|breed|facial/i)) {
    out.push(
      `They talk about finishing in/on you like it's already decided — warm, messy, owned — and make you wait for it anyway.`,
    );
  }
  if (!out.length) {
    out.push(
      `${a} takes you apart with hands and mouth first, learning what makes your thighs jump before they decide how deep the night goes.`,
    );
  }
  return out;
}

/** Partner-aware local scene craft (LLM path: /api/art-of-x/generate-scene). */
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

  const openings =
    pov === "you"
      ? [
          `${loc.desc} Heat hangs in the air already — not rushed, just inevitable.`,
          `${loc.desc} You feel it before anyone speaks: the decision already made in the way they look at you.`,
          `${loc.desc} Clothes come off like an argument you've already lost — gladly.`,
        ]
      : [
          `${loc.desc} The night tilts toward filthy the second ${lookHook(a)} decides it should.`,
          `${loc.desc} Nobody pretends this is casual once hands start moving.`,
        ];

  let scene = `${pickOne(openings)}\n\n`;

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

  if (b) {
    const bName = displayName(b);
    scene +=
      `${aName} wraps fingers around you and takes a long look before leaning in — mouth hot over the head, slow at first, spit building, tongue working the underside until the wet sound fills the space.\n\n` +
      `${bName} settles lower without being asked — breath on sensitive skin, long tongue strokes, a hand sliding between thighs. A fingertip finds your hole, circles, presses, sinks to the first knuckle while that mouth keeps working.\n\n` +
      `"Already opening," ${bName} murmurs. ${aName} answers by taking you deeper, holding, swallowing around the head.\n\n` +
      `${aName} pulls off just enough to speak, spit shining. "Keep fingering. I want him soft and ready while I suck every bit of attention out of this cock."\n\n` +
      `${bName} adds a second finger. The stretch is slow, intentional. When the right spot lights up, hips jerk — and ${aName} uses that moment to push back into throat-heat while ${bName} matches the rhythm lower.`;
  } else {
    const line =
      tone === "dominant"
        ? `"Stay open for me," ${aName} says, voice rough. "Take my fingers while I use this mouth. Don't you dare finish until I say."`
        : tone === "gentle"
          ? `"That's it," ${aName} breathes against you. "Let me have you slow. Tell me if you want more."`
          : `"That's it," ${aName} says, coming up for air spit-slick. "Take my fingers while I work this cock. Stay open."`;
    scene +=
      `${aName} takes time — mouth on your cock, thorough, spit running down the shaft over knuckles. Free hand reaches under, presses two fingers to your hole, works them in while sucking stays steady. No rush. Every tongue stroke matches the push.\n\n` +
      line;
  }

  const beats = kinkBeats(picks, opts.kinks, opts.intensity);
  const need =
    opts.length === "short"
      ? 1
      : opts.length === "long"
        ? beats.length
        : Math.min(2, beats.length);
  for (let i = 0; i < need; i++) {
    scene += `\n\n${beats[i % beats.length]}`;
  }

  if (opts.length !== "short") {
    scene += `\n\nThey settle into a rhythm meant to last. Long wet strokes. Deeper fingers. Edging when you get close — pace drops, touch lightens, then harder again. Dirty talk stays constant and specific. Intensity sits at ${opts.intensity}/10 and keeps climbing.`;
    if (c) {
      scene += `\n\n${displayName(c)} watches for a stretch, then moves closer, stroking, waiting. "My turn soon. Don't finish yet."`;
    }
    if (a.dynTags.length || a.dynamics?.trim()) {
      scene += `\n\nThe dynamic is unmistakable${a.dynamics?.trim() ? ` — ${a.dynamics.trim()}` : ""}${a.dynTags.length ? ` (${a.dynTags.join(", ")})` : ""}.`;
    }
  }

  if (opts.length === "long") {
    scene +=
      "\n\nTime stretches. Positions shift without announcement. On your side so one mouth can keep sucking while another has better access lower. Then on your back, legs pushed up. Mouths trade. Fingers become tongue at your hole, then fingers again — deeper, wetter. They talk over you and to you. Nobody is in a hurry to end this.";
  }

  if (opts.roles?.trim()) scene += `\n\nRoles hold: ${opts.roles.trim()}.`;
  if (opts.extra?.trim()) {
    scene += `\n\nThey bend the night around your direction: ${opts.extra.trim()}`;
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

/** Continue beat — ArkOfX-style append when user gives no new direction. */
export function continueStory(
  previous: string,
  partners: PartnerRecord[],
  pov: ScenePov = "you",
): string {
  const a = partners[0] ? displayName(partners[0]) : "They";
  const b = partners[1] ? displayName(partners[1]) : null;
  const variants = b
    ? [
        `\n\n---\n\n${a} and ${b} refuse to let the pace drop. Mouths and hands trade places, keeping the edge sharp until one of them decides you've earned more.`,
        `\n\n---\n\n${b} takes the cock while ${a} goes lower — tongue, fingers, filthy praise — until legs shake and breath breaks.`,
        `\n\n---\n\nThey flip the angle. ${a} holds you open; ${b} uses that opening without hurry. Talk stays specific enough to make you drip.`,
      ]
    : [
        `\n\n---\n\n${a} keeps going — slower, then deeper — narrating every inch until holding still feels impossible.`,
        `\n\n---\n\n${a} edges on purpose, then pulls you back into that wet heat and refuses the finish a little longer.`,
      ];
  let beat = pickOne(variants);
  if (pov === "third") {
    beat = beat
      .replace(/\byou\b/gi, "they")
      .replace(/\byour\b/gi, "their")
      .replace(/\byou've\b/gi, "they've");
  }
  return previous + beat;
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
      "They back off the second you get close. Touch lightens. Mouths hover. You're held right there — shaking — until they decide you can have more.\n\n";
  }
  if (/ass|anal|hole|peg|strap/.test(d)) {
    acted = true;
    beat +=
      "Attention drops lower. Lube. Pressure at your hole. Slow push until you take it. They hold you open and talk while it happens.\n\n";
  }
  if (/group|another|join|third|watch/.test(d)) {
    acted = true;
    beat +=
      "The room gets more crowded. Another body moves in. Hands and mouths multiply. You're being shared.\n\n";
  }
  if (/mouth|suck|oral|throat|blow/.test(d)) {
    acted = true;
    beat +=
      "A mouth claims you again — wetter, hungrier — while hands keep the rest of you busy so you can't think past the next stroke.\n\n";
  }
  if (!acted) {
    beat += b
      ? `${a} and ${b} shift immediately to match that. The next stretch is built around your words — pace, acts, talk — held long enough to land.\n\n`
      : `${a} shifts immediately to match that. The next stretch is built around your words — pace, acts, talk — held long enough to land.\n\n`;
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
        })).map((p) =>
          p.photos.length
            ? {
                ...p,
                mainPhotoIndex: Math.min(
                  Math.max(0, p.mainPhotoIndex),
                  p.photos.length - 1,
                ),
              }
            : { ...p, mainPhotoIndex: 0 },
        )
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
