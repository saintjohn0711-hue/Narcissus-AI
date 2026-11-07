/**
 * Companion customize — Features (exact Muse traits) · Style · Clothing · Nude.
 * Defaults are Match Muse photo. Adults 18+ only.
 */

export type CompanionEyeColor =
  | "from-photo"
  | "brown"
  | "hazel"
  | "green"
  | "blue"
  | "gray"
  | "amber";

export type CompanionHairColor =
  | "from-photo"
  | "blonde"
  | "brunette"
  | "black"
  | "red"
  | "auburn"
  | "silver";

export type CompanionHairStyle =
  | "from-photo"
  | "short"
  | "medium"
  | "long"
  | "ponytail"
  | "bob"
  | "wavy-long";

export type CompanionSkinTone =
  | "from-photo"
  | "fair"
  | "light"
  | "medium"
  | "olive"
  | "tan"
  | "deep";

export type CompanionBodyType =
  | "from-photo"
  | "slim"
  | "athletic"
  | "soft-curves"
  | "curvy"
  | "petite";

export type CompanionBust =
  | "from-photo"
  | "small"
  | "medium"
  | "full"
  | "very-full";

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
  eyeColor: CompanionEyeColor;
  hairColor: CompanionHairColor;
  hairStyle: CompanionHairStyle;
  skinTone: CompanionSkinTone;
  bodyType: CompanionBodyType;
  bust: CompanionBust;
  expression: CompanionExpression;
  look: CompanionLookStyle;
  clothing: CompanionClothing;
};

export const DEFAULT_COMPANION_WARDROBE: CompanionWardrobe = {
  eyeColor: "from-photo",
  hairColor: "from-photo",
  hairStyle: "from-photo",
  skinTone: "from-photo",
  bodyType: "from-photo",
  bust: "from-photo",
  expression: "soft-gaze",
  look: "juichat",
  clothing: "lingerie",
};

type Opt<T extends string> = {
  id: T;
  label: string;
  hint: string;
  /** Optional CSS swatch for color chips */
  swatch?: string;
};

export const COMPANION_EYE_COLOR: Opt<CompanionEyeColor>[] = [
  { id: "from-photo", label: "Match Muse", hint: "From her photo" },
  { id: "brown", label: "Brown", hint: "Warm brown", swatch: "#6b3f2a" },
  { id: "hazel", label: "Hazel", hint: "Green-brown", swatch: "#8a6b3d" },
  { id: "green", label: "Green", hint: "Clear green", swatch: "#3d7a4a" },
  { id: "blue", label: "Blue", hint: "Clear blue", swatch: "#3a6ea5" },
  { id: "gray", label: "Gray", hint: "Cool gray", swatch: "#7a8490" },
  { id: "amber", label: "Amber", hint: "Golden amber", swatch: "#c4872a" },
];

export const COMPANION_HAIR_COLOR: Opt<CompanionHairColor>[] = [
  { id: "from-photo", label: "Match Muse", hint: "From her photo" },
  { id: "blonde", label: "Blonde", hint: "Light blonde", swatch: "#e6d0a0" },
  { id: "brunette", label: "Brunette", hint: "Warm brown", swatch: "#5c3a22" },
  { id: "black", label: "Black", hint: "Deep black", swatch: "#1a1a1c" },
  { id: "red", label: "Red", hint: "Bright red", swatch: "#c04030" },
  { id: "auburn", label: "Auburn", hint: "Red-brown", swatch: "#8b3a2a" },
  { id: "silver", label: "Silver", hint: "Silver/white", swatch: "#c8ccd2" },
];

export const COMPANION_HAIR_STYLE: Opt<CompanionHairStyle>[] = [
  { id: "from-photo", label: "Match Muse", hint: "Her length/style" },
  { id: "short", label: "Short", hint: "Chin or shorter" },
  { id: "medium", label: "Medium", hint: "Shoulder length" },
  { id: "long", label: "Long", hint: "Past shoulders" },
  { id: "ponytail", label: "Ponytail", hint: "Tied back" },
  { id: "bob", label: "Bob", hint: "Clean bob" },
  { id: "wavy-long", label: "Wavy long", hint: "Long soft waves" },
];

export const COMPANION_SKIN_TONE: Opt<CompanionSkinTone>[] = [
  { id: "from-photo", label: "Match Muse", hint: "From her photo" },
  { id: "fair", label: "Fair", hint: "Very light", swatch: "#f3e0d0" },
  { id: "light", label: "Light", hint: "Light warm", swatch: "#e8c4a8" },
  { id: "medium", label: "Medium", hint: "Medium tone", swatch: "#c9956c" },
  { id: "olive", label: "Olive", hint: "Olive undertone", swatch: "#b89268" },
  { id: "tan", label: "Tan", hint: "Sun-kissed", swatch: "#a67a4a" },
  { id: "deep", label: "Deep", hint: "Deep rich", swatch: "#6b3f2a" },
];

export const COMPANION_BODY_TYPE: Opt<CompanionBodyType>[] = [
  { id: "from-photo", label: "Match Muse", hint: "Her figure" },
  { id: "slim", label: "Slim", hint: "Slender lines" },
  { id: "athletic", label: "Athletic", hint: "Toned" },
  { id: "soft-curves", label: "Soft curves", hint: "Gentle curves" },
  { id: "curvy", label: "Curvy", hint: "Full curves" },
  { id: "petite", label: "Petite", hint: "Small frame" },
];

export const COMPANION_BUST: Opt<CompanionBust>[] = [
  { id: "from-photo", label: "Match Muse", hint: "Her bust" },
  { id: "small", label: "Small", hint: "Petite bust" },
  { id: "medium", label: "Medium", hint: "Average bust" },
  { id: "full", label: "Full", hint: "Full bust" },
  { id: "very-full", label: "Very full", hint: "Very full bust" },
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

/** Feature groups shown under Customize → Features */
export const COMPANION_FEATURE_GROUPS: Array<{
  title: string;
  key: keyof CompanionWardrobe;
  options: Opt<string>[];
}> = [
  { title: "Eye color", key: "eyeColor", options: COMPANION_EYE_COLOR },
  { title: "Hair color", key: "hairColor", options: COMPANION_HAIR_COLOR },
  { title: "Hair style", key: "hairStyle", options: COMPANION_HAIR_STYLE },
  { title: "Skin tone", key: "skinTone", options: COMPANION_SKIN_TONE },
  { title: "Body type", key: "bodyType", options: COMPANION_BODY_TYPE },
  { title: "Bust", key: "bust", options: COMPANION_BUST },
  { title: "Expression", key: "expression", options: COMPANION_EXPRESSION },
];

const WARDROBE_STORAGE = "narcissus.artOfX.companionWardrobe.v2";

function isId<T extends string>(v: unknown, opts: Opt<T>[]): v is T {
  return typeof v === "string" && opts.some((o) => o.id === v);
}

/** Migrate v1 wardrobe keys (hair/eyes/body) into v2 trait fields. */
function migrateLegacy(
  raw: Record<string, unknown>,
): Partial<CompanionWardrobe> {
  const out: Partial<CompanionWardrobe> = { ...raw } as Partial<CompanionWardrobe>;
  const hair = raw.hair;
  if (typeof hair === "string" && !raw.hairStyle) {
    if (hair === "long-flow" || hair === "wavy-volume") out.hairStyle = "long";
    else if (hair === "short-bob") out.hairStyle = "bob";
    else out.hairStyle = "from-photo";
    out.hairColor = "from-photo";
  }
  const eyes = raw.eyes;
  if (typeof eyes === "string" && !raw.eyeColor) {
    out.eyeColor = "from-photo";
  }
  const body = raw.body;
  if (typeof body === "string" && !raw.bodyType) {
    if (body === "soft-curves") out.bodyType = "soft-curves";
    else if (body === "athletic") out.bodyType = "athletic";
    else out.bodyType = "from-photo";
    out.bust = "from-photo";
  }
  return out;
}

export function normalizeWardrobe(
  raw: Partial<CompanionWardrobe> | Record<string, unknown> | null | undefined,
): CompanionWardrobe {
  const d = DEFAULT_COMPANION_WARDROBE;
  const src = migrateLegacy((raw || {}) as Record<string, unknown>);
  return {
    eyeColor: isId(src.eyeColor, COMPANION_EYE_COLOR)
      ? src.eyeColor!
      : d.eyeColor,
    hairColor: isId(src.hairColor, COMPANION_HAIR_COLOR)
      ? src.hairColor!
      : d.hairColor,
    hairStyle: isId(src.hairStyle, COMPANION_HAIR_STYLE)
      ? src.hairStyle!
      : d.hairStyle,
    skinTone: isId(src.skinTone, COMPANION_SKIN_TONE)
      ? src.skinTone!
      : d.skinTone,
    bodyType: isId(src.bodyType, COMPANION_BODY_TYPE)
      ? src.bodyType!
      : d.bodyType,
    bust: isId(src.bust, COMPANION_BUST) ? src.bust! : d.bust,
    expression: isId(src.expression, COMPANION_EXPRESSION)
      ? src.expression!
      : d.expression,
    look: isId(src.look, COMPANION_LOOK_STYLES) ? src.look! : d.look,
    clothing: isId(src.clothing, COMPANION_CLOTHING)
      ? src.clothing!
      : d.clothing,
  };
}

export function wardrobeKey(w: CompanionWardrobe): string {
  const n = normalizeWardrobe(w);
  return [
    n.eyeColor,
    n.hairColor,
    n.hairStyle,
    n.skinTone,
    n.bodyType,
    n.bust,
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
    let entry = map[String(partnerId)];
    // Fall back to v1 storage once
    if (!entry) {
      const legacy = localStorage.getItem(
        "narcissus.artOfX.companionWardrobe.v1",
      );
      if (legacy) {
        const oldMap = JSON.parse(legacy) as Record<string, unknown>;
        entry = oldMap[String(partnerId)];
      }
    }
    if (entry && typeof entry === "object") {
      return normalizeWardrobe(entry as Record<string, unknown>);
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

function eyeColorDirective(c: CompanionEyeColor): string {
  if (c === "from-photo") {
    return "Eye color: EXACT iris color from Image 1 — do not invent a different color (no random blue/green if her photo shows otherwise).";
  }
  return `Eye color: ${c} irises (user override), still the same eye spacing/character as Image 1.`;
}

function hairColorDirective(c: CompanionHairColor): string {
  if (c === "from-photo") {
    return "Hair color: EXACT hair color from Image 1 — do not invent a different dye.";
  }
  return `Hair color: ${c} (user override), keep her hairline/parting character from Image 1.`;
}

function hairStyleDirective(s: CompanionHairStyle): string {
  switch (s) {
    case "short":
      return "Hair style: short (chin-length or shorter), polished anime strands.";
    case "medium":
      return "Hair style: medium shoulder-length.";
    case "long":
      return "Hair style: long past the shoulders, silky flow.";
    case "ponytail":
      return "Hair style: ponytail, face-framing strands.";
    case "bob":
      return "Hair style: chic bob.";
    case "wavy-long":
      return "Hair style: long soft waves with volume.";
    default:
      return "Hair style/length: match Image 1 exactly (length, parting, hairline).";
  }
}

function skinToneDirective(s: CompanionSkinTone): string {
  if (s === "from-photo") {
    return "Skin tone: EXACT undertone from Image 1.";
  }
  return `Skin tone: ${s} illustrated skin (user override), still recognizably her.`;
}

function bodyTypeDirective(b: CompanionBodyType): string {
  switch (b) {
    case "slim":
      return "Body type: slim slender full-body silhouette.";
    case "athletic":
      return "Body type: athletic toned full-body silhouette.";
    case "soft-curves":
      return "Body type: soft gentle curves, full-body.";
    case "curvy":
      return "Body type: curvy hourglass full-body.";
    case "petite":
      return "Body type: petite small-frame full-body.";
    default:
      return "Body type: preserve her proportions from Image 1 in a full-body standing pose.";
  }
}

function bustDirective(b: CompanionBust): string {
  switch (b) {
    case "small":
      return "Bust: small / petite (user override).";
    case "medium":
      return "Bust: medium (user override).";
    case "full":
      return "Bust: full (user override).";
    case "very-full":
      return "Bust: very full (user override).";
    default:
      return "Bust: match her bust proportions from Image 1.";
  }
}

function expressionDirective(x: CompanionExpression): string {
  switch (x) {
    case "flirty-smile":
      return "Expression: soft flirty smile, looking at the viewer.";
    case "playful-pout":
      return "Expression: playful pout, teasing companion energy.";
    case "intimate":
      return "Expression: intimate invitation, parted lips, locked eye contact.";
    default:
      return "Expression: soft intimate gaze toward the viewer.";
  }
}

function lookDirective(l: CompanionLookStyle): string {
  switch (l) {
    case "soft-pastel":
      return "Palette/style variant: soft pastel blush tones, dreamy fill light.";
    case "dark-glam":
      return "Palette/style variant: dark glam contrast, deeper shadows, glossy lips.";
    case "neon-night":
      return "Palette/style variant: neon-night — deep navy shadows with cyan rim light.";
    default:
      return "Palette/style variant: JuicyChat-class cel shading, soft blush, thin rim light.";
  }
}

function clothingDirective(c: CompanionClothing): string {
  switch (c) {
    case "casual":
      return "Clothing: casual soft tee and shorts, full-body visible.";
    case "dress":
      return "Clothing: flirty cocktail dress, full-body standing.";
    case "goth":
      return "Clothing: black gothic lace / straps, full-body.";
    case "swimsuit":
      return "Clothing: slim fashionable bikini, full-body.";
    case "nude":
      return [
        "Clothing: NUDE — adults 18+ only, fully nude explicit anime companion.",
        "Tasteful erotic illustrated nude, not photoreal pornography; no minors; keep face identity from Image 1.",
        "FULL-BODY standing head-to-toe framing (not bust crop).",
      ].join(" ");
    default:
      return "Clothing: delicate lingerie / lace, sexy companion attire, full-body visible.";
  }
}

/** Extra prompt clauses for Companion wardrobe (appended to cartoon base prompt). */
export function companionWardrobePromptBits(
  wardrobe: CompanionWardrobe,
  museLooks?: string,
): string {
  const w = normalizeWardrobe(wardrobe);
  const looksBit = museLooks?.trim()
    ? `Muse profile looks notes (honor when consistent with Image 1): ${museLooks.trim().slice(0, 280)}.`
    : "";
  return [
    "FRAMING: FULL-LENGTH standing anime companion — head-to-toe in frame (feet and head visible), Ani-like vertical scale, not a bust/portrait crop.",
    "CUSTOMIZE (adults 18+ only — Image 1 face identity absolute; from-photo traits MUST match the Muse photo, never invent conflicting colors):",
    eyeColorDirective(w.eyeColor),
    hairColorDirective(w.hairColor),
    hairStyleDirective(w.hairStyle),
    skinToneDirective(w.skinTone),
    bodyTypeDirective(w.bodyType),
    bustDirective(w.bust),
    expressionDirective(w.expression),
    lookDirective(w.look),
    clothingDirective(w.clothing),
    looksBit,
  ]
    .filter(Boolean)
    .join(" ");
}
