/**
 * Companion customize options — Features · Style · Clothing · Nude.
 * Adults 18+ only. Identity stays locked to the Muse photo.
 */

export type CompanionHair =
  | "identity"
  | "long-flow"
  | "short-bob"
  | "wavy-volume";
export type CompanionEyes = "identity" | "large-luminous" | "sultry";
export type CompanionBody = "identity" | "soft-curves" | "athletic";
export type CompanionExpression =
  | "soft-gaze"
  | "flirty-smile"
  | "playful-pout"
  | "intimate";
export type CompanionLookStyle =
  | "juichat"
  | "soft-pastel"
  | "dark-glam"
  | "neon-night";
export type CompanionClothing =
  | "lingerie"
  | "casual"
  | "dress"
  | "goth"
  | "swimsuit"
  | "nude";

export type CompanionWardrobe = {
  hair: CompanionHair;
  eyes: CompanionEyes;
  body: CompanionBody;
  expression: CompanionExpression;
  look: CompanionLookStyle;
  clothing: CompanionClothing;
};

export const DEFAULT_COMPANION_WARDROBE: CompanionWardrobe = {
  hair: "identity",
  eyes: "identity",
  body: "identity",
  expression: "soft-gaze",
  look: "juichat",
  clothing: "lingerie",
};

type Opt<T extends string> = { id: T; label: string; hint: string };

export const COMPANION_HAIR: Opt<CompanionHair>[] = [
  { id: "identity", label: "Her hair", hint: "Match Muse photo" },
  { id: "long-flow", label: "Long flow", hint: "Lengthened, silky" },
  { id: "short-bob", label: "Short bob", hint: "Styled short" },
  { id: "wavy-volume", label: "Wavy volume", hint: "Soft waves" },
];

export const COMPANION_EYES: Opt<CompanionEyes>[] = [
  { id: "identity", label: "Her eyes", hint: "Match Muse photo" },
  { id: "large-luminous", label: "Large luminous", hint: "Ani catchlights" },
  { id: "sultry", label: "Sultry", hint: "Half-lidded heat" },
];

export const COMPANION_BODY: Opt<CompanionBody>[] = [
  { id: "identity", label: "Her figure", hint: "Match Muse photo" },
  { id: "soft-curves", label: "Soft curves", hint: "Flattering bust" },
  { id: "athletic", label: "Athletic", hint: "Toned lines" },
];

export const COMPANION_EXPRESSION: Opt<CompanionExpression>[] = [
  { id: "soft-gaze", label: "Soft gaze", hint: "Intimate look" },
  { id: "flirty-smile", label: "Flirty smile", hint: "Playful" },
  { id: "playful-pout", label: "Playful pout", hint: "Teasing" },
  { id: "intimate", label: "Intimate", hint: "Close & inviting" },
];

export const COMPANION_LOOK_STYLES: Opt<CompanionLookStyle>[] = [
  { id: "juichat", label: "JuicyChat", hint: "Cel + rim light" },
  { id: "soft-pastel", label: "Soft pastel", hint: "Dreamy blush" },
  { id: "dark-glam", label: "Dark glam", hint: "Moody contrast" },
  { id: "neon-night", label: "Neon night", hint: "Cyan rim glow" },
];

export const COMPANION_CLOTHING: Opt<CompanionClothing>[] = [
  { id: "lingerie", label: "Lingerie", hint: "Lace / intimate" },
  { id: "casual", label: "Casual", hint: "Soft tee & shorts" },
  { id: "dress", label: "Dress", hint: "Flirty cocktail" },
  { id: "goth", label: "Goth", hint: "Black lace / straps" },
  { id: "swimsuit", label: "Swimsuit", hint: "Slim bikini" },
  { id: "nude", label: "Nude", hint: "Adults 18+ explicit" },
];

const WARDROBE_STORAGE = "narcissus.artOfX.companionWardrobe.v1";

function isId<T extends string>(
  v: unknown,
  opts: Opt<T>[],
): v is T {
  return typeof v === "string" && opts.some((o) => o.id === v);
}

export function normalizeWardrobe(
  raw: Partial<CompanionWardrobe> | null | undefined,
): CompanionWardrobe {
  const d = DEFAULT_COMPANION_WARDROBE;
  return {
    hair: isId(raw?.hair, COMPANION_HAIR) ? raw!.hair! : d.hair,
    eyes: isId(raw?.eyes, COMPANION_EYES) ? raw!.eyes! : d.eyes,
    body: isId(raw?.body, COMPANION_BODY) ? raw!.body! : d.body,
    expression: isId(raw?.expression, COMPANION_EXPRESSION)
      ? raw!.expression!
      : d.expression,
    look: isId(raw?.look, COMPANION_LOOK_STYLES) ? raw!.look! : d.look,
    clothing: isId(raw?.clothing, COMPANION_CLOTHING)
      ? raw!.clothing!
      : d.clothing,
  };
}

export function wardrobeKey(w: CompanionWardrobe): string {
  const n = normalizeWardrobe(w);
  return [
    n.hair,
    n.eyes,
    n.body,
    n.expression,
    n.look,
    n.clothing,
  ].join(".");
}

export function loadCompanionWardrobe(partnerId: number): CompanionWardrobe {
  if (typeof window === "undefined") return { ...DEFAULT_COMPANION_WARDROBE };
  try {
    const raw = localStorage.getItem(WARDROBE_STORAGE);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const entry = map[String(partnerId)];
    if (entry && typeof entry === "object") {
      return normalizeWardrobe(entry as Partial<CompanionWardrobe>);
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_COMPANION_WARDROBE };
}

export function saveCompanionWardrobe(
  partnerId: number,
  wardrobe: CompanionWardrobe,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(WARDROBE_STORAGE);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    map[String(partnerId)] = normalizeWardrobe(wardrobe);
    localStorage.setItem(WARDROBE_STORAGE, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

function hairDirective(h: CompanionHair): string {
  switch (h) {
    case "long-flow":
      return "Hair: keep her natural color from Image 1 but lengthen into long flowing silky strands with soft highlights.";
    case "short-bob":
      return "Hair: keep her natural color from Image 1 restyled as a chic short bob with clean bangs.";
    case "wavy-volume":
      return "Hair: keep her natural color from Image 1 with soft wavy volume and polished anime strand detail.";
    default:
      return "Hair: preserve her exact hair color, length, parting, and hairline from Image 1.";
  }
}

function eyesDirective(e: CompanionEyes): string {
  switch (e) {
    case "large-luminous":
      return "Eyes: enlarge slightly into luminous anime eyes while keeping her iris color from Image 1, with crystalline catchlights.";
    case "sultry":
      return "Eyes: keep her iris color from Image 1, slightly narrowed sultry lids, thick lashes, soft bedroom gaze.";
    default:
      return "Eyes: preserve her eye shape and iris color from Image 1, rendered as expressive anime eyes.";
  }
}

function bodyDirective(b: CompanionBody): string {
  switch (b) {
    case "soft-curves":
      return "Body: flattering soft curves and intimate bust framing; still the same woman as Image 1.";
    case "athletic":
      return "Body: toned athletic lines and shoulders; still the same woman as Image 1.";
    default:
      return "Body: preserve her body proportions and silhouette family from Image 1.";
  }
}

function expressionDirective(x: CompanionExpression): string {
  switch (x) {
    case "flirty-smile":
      return "Expression: soft flirty smile, looking at the viewer.";
    case "playful-pout":
      return "Expression: playful pout, teasing companion energy.";
    case "intimate":
      return "Expression: intimate close invitation, parted lips, locked eye contact.";
    default:
      return "Expression: soft intimate gaze toward the viewer.";
  }
}

function lookDirective(l: CompanionLookStyle): string {
  switch (l) {
    case "soft-pastel":
      return "Palette/style variant: soft pastel blush tones, dreamy fill light, gentle gradients.";
    case "dark-glam":
      return "Palette/style variant: dark glam contrast, deeper shadows, glossy lips, velvet mood.";
    case "neon-night":
      return "Palette/style variant: neon-night companion — deep navy shadows with cyan rim light.";
    default:
      return "Palette/style variant: JuicyChat-class cel shading, soft blush, thin rim light.";
  }
}

function clothingDirective(c: CompanionClothing): string {
  switch (c) {
    case "casual":
      return "Clothing: casual soft tee and shorts, cozy companion-at-home vibe.";
    case "dress":
      return "Clothing: flirty cocktail dress with a tasteful neckline, evening companion look.";
    case "goth":
      return "Clothing: black gothic lace / straps, dark romantic companion fashion.";
    case "swimsuit":
      return "Clothing: slim fashionable bikini / swimsuit, beach-companion framing.";
    case "nude":
      return [
        "Clothing: NUDE — adults 18+ only, fully nude explicit anime companion portrait.",
        "Tasteful erotic illustrated nude, not photoreal pornography; no minors; keep face identity from Image 1.",
        "Intimate medium close-up bust / upper torso framing like a living companion avatar.",
      ].join(" ");
    default:
      return "Clothing: delicate lingerie / lace, sexy companion-app intimate attire.";
  }
}

/** Extra prompt clauses for Companion wardrobe (appended to cartoon base prompt). */
export function companionWardrobePromptBits(
  wardrobe: CompanionWardrobe,
): string {
  const w = normalizeWardrobe(wardrobe);
  return [
    "CUSTOMIZE (adults 18+ only — keep Image 1 face identity absolute):",
    hairDirective(w.hair),
    eyesDirective(w.eyes),
    bodyDirective(w.body),
    expressionDirective(w.expression),
    lookDirective(w.look),
    clothingDirective(w.clothing),
  ].join(" ");
}
