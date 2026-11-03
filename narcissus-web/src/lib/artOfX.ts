/** Art of X — partner history + erotic story craft (scaffold until paste lands). */

export type PartnerStatus =
  | "active"
  | "paused"
  | "ended"
  | "fantasy"
  | "one_night";

export type PartnerRecord = {
  id: string;
  name: string;
  aliases?: string[];
  status: PartnerStatus;
  firstMet?: string;
  lastScene?: string;
  chemistry?: number; // 1–10
  kinks: string[];
  boundaries: string[];
  bodyNotes?: string;
  voiceNotes?: string;
  relationshipArc?: string;
  sceneLog: SceneEntry[];
  createdAt: string;
  updatedAt: string;
};

export type SceneEntry = {
  id: string;
  date?: string;
  title: string;
  summary: string;
  rating?: number;
  tags: string[];
};

export type StoryDraft = {
  id: string;
  title: string;
  partnerIds: string[];
  premise: string;
  beats: string[];
  tone: string;
  heat: number; // 1–5
  draft: string;
  createdAt: string;
  updatedAt: string;
};

export const ART_OF_X_NAV = [
  {
    id: "partners",
    href: "/art-of-x/partners",
    label: "Partner history",
    blurb: "Track lovers, chemistry, kinks, boundaries, and scene logs.",
  },
  {
    id: "stories",
    href: "/art-of-x/stories",
    label: "Story maker",
    blurb: "Build erotic arcs from partner history — paste Art of X craft next.",
  },
] as const;

/** In-memory seed until Art of X paste + persistence land. */
export function emptyPartner(name = "New partner"): PartnerRecord {
  const now = new Date().toISOString();
  return {
    id: `p_${Date.now().toString(36)}`,
    name,
    status: "active",
    kinks: [],
    boundaries: [],
    sceneLog: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyStory(title = "Untitled scene"): StoryDraft {
  const now = new Date().toISOString();
  return {
    id: `s_${Date.now().toString(36)}`,
    title,
    partnerIds: [],
    premise: "",
    beats: [],
    tone: "intimate",
    heat: 3,
    draft: "",
    createdAt: now,
    updatedAt: now,
  };
}
