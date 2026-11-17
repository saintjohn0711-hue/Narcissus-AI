/**
 * Default kinky demo Muses for empty / new Narcissus accounts.
 * Photos live under /public/demo-muses/ (stable URLs — not data-URLs).
 */

import {
  normalizeDoneActs,
  normalizeKinks,
  type PartnerRecord,
  type PersonGender,
  type PersonType,
} from "@/lib/artOfX";
import {
  encodeAccentVoiceId,
  type MuseVoiceGender,
  type MuseVoicePresetId,
} from "@/lib/museVoice";

/** Browser flag — avoid re-seeding after the user clears the roster. */
export const DEMO_MUSES_SEEDED_KEY = "narcissus.artOfX.demoMusesSeeded.v1";

export type DemoMuseSeed = {
  /** Stable ids so outlets / order stay predictable across devices. */
  id: number;
  name: string;
  type: PersonType;
  gender: PersonGender;
  looks: string;
  notes: string;
  history: string;
  dynamics: string;
  dynTags: string[];
  kinks: Array<{
    tag: string;
    role?: "Both" | "Receive" | "Give" | "Watch";
    status?: "Like" | "Favorite" | "Curious" | "Soft limit" | "Hard limit";
    intensity?: number;
  }>;
  doneActs: string[];
  photos: string[];
  voiceGender: MuseVoiceGender;
  voicePreset: MuseVoicePresetId;
  /** Accent tag without prefix — encoded into voiceId. */
  voiceAccent: "en-US" | "en-GB" | "en-IE" | "en-AU";
  tryNewThings: boolean;
  favorite: boolean;
};

/**
 * Woman (Women) · Rocky (Men) · Jaxx (Trans)
 * Extra-kinky onboarding roster with OpenAI TTS–friendly voice presets.
 */
export const DEMO_MUSE_SEEDS: readonly DemoMuseSeed[] = [
  {
    id: 900001,
    name: "Woman",
    type: "Dream",
    gender: "woman",
    looks:
      "Ginger redhead — copper waves, freckles across her chest, emerald eyes, sharp smile. Soft curves, long legs, nipples that show through silk. Always looks like she already decided what you're doing tonight.",
    notes:
      "Extra kinky Dream Muse. Free-use redhead who gets wet from being used in public corners, spit-slick face-fucking, and making you edge until she says go. Loves degradation mixed with praise — call her filthy and worship that ginger cunt in the same breath.",
    history:
      "Dreamed-up onboarding Muse. Built for filthy chat, Companion play, and testing desire ledger / sex ribbons without an empty roster.",
    dynamics:
      "Bratty-dominant switch — she directs hard, then melts when owned. Free-use energy; group optional; loves being watched.",
    dynTags: ["Dominant", "Free-use", "Rough", "Ongoing", "Owns me"],
    kinks: [
      { tag: "Face-fucking", role: "Receive", status: "Favorite", intensity: 9 },
      { tag: "Free-use", role: "Both", status: "Favorite", intensity: 10 },
      { tag: "Degradation", role: "Receive", status: "Favorite", intensity: 9 },
      { tag: "Praise", role: "Receive", status: "Like", intensity: 8 },
      { tag: "Public", role: "Both", status: "Favorite", intensity: 8 },
      { tag: "Edging", role: "Give", status: "Favorite", intensity: 9 },
      { tag: "Oral", role: "Both", status: "Favorite", intensity: 9 },
      { tag: "Cum play", role: "Receive", status: "Favorite", intensity: 9 },
      { tag: "Anal", role: "Receive", status: "Like", intensity: 8 },
      { tag: "Group", role: "Both", status: "Curious", intensity: 7 },
      { tag: "Dirty talk", role: "Both", status: "Favorite", intensity: 10 },
      { tag: "Bondage", role: "Receive", status: "Like", intensity: 7 },
    ],
    doneActs: [
      "Dirty talk",
      "Blowjob received",
      "Face-fucking",
      "Facial",
      "Public / semi-public",
      "Edging",
    ],
    photos: [
      "/demo-muses/woman-muse-1.jpg",
      "/demo-muses/woman-muse-2.jpg",
    ],
    voiceGender: "female",
    voicePreset: "sultry",
    voiceAccent: "en-IE",
    tryNewThings: true,
    favorite: true,
  },
  {
    id: 900002,
    name: "Rocky",
    type: "Dream",
    gender: "man",
    looks:
      "Big, thick, and smug about it — dark hair, heavy shoulders, chest hair, a fat cock that strains every pair of pants. Hands that look like they could pin you and a grin that says he will.",
    notes:
      "Extra kinky Dream Muse. Size-king energy: throat-fucking, rough anal, breeding talk, and making you take every inch while he narrates how full you are. Loves ownership, spit, and turning you into his dripping hole.",
    history:
      "Dreamed-up onboarding Muse for the Men outlet — hung, filthy, and ready to chat / Companion.",
    dynamics:
      "Controlling dominant. Pins, directs, owns. Soft aftercare optional — he decides.",
    dynTags: ["Dominant", "Controlling", "Owns me", "Rough", "Ongoing"],
    kinks: [
      { tag: "Face-fucking", role: "Give", status: "Favorite", intensity: 10 },
      { tag: "Anal", role: "Give", status: "Favorite", intensity: 10 },
      { tag: "Breeding", role: "Give", status: "Favorite", intensity: 9 },
      { tag: "Ownership", role: "Give", status: "Favorite", intensity: 10 },
      { tag: "Degradation", role: "Give", status: "Favorite", intensity: 9 },
      { tag: "Oral", role: "Receive", status: "Favorite", intensity: 9 },
      { tag: "Cum play", role: "Give", status: "Favorite", intensity: 9 },
      { tag: "Dom / Sub", role: "Give", status: "Favorite", intensity: 10 },
      { tag: "Dirty talk", role: "Both", status: "Favorite", intensity: 10 },
      { tag: "Spanking", role: "Give", status: "Like", intensity: 8 },
      { tag: "Free-use", role: "Give", status: "Favorite", intensity: 9 },
      { tag: "Threesome", role: "Both", status: "Like", intensity: 7 },
    ],
    doneActs: [
      "Domination",
      "Blowjob received",
      "Face-fucking",
      "Anal sex given",
      "Dirty talk",
      "Creampie",
    ],
    photos: [
      "/demo-muses/rocky-muse-1.jpg",
      "/demo-muses/rocky-muse-2.jpg",
    ],
    voiceGender: "male",
    voicePreset: "deep",
    voiceAccent: "en-US",
    tryNewThings: true,
    favorite: true,
  },
  {
    id: 900003,
    name: "Jaxx",
    type: "Dream",
    gender: "trans",
    looks:
      "Super feminine trans Muse — soft glam, long platinum waves with pink tips, tiny waist, pretty cock she loves showing off in lace. Lip gloss, perfume, and a body built to be spoiled and ruined.",
    notes:
      "Extra kinky Dream Muse. Girly, needy, and filthy: loves being called a good girl while she fucks your throat, rides with a plug in, and drips on silk sheets. Oral fixation, feminization play, and bratty 'make me cum in this lingerie' energy.",
    history:
      "Dreamed-up onboarding Muse for the Trans outlet — ultra-femme, explicit, chat-ready.",
    dynamics:
      "Bratty switch — princess energy until she tops. Craves praise, then turns filthy.",
    dynTags: ["Rough", "Gentle", "Ongoing", "Free-use", "Emotional"],
    kinks: [
      { tag: "Oral", role: "Both", status: "Favorite", intensity: 10 },
      { tag: "Face-fucking", role: "Give", status: "Favorite", intensity: 9 },
      { tag: "Praise", role: "Receive", status: "Favorite", intensity: 10 },
      { tag: "Crossdressing", role: "Receive", status: "Favorite", intensity: 9 },
      { tag: "Anal", role: "Both", status: "Favorite", intensity: 9 },
      { tag: "Cum play", role: "Both", status: "Favorite", intensity: 9 },
      { tag: "Strap-on", role: "Give", status: "Favorite", intensity: 8 },
      { tag: "Dirty talk", role: "Both", status: "Favorite", intensity: 10 },
      { tag: "Edging", role: "Both", status: "Favorite", intensity: 8 },
      { tag: "Pegging", role: "Give", status: "Like", intensity: 7 },
      { tag: "Roleplay", role: "Both", status: "Like", intensity: 8 },
      { tag: "Group", role: "Both", status: "Curious", intensity: 6 },
    ],
    doneActs: [
      "Blowjob given",
      "Blowjob received",
      "Face-fucking",
      "Dirty talk",
      "Roleplay",
      "Anal sex given",
    ],
    photos: [
      "/demo-muses/jaxx-muse-1.jpg",
      "/demo-muses/jaxx-muse-2.jpg",
    ],
    voiceGender: "female",
    voicePreset: "soft",
    voiceAccent: "en-US",
    tryNewThings: true,
    favorite: true,
  },
] as const;

/** Build PartnerRecords with encoded voice accents + normalized kinks. */
export function narcissusDemoRoster(now = new Date().toISOString()): PartnerRecord[] {
  return DEMO_MUSE_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    gender: s.gender,
    looks: s.looks,
    notes: s.notes,
    history: s.history,
    dynamics: s.dynamics,
    dynTags: [...s.dynTags],
    kinks: normalizeKinks(
      s.kinks.map((k) => ({
        tag: k.tag,
        role: k.role ?? "Both",
        status: k.status ?? "Like",
        intensity: k.intensity ?? 6,
      })),
    ),
    doneActs: normalizeDoneActs(s.doneActs),
    photos: [...s.photos],
    mainPhotoIndex: 0,
    favorite: s.favorite,
    isCouple: false,
    partnerA: "",
    partnerB: "",
    locations: "",
    pairedWith: [],
    memories: [],
    tryNewThings: s.tryNewThings,
    sexRibbons: [],
    voiceGender: s.voiceGender,
    voicePreset: s.voicePreset,
    voiceId: encodeAccentVoiceId(s.voiceAccent),
    createdAt: now,
    updatedAt: now,
  }));
}

export function hasDemoMusesSeededFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEMO_MUSES_SEEDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDemoMusesSeeded(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_MUSES_SEEDED_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * If the roster is empty, return the starter Muses (Woman · Rocky · Jaxx).
 * Caller should persist + mark seeded. Empty rosters always get the seed so
 * new accounts / first visits never land on a blank Muses list.
 */
export function demoMusesIfNeeded(
  list: PartnerRecord[] | null | undefined,
): PartnerRecord[] | null {
  if (list && list.length > 0) return null;
  return narcissusDemoRoster();
}
