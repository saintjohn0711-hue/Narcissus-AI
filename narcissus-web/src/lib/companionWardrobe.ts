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
  | "petite"
  | "plus-curvy"
  | "chubby"
  | "soft-thick";

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
  | "corset"
  | "stockings-garter"
  | "corset-stockings"
  | "lace-teddy"
  | "babydoll"
  | "sheer-robe"
  | "micro-bikini"
  | "body-stocking"
  | "pvc"
  | "leather"
  | "dominatrix"
  | "leather-harness"
  | "silk-slip"
  | "strap-on"
  | "dildo"
  | "vibrator"
  | "collar-leash"
  | "ball-gag"
  | "casual"
  | "dress"
  | "goth"
  | "swimsuit"
  | "nude";

/** Strap-on size — only used when clothing is strap-on. */
export type CompanionToySize = "small" | "medium" | "large" | "xl";

/** Strap-on / toy accent color — only used when clothing is strap-on. */
export type CompanionToyColor =
  | "black"
  | "pink"
  | "purple"
  | "red"
  | "clear"
  | "blue";

/** Full-body pose for generate / adjust. */
export type CompanionPose =
  | "standing"
  | "sitting"
  | "leaning"
  | "all-fours"
  | "over-shoulder"
  | "legs-crossed";

/** Optional sexy prop held or worn — none by default. */
export type CompanionProp =
  | "none"
  | "wine-glass"
  | "handcuffs"
  | "riding-crop"
  | "pearl-necklace"
  | "phone-selfie";

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
  toySize: CompanionToySize;
  toyColor: CompanionToyColor;
  pose: CompanionPose;
  prop: CompanionProp;
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
  /** Casual first — lingerie/nude via Adjust after a finished Companion exists
   * (xAI text-to-image often moderates NSFW on cold generate). */
  clothing: "casual",
  toySize: "medium",
  toyColor: "black",
  pose: "standing",
  prop: "none",
};

type Opt<T extends string> = {
  id: T;
  label: string;
  hint: string;
  /** Optional CSS swatch for color chips */
  swatch?: string;
};

export const COMPANION_EYE_COLOR: Opt<CompanionEyeColor>[] = [
  { id: "from-photo", label: "Natural", hint: "Default / likeness when locked" },
  { id: "brown", label: "Brown", hint: "Warm brown", swatch: "#6b3f2a" },
  { id: "hazel", label: "Hazel", hint: "Green-brown", swatch: "#8a6b3d" },
  { id: "green", label: "Green", hint: "Clear green", swatch: "#3d7a4a" },
  { id: "blue", label: "Blue", hint: "Clear blue", swatch: "#3a6ea5" },
  { id: "gray", label: "Gray", hint: "Cool gray", swatch: "#7a8490" },
  { id: "amber", label: "Amber", hint: "Golden amber", swatch: "#c4872a" },
];

export const COMPANION_HAIR_COLOR: Opt<CompanionHairColor>[] = [
  { id: "from-photo", label: "Natural", hint: "Default / likeness when locked" },
  { id: "blonde", label: "Blonde", hint: "Light blonde", swatch: "#e6d0a0" },
  { id: "brunette", label: "Brunette", hint: "Warm brown", swatch: "#5c3a22" },
  { id: "black", label: "Black", hint: "Deep black", swatch: "#1a1a1c" },
  { id: "red", label: "Red", hint: "Bright red", swatch: "#c04030" },
  { id: "auburn", label: "Auburn", hint: "Red-brown", swatch: "#8b3a2a" },
  { id: "silver", label: "Silver", hint: "Silver/white", swatch: "#c8ccd2" },
];

export const COMPANION_HAIR_STYLE: Opt<CompanionHairStyle>[] = [
  { id: "from-photo", label: "Natural", hint: "Default length/style" },
  { id: "short", label: "Short", hint: "Chin or shorter" },
  { id: "medium", label: "Medium", hint: "Shoulder length" },
  { id: "long", label: "Long", hint: "Past shoulders" },
  { id: "ponytail", label: "Ponytail", hint: "Tied back" },
  { id: "bob", label: "Bob", hint: "Clean bob" },
  { id: "wavy-long", label: "Wavy long", hint: "Long soft waves" },
];

export const COMPANION_SKIN_TONE: Opt<CompanionSkinTone>[] = [
  { id: "from-photo", label: "Natural", hint: "Default / likeness when locked" },
  { id: "fair", label: "Fair", hint: "Very light", swatch: "#f3e0d0" },
  { id: "light", label: "Light", hint: "Light warm", swatch: "#e8c4a8" },
  { id: "medium", label: "Medium", hint: "Medium tone", swatch: "#c9956c" },
  { id: "olive", label: "Olive", hint: "Olive undertone", swatch: "#b89268" },
  { id: "tan", label: "Tan", hint: "Sun-kissed", swatch: "#a67a4a" },
  { id: "deep", label: "Deep", hint: "Deep rich", swatch: "#6b3f2a" },
];

export const COMPANION_BODY_TYPE: Opt<CompanionBodyType>[] = [
  { id: "from-photo", label: "Natural", hint: "Default figure" },
  { id: "slim", label: "Slim", hint: "Slender lines" },
  { id: "athletic", label: "Athletic", hint: "Toned" },
  { id: "soft-curves", label: "Soft curves", hint: "Gentle curves" },
  { id: "curvy", label: "Curvy", hint: "Full curves" },
  { id: "petite", label: "Petite", hint: "Small frame" },
  { id: "plus-curvy", label: "Plus curvy", hint: "Fuller hourglass" },
  { id: "chubby", label: "Chubby", hint: "Soft chubby figure" },
  { id: "soft-thick", label: "Soft thick", hint: "Thick soft thighs & hips" },
];

export const COMPANION_BUST: Opt<CompanionBust>[] = [
  { id: "from-photo", label: "Natural", hint: "Default proportions" },
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
  { id: "lingerie", label: "Lingerie", hint: "Lace / intimate set" },
  { id: "corset", label: "Corset", hint: "Bustier / waist cinch" },
  { id: "stockings-garter", label: "Stockings", hint: "Garter + sheer hose" },
  {
    id: "corset-stockings",
    label: "Corset & stockings",
    hint: "Structured corset + sheer stockings set",
  },
  { id: "lace-teddy", label: "Lace teddy", hint: "One-piece lace" },
  { id: "babydoll", label: "Babydoll", hint: "Sheer short nightie" },
  { id: "sheer-robe", label: "Sheer robe", hint: "Open peignoir" },
  { id: "micro-bikini", label: "Micro bikini", hint: "Sling / tiny set" },
  {
    id: "body-stocking",
    label: "Body stocking",
    hint: "Sheer one-piece bodystocking",
  },
  { id: "pvc", label: "PVC", hint: "Shiny PVC catsuit / dress" },
  { id: "leather", label: "Leather", hint: "Black leather outfit" },
  {
    id: "dominatrix",
    label: "Dominatrix",
    hint: "Latex/leather dominant look",
  },
  { id: "leather-harness", label: "Harness", hint: "Leather straps" },
  { id: "silk-slip", label: "Silk slip", hint: "Bias silk chemise" },
  {
    id: "strap-on",
    label: "Strap-on",
    hint: "Harness + toy — pick size & color (Comfy)",
  },
  {
    id: "dildo",
    label: "Dildo",
    hint: "Handheld toy — size & color (Comfy)",
  },
  {
    id: "vibrator",
    label: "Vibrator",
    hint: "Wand vibrator — size & color (Comfy)",
  },
  {
    id: "collar-leash",
    label: "Collar + leash",
    hint: "Choker collar with leash",
  },
  {
    id: "ball-gag",
    label: "Ball gag",
    hint: "Ball gag + soft restraints vibe",
  },
  { id: "casual", label: "Casual", hint: "Soft tee & shorts" },
  { id: "dress", label: "Dress", hint: "Flirty cocktail" },
  { id: "goth", label: "Goth", hint: "Black lace / straps" },
  { id: "swimsuit", label: "Swimsuit", hint: "Slim bikini" },
  { id: "nude", label: "Nude", hint: "Adults 18+ explicit" },
];

export const COMPANION_TOY_SIZE: Opt<CompanionToySize>[] = [
  { id: "small", label: "Small", hint: "Petite toy" },
  { id: "medium", label: "Medium", hint: "Average" },
  { id: "large", label: "Large", hint: "Substantial" },
  { id: "xl", label: "XL", hint: "Extra large" },
];

export const COMPANION_TOY_COLOR: Opt<CompanionToyColor>[] = [
  { id: "black", label: "Black", hint: "Matte black", swatch: "#1a1a1c" },
  { id: "pink", label: "Pink", hint: "Hot pink", swatch: "#e85a9b" },
  { id: "purple", label: "Purple", hint: "Deep purple", swatch: "#7b3fa0" },
  { id: "red", label: "Red", hint: "Cherry red", swatch: "#c04030" },
  { id: "clear", label: "Clear", hint: "Translucent", swatch: "#c8d4e0" },
  { id: "blue", label: "Blue", hint: "Electric blue", swatch: "#3a6ea5" },
];

export const COMPANION_POSES: Opt<CompanionPose>[] = [
  { id: "standing", label: "Standing", hint: "Full-body stand" },
  { id: "sitting", label: "Sitting", hint: "Seated pose" },
  { id: "leaning", label: "Leaning", hint: "Lean on a surface" },
  { id: "all-fours", label: "All fours", hint: "On hands and knees" },
  { id: "over-shoulder", label: "Over shoulder", hint: "Look back at viewer" },
  { id: "legs-crossed", label: "Legs crossed", hint: "Seated legs crossed" },
];

export const COMPANION_PROPS: Opt<CompanionProp>[] = [
  { id: "none", label: "None", hint: "No prop" },
  { id: "wine-glass", label: "Wine glass", hint: "Holding a wine glass" },
  { id: "handcuffs", label: "Handcuffs", hint: "Cuffs as sexy prop" },
  { id: "riding-crop", label: "Riding crop", hint: "Holding a crop" },
  { id: "pearl-necklace", label: "Pearls", hint: "Pearl necklace" },
  { id: "phone-selfie", label: "Phone", hint: "Selfie phone pose" },
];

/** True when clothing is fully nude (no garments). */
export function isNudeClothing(c: CompanionClothing | string | undefined): boolean {
  return c === "nude";
}

/** Soft / everyday looks that should stay xAI-friendly (no fetish language). */
export function isSoftClothing(
  c: CompanionClothing | string | undefined,
): boolean {
  return (
    c === "lingerie" ||
    c === "casual" ||
    c === "dress" ||
    c === "swimsuit" ||
    c === "silk-slip" ||
    c === "babydoll" ||
    c === "lace-teddy" ||
    !c
  );
}

/** Fetish / explicit outfits — Comfy fallback when xAI moderates. */
export function isFetishClothing(
  c: CompanionClothing | string | undefined,
): boolean {
  return (
    c === "strap-on" ||
    c === "dildo" ||
    c === "vibrator" ||
    c === "collar-leash" ||
    c === "ball-gag" ||
    c === "leather-harness" ||
    c === "pvc" ||
    c === "leather" ||
    c === "dominatrix" ||
    c === "body-stocking" ||
    c === "corset-stockings"
  );
}

/**
 * Sex toys that soft-censor on xAI and on person-img2img — route Comfy-first
 * via /api/jobs mode=toy (product txt2img + masked composite).
 */
export function isSexToyClothing(
  c: CompanionClothing | string | undefined,
): boolean {
  return c === "strap-on" || c === "dildo" || c === "vibrator";
}

/** True when size/color chips should show. */
export function clothingUsesToyOptions(
  c: CompanionClothing | string | undefined,
): boolean {
  return isSexToyClothing(c);
}

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
    toySize: isId(src.toySize, COMPANION_TOY_SIZE) ? src.toySize! : d.toySize,
    toyColor: isId(src.toyColor, COMPANION_TOY_COLOR)
      ? src.toyColor!
      : d.toyColor,
    pose: isId(src.pose, COMPANION_POSES) ? src.pose! : d.pose,
    prop: isId(src.prop, COMPANION_PROPS) ? src.prop! : d.prop,
  };
}

export function wardrobeKey(w: CompanionWardrobe): string {
  const n = normalizeWardrobe(w);
  const toyBit = isSexToyClothing(n.clothing)
    ? `${n.toySize}.${n.toyColor}`
    : "none";
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
    toyBit,
    n.pose,
    n.prop,
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

function eyeColorDirective(c: CompanionEyeColor, hasRef: boolean): string {
  if (c === "from-photo") {
    return hasRef
      ? "Eye color: EXACT iris color from Image 1 — do not invent a different color."
      : "Eye color: natural flattering anime irises that fit the character.";
  }
  return hasRef
    ? `Eye color: ${c} irises (user override), keep eye spacing/character from Image 1.`
    : `Eye color: ${c} irises.`;
}

function hairColorDirective(c: CompanionHairColor, hasRef: boolean): string {
  if (c === "from-photo") {
    return hasRef
      ? "Hair color: EXACT hair color from Image 1 — do not invent a different dye."
      : "Hair color: natural flattering anime hair color for the character.";
  }
  return hasRef
    ? `Hair color: ${c} (user override), keep hairline/parting character from Image 1.`
    : `Hair color: ${c}.`;
}

function hairStyleDirective(s: CompanionHairStyle, hasRef: boolean): string {
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
      return hasRef
        ? "Hair style/length: match Image 1 exactly (length, parting, hairline)."
        : "Hair style: long soft anime waves with volume (default).";
  }
}

function skinToneDirective(s: CompanionSkinTone, hasRef: boolean): string {
  if (s === "from-photo") {
    return hasRef
      ? "Skin tone: EXACT undertone from Image 1."
      : "Skin tone: soft natural illustrated anime skin.";
  }
  return hasRef
    ? `Skin tone: ${s} illustrated skin (user override), still recognizably her.`
    : `Skin tone: ${s} illustrated skin.`;
}

function bodyTypeDirective(b: CompanionBodyType, hasRef: boolean): string {
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
    case "plus-curvy":
      return "Body type: plus-size curvy hourglass — fuller bust, soft waist, wide hips, clearly fuller than slim, full-body.";
    case "chubby":
      return "Body type: chubby soft round figure — soft belly, chubby cheeks optional, plush arms/thighs, cute fuller anime companion, full-body.";
    case "soft-thick":
      return "Body type: soft thick — thick thighs, soft hips, plush butt and tummy, strong curves without looking skinny, full-body.";
    default:
      return hasRef
        ? "Body type: preserve her proportions from Image 1 in a full-body pose."
        : "Body type: elegant soft-curves anime companion silhouette, full-body.";
  }
}

function bustDirective(b: CompanionBust, hasRef: boolean): string {
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
      return hasRef
        ? "Bust: match her bust proportions from Image 1."
        : "Bust: natural medium anime proportions.";
  }
}

function expressionDirective(x: CompanionExpression): string {
  switch (x) {
    case "flirty-smile":
      return "Expression: warm smile, looking at the viewer.";
    case "playful-pout":
      return "Expression: playful soft pout, friendly companion energy.";
    case "intimate":
      return "Expression: close warm gaze, gentle eye contact (tasteful).";
    default:
      return "Expression: soft gentle gaze toward the viewer.";
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

function poseDirective(p: CompanionPose, soft: boolean): string {
  switch (p) {
    case "sitting":
      return soft
        ? "POSE: sitting on a simple seat, full body visible, composed posture."
        : "POSE: sitting on a simple seat, full body visible, composed posture.";
    case "leaning":
      return "POSE: leaning against a wall or railing, weight on one hip, full body visible.";
    case "all-fours":
      // Soft outfits: never send all-fours to xAI — it trips moderation with lingerie.
      return soft
        ? "POSE: standing full-body, natural weight shift, head-to-toe in frame."
        : "POSE: on all fours (hands and knees), arched back, looking toward the viewer, full body visible adults 18+.";
    case "over-shoulder":
      return "POSE: standing or half-turned, looking back over one shoulder at the viewer, full body visible.";
    case "legs-crossed":
      return "POSE: seated with legs crossed, elegant posture, full body visible.";
    default:
      return "POSE: standing full-body, natural weight shift, head-to-toe in frame.";
  }
}

function propDirective(p: CompanionProp): string {
  switch (p) {
    case "wine-glass":
      return "PROP: holding a wine glass in one hand (clearly visible).";
    case "handcuffs":
      return "PROP: metal handcuffs as a sexy accessory (held or loosely worn on wrists) — adults 18+.";
    case "riding-crop":
      return "PROP: holding a slim black riding crop — sexy prop, not violence.";
    case "pearl-necklace":
      return "PROP: wearing a classic pearl necklace.";
    case "phone-selfie":
      return "PROP: holding a smartphone in a casual selfie / mirror-selfie pose.";
    default:
      return "";
  }
}

function toySizeLabel(s: CompanionToySize): string {
  switch (s) {
    case "small":
      return "small";
    case "large":
      return "large";
    case "xl":
      return "extra-large XL";
    default:
      return "medium";
  }
}

function toyColorLabel(c: CompanionToyColor): string {
  switch (c) {
    case "pink":
      return "hot pink";
    case "purple":
      return "deep purple";
    case "red":
      return "cherry red";
    case "clear":
      return "clear translucent";
    case "blue":
      return "electric blue";
    default:
      return "matte black";
  }
}

function clothingDirective(
  c: CompanionClothing,
  toySize: CompanionToySize = "medium",
  toyColor: CompanionToyColor = "black",
): string {
  switch (c) {
    case "casual":
      return "Clothing: casual soft tee and shorts, full-body visible, tasteful anime fashion.";
    case "dress":
      return "Clothing: elegant cocktail dress, full-body standing, tasteful anime fashion.";
    case "goth":
      return "Clothing: black gothic lace fashion look, full-body.";
    case "swimsuit":
      return "Clothing: fashionable swimsuit / bikini, beach-ready anime look, full-body.";
    case "corset":
      return "Clothing: structured corset / bustier fashion piece, full-body standing.";
    case "stockings-garter":
      return "Clothing: coordinated lingerie with sheer stockings and garter belt, elegant anime fashion, full-body.";
    case "corset-stockings":
      return "Clothing: structured corset paired with sheer stockings and garter straps as one clear set, elegant anime fashion, full-body.";
    case "body-stocking":
      return "Clothing: sheer one-piece body stocking covering torso and legs, stylized anime fashion, full-body.";
    case "pvc":
      return "Clothing: shiny black PVC catsuit or tight PVC dress, high-gloss vinyl fashion, full-body standing adults 18+.";
    case "leather":
      return "Clothing: fitted black leather outfit (leather dress or leather bustier + pants), full-body standing adults 18+.";
    case "dominatrix":
      return [
        "CLOTHING (adults 18+): dominatrix-inspired fashion — black latex or leather look,",
        "thigh-high boots, gloves, optional harness accents,",
        "full-body standing, premium companion illustration. No minors.",
      ].join(" ");
    case "lace-teddy":
      return "Clothing: lace teddy one-piece, elegant anime lingerie fashion, full-body.";
    case "babydoll":
      return "Clothing: soft babydoll nightie, short hem, elegant anime fashion, full-body.";
    case "sheer-robe":
      return "Clothing: sheer peignoir / robe over lingerie, elegant anime fashion, full-body.";
    case "micro-bikini":
      return "Clothing: micro bikini fashion set, stylized anime look, full-body.";
    case "leather-harness":
      return "Clothing: black leather body harness straps (fashion harness), full-body standing adults 18+.";
    case "silk-slip":
      return "Clothing: bias-cut silk slip chemise, thin straps, elegant anime fashion, full-body.";
    case "strap-on":
      return [
        `CLOTHING (adults 18+ fetish): adult anime companion wearing a strap-on harness with a clearly visible ${toySizeLabel(toySize)} ${toyColorLabel(toyColor)} strap-on dildo attached at the hips.`,
        "Show the full harness straps around hips/waist and the toy silhouette — not censored, not hidden behind fabric.",
        "Optional minimal lingerie under the harness OK. Full-body standing, premium anime illustration (not photoreal). No minors.",
      ].join(" ");
    case "dildo":
      return [
        `PROP (adults 18+): adult anime companion holding a clearly visible ${toySizeLabel(toySize)} ${toyColorLabel(toyColor)} silicone dildo.`,
        "Toy fully visible — not censored. Full-body, premium anime illustration. No minors.",
      ].join(" ");
    case "vibrator":
      return [
        `PROP (adults 18+): adult anime companion holding a clearly visible ${toySizeLabel(toySize)} ${toyColorLabel(toyColor)} vibrator wand.`,
        "Toy fully visible — not censored. Full-body, premium anime illustration. No minors.",
      ].join(" ");
    case "collar-leash":
      return [
        "CLOTHING (adults 18+ fetish): adult anime companion in sensual lingerie with a fitted collar and attached leash held or draped.",
        "Collar + leash clearly readable as fetish gear; elegant Ani-style illustration. Full-body standing. No minors.",
      ].join(" ");
    case "ball-gag":
      return [
        "CLOTHING (adults 18+ fetish): adult anime companion with a classic ball gag (strap around head, ball in mouth) plus soft wrist restraints / cuffs vibe.",
        "Fetish gear clearly illustrated, still premium sexy anime companion art — not gore. Full-body standing. No minors.",
      ].join(" ");
    case "nude":
      return [
        "CLOTHING: fully nude adult anime companion (18+), tasteful illustrated figure study — bare skin, no lingerie, no towels, no steam bars.",
        "Same character identity; standing full-length head-to-toe. Premium anime illustration (not photoreal porn). No minors.",
      ].join(" ");
    default:
      // Lingerie — keep soft for xAI; avoid fetish-adjacent wording.
      return "Clothing: delicate lace lingerie matching set, elegant anime companion fashion, tasteful full-body illustration.";
  }
}

export type WardrobePromptMode = "scratch" | "adjust" | "likeness";

/** Extra prompt clauses for Companion wardrobe (appended to cartoon base prompt). */
export function companionWardrobePromptBits(
  wardrobe: CompanionWardrobe,
  museLooks?: string,
  mode: WardrobePromptMode = "likeness",
): string {
  const w = normalizeWardrobe(wardrobe);
  const hasRef = mode === "likeness" || mode === "adjust";
  const looksBit = museLooks?.trim()
    ? mode === "scratch"
      ? `Character vibe notes: ${museLooks.trim().slice(0, 280)}.`
      : `Looks notes (honor when consistent with Image 1): ${museLooks.trim().slice(0, 280)}.`
    : "";
  const customizeLead =
    mode === "scratch"
      ? "DESIGN (adults 18+): invent a cohesive Ani/JuicyChat-class companion from these traits — no real photo required."
      : mode === "adjust"
        ? "ADJUST (adults 18+): keep the SAME illustrated companion identity from Image 1; apply trait/outfit changes only."
        : "CUSTOMIZE (adults 18+ — Image 1 face identity absolute; Natural traits match the Muse photo):";
  const soft = isSoftClothing(w.clothing);
  return [
    "FRAMING: FULL-LENGTH anime companion — head-to-toe in frame (feet and head visible), Ani-like vertical scale, not a bust/portrait crop.",
    customizeLead,
    eyeColorDirective(w.eyeColor, hasRef),
    hairColorDirective(w.hairColor, hasRef),
    hairStyleDirective(w.hairStyle, hasRef),
    skinToneDirective(w.skinTone, hasRef),
    bodyTypeDirective(w.bodyType, hasRef),
    bustDirective(w.bust, hasRef),
    expressionDirective(w.expression),
    lookDirective(w.look),
    clothingDirective(w.clothing, w.toySize, w.toyColor),
    poseDirective(w.pose, soft),
    // Soft outfits: skip handcuffs/crop props in the xAI prompt (fetish-adjacent).
    soft &&
    (w.prop === "handcuffs" || w.prop === "riding-crop")
      ? ""
      : propDirective(w.prop),
    looksBit,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Prompt for Comfy /api/jobs when xAI moderates fetish (or Nude undress).
 * FaceID + epicrealism custom/undress — never a CSS fake.
 */
export function comfyWardrobeEditPrompt(wardrobe: CompanionWardrobe): string {
  const w = normalizeWardrobe(wardrobe);
  const fetishBit = isFetishClothing(w.clothing)
    ? "explicit fetish gear fully visible, not censored, not replaced with lingerie, not hidden"
    : "";
  return [
    "photorealistic adult woman, same face identity as reference, coherent anatomy",
    clothingDirective(w.clothing, w.toySize, w.toyColor),
    fetishBit,
    poseDirective(w.pose, isSoftClothing(w.clothing)),
    propDirective(w.prop),
    "clean background, adults 18+, no minors, no watermark",
  ]
    .filter(Boolean)
    .join(", ");
}
