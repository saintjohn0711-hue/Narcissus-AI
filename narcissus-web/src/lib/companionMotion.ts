/**
 * Companion interactive motions — CSS/sprite-style actions + chat reactions.
 * Adults 18+. NSFW pose ids only when clothing is lingerie/nude.
 */

export type CompanionActionId =
  | "wave"
  | "come-closer"
  | "twirl"
  | "blow-kiss"
  | "laugh"
  | "sit"
  | "lean-in"
  | "dance"
  | "stretch"
  | "tease";

export type CompanionReactionId =
  | "nod"
  | "smile"
  | "lean"
  | "shimmer"
  | "bounce";

export type CompanionAction = {
  id: CompanionActionId;
  label: string;
  /** Lingerie / nude only */
  nsfw?: boolean;
};

export const COMPANION_ACTIONS: CompanionAction[] = [
  { id: "wave", label: "Wave" },
  { id: "come-closer", label: "Come closer" },
  { id: "twirl", label: "Twirl" },
  { id: "blow-kiss", label: "Blow kiss" },
  { id: "laugh", label: "Laugh" },
  { id: "sit", label: "Sit" },
  { id: "lean-in", label: "Lean in" },
  { id: "dance", label: "Dance" },
  { id: "stretch", label: "Stretch", nsfw: true },
  { id: "tease", label: "Tease", nsfw: true },
];

const REACTION_CYCLE: CompanionReactionId[] = [
  "nod",
  "smile",
  "lean",
  "shimmer",
  "bounce",
];

/** Cheap tone → short reaction. Falls back to a cycling subtle reaction. */
export function pickChatReaction(
  text: string,
  cycleIndex = 0,
): CompanionReactionId {
  const t = text.toLowerCase();
  if (/(\bhaha|\blol\b|😂|😆|hehe|giggle|laugh)/.test(t)) return "bounce";
  if (/(\blove|❤️|kiss|miss you|handsome|sexy|want you)/.test(t)) return "smile";
  if (/(\byes\b|\bok\b|sure|mm+|nod|agree|of course)/.test(t)) return "nod";
  if (/(\bcome|closer|lean|whisper|here)/.test(t)) return "lean";
  if (/(\bwink|flirt|tease|😏)/.test(t)) return "shimmer";
  return REACTION_CYCLE[Math.abs(cycleIndex) % REACTION_CYCLE.length]!;
}

const NSFW_CLOTHING = new Set([
  "lingerie",
  "corset",
  "stockings-garter",
  "lace-teddy",
  "babydoll",
  "sheer-robe",
  "micro-bikini",
  "leather-harness",
  "silk-slip",
  "strap-on",
  "collar-leash",
  "ball-gag",
  "nude",
  "swimsuit",
]);

export function actionsForClothing(
  clothing: string | undefined,
): CompanionAction[] {
  const adult = Boolean(clothing && NSFW_CLOTHING.has(clothing));
  return COMPANION_ACTIONS.filter((a) => !a.nsfw || adult);
}

export type StageFitMode = "fit" | "fill";
