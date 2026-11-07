/**
 * Muse chat presence — style ids, CSS look maps, and local portrait cache.
 * Optional xAI image edit via /api/art-of-x/muse-portrait (no Comfy).
 */

import {
  companionWardrobePromptBits,
  wardrobeKey,
  type CompanionWardrobe,
  type WardrobePromptMode,
} from "@/lib/companionWardrobe";

/** How Companion images are produced. */
export type CompanionGenMode = "generate" | "adjust" | "likeness";

export type MusePresenceStyle =
  | "realistic"
  | "soft-glam"
  | "anime"
  | "cartoon"
  | "cyberpunk";

/** AI chat / Muse presence default Look — Ani-style Companion (not Realistic). */
export const DEFAULT_MUSE_PRESENCE_STYLE: MusePresenceStyle = "cartoon";

export const MUSE_PRESENCE_STYLES: Array<{
  id: MusePresenceStyle;
  label: string;
  blurb: string;
  /** Auto-request xAI restyle when picked (if photo + no cache). */
  autoGenerate?: boolean;
}> = [
  {
    id: "cartoon",
    label: "Companion",
    blurb: "Design an anime companion",
    /** From-scratch Generate is manual — no photo required. */
    autoGenerate: false,
  },
  {
    id: "realistic",
    label: "Realistic",
    blurb: "Your photo, living breath",
  },
  {
    id: "soft-glam",
    label: "Soft glam",
    blurb: "Warm rose-gold light",
    autoGenerate: true,
  },
  {
    id: "anime",
    label: "Anime match",
    blurb: "Her face → sexy anime",
    autoGenerate: true,
  },
  {
    id: "cyberpunk",
    label: "Cyber neon",
    blurb: "Navy + electric blue",
    autoGenerate: true,
  },
];

/** Public style-ref used as second xAI edit image for Companion / Anime. */
export const MUSE_ANIME_STYLE_REF_PATH = "/muse-styles/juichat-anime-ref.jpg";

const VALID_STYLES: MusePresenceStyle[] = [
  "realistic",
  "soft-glam",
  "anime",
  "cartoon",
  "cyberpunk",
];

export function isMusePresenceStyle(v: string): v is MusePresenceStyle {
  return (VALID_STYLES as string[]).includes(v);
}

const STYLE_STORAGE = "narcissus.artOfX.musePresenceStyle.v1";
/** v7: from-scratch Companion cache (scratch fp) + clothing-aware bust. */
const PORTRAIT_STORAGE = "narcissus.artOfX.musePresencePortraits.v7";

/** Cache fingerprint when Companion is designed without a Muse photo. */
export const COMPANION_SCRATCH_FP = "scratch";

export function loadPresenceStyle(partnerId: number): MusePresenceStyle {
  if (typeof window === "undefined") return DEFAULT_MUSE_PRESENCE_STYLE;
  try {
    const raw = localStorage.getItem(STYLE_STORAGE);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    const v = map[String(partnerId)];
    if (typeof v === "string" && isMusePresenceStyle(v)) {
      return v;
    }
  } catch {
    // ignore
  }
  // First visit / no saved Look → Companion (Ani-style). Explicit picks persist.
  return DEFAULT_MUSE_PRESENCE_STYLE;
}

export function savePresenceStyle(
  partnerId: number,
  style: MusePresenceStyle,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STYLE_STORAGE);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[String(partnerId)] = style;
    localStorage.setItem(STYLE_STORAGE, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

type PortraitCache = Record<string, string>;

/** Short stable fingerprint so cache invalidates when the Muse photo changes. */
export function photoFingerprint(photo: string | null | undefined): string {
  if (!photo) return "none";
  const len = photo.length;
  const head = photo.slice(0, 48);
  const mid = photo.slice(Math.floor(len / 2), Math.floor(len / 2) + 24);
  const tail = photo.slice(-24);
  let h = 2166136261;
  const s = `${len}:${head}:${mid}:${tail}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function portraitKey(
  partnerId: number,
  style: MusePresenceStyle,
  photoFp: string,
  wardrobeFp = "",
): string {
  return wardrobeFp
    ? `${partnerId}:${style}:${photoFp}:${wardrobeFp}`
    : `${partnerId}:${style}:${photoFp}`;
}

export function loadCachedPortrait(
  partnerId: number,
  style: MusePresenceStyle,
  photo?: string | null,
  wardrobe?: CompanionWardrobe | null,
  /** When true (default Companion), cache under scratch fp not Muse photo. */
  scratch = false,
): string | null {
  if (typeof window === "undefined") return null;
  if (style === "realistic") return null;
  try {
    const raw = localStorage.getItem(PORTRAIT_STORAGE);
    const map = raw ? (JSON.parse(raw) as PortraitCache) : {};
    const fp =
      style === "cartoon" && scratch
        ? COMPANION_SCRATCH_FP
        : photoFingerprint(photo);
    const wFp =
      style === "cartoon" && wardrobe ? wardrobeKey(wardrobe) : "";
    const url = map[portraitKey(partnerId, style, fp, wFp)];
    return typeof url === "string" && url.startsWith("data:image/")
      ? url
      : null;
  } catch {
    return null;
  }
}

export function saveCachedPortrait(
  partnerId: number,
  style: MusePresenceStyle,
  dataUrl: string,
  photo?: string | null,
  wardrobe?: CompanionWardrobe | null,
  scratch = false,
): void {
  if (typeof window === "undefined") return;
  if (style === "realistic") return;
  try {
    const raw = localStorage.getItem(PORTRAIT_STORAGE);
    const map = raw ? (JSON.parse(raw) as PortraitCache) : {};
    const fp =
      style === "cartoon" && scratch
        ? COMPANION_SCRATCH_FP
        : photoFingerprint(photo);
    const wFp =
      style === "cartoon" && wardrobe ? wardrobeKey(wardrobe) : "";
    map[portraitKey(partnerId, style, fp, wFp)] = dataUrl;
    const keys = Object.keys(map);
    if (keys.length > 36) {
      for (const k of keys.slice(0, keys.length - 28)) {
        delete map[k];
      }
    }
    localStorage.setItem(PORTRAIT_STORAGE, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

/**
 * Drop cached Companion portraits for this Muse when clothing changes
 * so a clothed render is never shown under a new clothing (esp. nude) key.
 */
export function bustCompanionClothingCache(
  partnerId: number,
  photo?: string | null,
  scratch = true,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PORTRAIT_STORAGE);
    if (!raw) return;
    const map = JSON.parse(raw) as PortraitCache;
    const fps = scratch
      ? [COMPANION_SCRATCH_FP]
      : [photoFingerprint(photo), COMPANION_SCRATCH_FP];
    let changed = false;
    for (const fp of fps) {
      const prefix = `${partnerId}:cartoon:${fp}:`;
      for (const k of Object.keys(map)) {
        if (k.startsWith(prefix)) {
          delete map[k];
          changed = true;
        }
      }
    }
    try {
      localStorage.removeItem("narcissus.artOfX.musePresencePortraits.v5");
      localStorage.removeItem("narcissus.artOfX.musePresencePortraits.v6");
    } catch {
      // ignore
    }
    if (changed) localStorage.setItem(PORTRAIT_STORAGE, JSON.stringify(map));
  } catch {
    // ignore
  }
}

const COMPANION_QUALITY_BAR =
  "QUALITY BAR: high-end modern anime/manga illustration — crisp dark outlines, smooth cel shading with soft gradients, luminous multi-tone irises + catchlights, clean skin, glossy lips, polished hair strands with subtle rim light, coherent full-body proportions.";

/**
 * Prompt for xAI image edit / generation.
 * Companion default is from-scratch design; likeness + adjust are optional.
 */
export function styleEditPrompt(
  style: MusePresenceStyle,
  museName: string,
  looks?: string,
  wardrobe?: CompanionWardrobe | null,
  companionMode: CompanionGenMode = "likeness",
): string {
  const looksBit = looks?.trim()
    ? ` Match these notes exactly where visible: ${looks.trim().slice(0, 320)}.`
    : "";

  switch (style) {
    case "soft-glam":
      return [
        `Edit this reference photo of adult ${museName} into soft glam editorial photography.`,
        `IDENTITY LOCK: keep the exact same face structure, eye shape, nose, mouth, skin tone, hair color, hair length/style, body proportions, and pose family from the reference — she must be recognizably the same person.`,
        `Look: warm rose-gold rim light, creamy skin, subtle metallic copper highlights, sensual premium fashion still.${looksBit}`,
        `Adults 18+ only. Single portrait, no collage, no text.`,
      ].join(" ");
    case "anime":
      return [
        `Image 1 is the identity photo of adult ${museName}. Image 2 (when present) is the STYLE reference — match that illustration language, not Image 2's face.`,
        `Restyle Image 1 into a high-end modern anime / manga companion portrait of the SAME woman.`,
        `CRITICAL IDENTITY LOCK from Image 1: forehead, brow, eye spacing/shape/color, nose bridge, lips, jawline, cheekbones, skin undertone, hair color, hairline, hair length and parting. Do NOT invent a generic anime face or copy the style-ref character's face.`,
        `Art direction (JuicyChat-class): clean dark ink outlines, soft cel shading with gentle skin gradients, large luminous expressive anime eyes with multi-tone irises and catchlights, soft pink blush on cheeks and nose bridge, thin rim light on hair and shoulder, intimate medium close-up bust/portrait, sexy but clearly 2D illustrated anime — not photoreal, not a photo filter, not posterize.`,
        `Same woman as Image 1, rendered as premium sexy anime.${looksBit}`,
        `Adults 18+ only. Single portrait, no watermark, no text, no UI chrome.`,
      ].join(" ");
    case "cartoon":
      return companionPrompt(museName, looks, wardrobe, companionMode);
    case "cyberpunk":
      return [
        `Edit this reference photo of adult ${museName} into cyberpunk neon glamour.`,
        `IDENTITY LOCK: same face, hair, body, and pose family as the reference — clearly the same person.`,
        `Look: deep navy shadows, electric cyan rim light, subtle rose-gold metal accents, rain-haze bokeh, sensual futuristic still.${looksBit}`,
        `Adults 18+ only. Single portrait, no text.`,
      ].join(" ");
    default:
      return `Photorealistic portrait of ${museName}, same person as the reference.${looksBit}`;
  }
}

function companionPrompt(
  museName: string,
  looks: string | undefined,
  wardrobe: CompanionWardrobe | null | undefined,
  mode: CompanionGenMode,
): string {
  const wardrobeMode: WardrobePromptMode =
    mode === "generate" ? "scratch" : mode === "adjust" ? "adjust" : "likeness";
  const wardrobeBits = wardrobe
    ? companionWardrobePromptBits(wardrobe, looks, wardrobeMode)
    : "FRAMING: FULL-LENGTH standing head-to-toe companion.";
  const looksBit = looks?.trim()
    ? ` Character notes: ${looks.trim().slice(0, 320)}.`
    : "";

  if (mode === "generate") {
    return [
      `Create a brand-new premium FULL-LENGTH standing anime companion named ${museName} in JuicyChat / Grok Ani class — invent her face and body from the design traits (no real photograph).`,
      `Vertical 9:16, crown-to-feet visible, flirty eye contact, elegant stance. Sexy illustrated anime — not photoreal, not 3D doll, not chibi.`,
      COMPANION_QUALITY_BAR,
      `FORBIDDEN: photoreal selfie, watermark, signature, UI chrome, text, collage.${looksBit}`,
      wardrobeBits,
      `Adults 18+ only. Single full-body standing figure on a clean simple background.`,
    ].join(" ");
  }

  if (mode === "adjust") {
    return [
      `Image 1 is the CURRENT illustrated companion of adult ${museName}. Image 2 (when present) is STYLE craft only — ignore Image 2 face/outfit.`,
      `Redraw her as the SAME anime companion with the requested trait/outfit updates — keep face identity, hair vibe, and body continuity from Image 1 unless the user overrode those traits.`,
      `FULL-LENGTH standing 9:16, crown-to-feet. Do not switch to a different character.`,
      COMPANION_QUALITY_BAR,
      `FORBIDDEN: photoreal conversion, watermark, text, collage.${looksBit}`,
      wardrobeBits,
      `Adults 18+ only. Single full-body standing figure on a clean simple background.`,
    ].join(" ");
  }

  // likeness — optional Muse photo lock
  return [
    `Image 1 is the likeness photo of adult ${museName}. Image 2 (when present) is STYLE ONLY — JuicyChat / Ani craft. Keep Image 1's face. NEVER copy Image 2's face, hair, body, or outfit.`,
    `Paint a premium FULL-LENGTH standing anime companion of the SAME woman: crown-to-feet in 9:16, flirty eye contact — NOT a bust crop, NOT a muddy photo filter.`,
    `CRITICAL IDENTITY LOCK from Image 1: facial proportions, eyes, nose, mouth, jaw, skin undertone, and Natural traits unless user overrode them.`,
    COMPANION_QUALITY_BAR,
    `FORBIDDEN: photoreal selfie, CSS posterize, 3D doll, chibi, collage, watermark, text.${looksBit}`,
    wardrobeBits,
    `Adults 18+ only. Single full-body standing figure on a clean simple background.`,
  ].join(" ");
}

/** Styles that attach the JuicyChat anime style-ref as a second edit image. */
export function styleUsesAnimeStyleRef(style: MusePresenceStyle): boolean {
  return style === "cartoon" || style === "anime";
}

type CanvasFallbackMode = "anime" | "cartoon";

/**
 * Client canvas fallback when xAI is unavailable.
 * Aims for cel outlines + flat fills — never a bare photo tint.
 * Callers MUST surface this as provisional, not as a finished Companion.
 */
export async function buildStyledCssFallback(
  photoDataUrl: string,
  mode: CanvasFallbackMode = "anime",
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const img = await loadImage(photoDataUrl);
    const maxW = 720;
    const scale = Math.min(1, maxW / img.width);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;
    const levels = mode === "cartoon" ? 5 : 6;
    const step = 255 / (levels - 1);

    // Flat cel fills
    for (let i = 0; i < d.length; i += 4) {
      let r = Math.round(d[i]! / step) * step;
      let g = Math.round(d[i + 1]! / step) * step;
      let b = Math.round(d[i + 2]! / step) * step;
      const avg = (r + g + b) / 3;
      if (mode === "cartoon") {
        // Warm skin bias + punchier companion palette
        r = Math.min(255, Math.round(avg + (r - avg) * 1.55 + 22));
        g = Math.min(255, Math.round(avg + (g - avg) * 1.2 + 10));
        b = Math.min(255, Math.round(avg + (b - avg) * 1.05 + 6));
      } else {
        r = Math.min(255, Math.round(r * 1.08 + 8));
        g = Math.min(255, Math.round(g * 1.02 + 2));
        b = Math.min(255, Math.round(b * 1.1 + 12));
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }

    // Sobel ink outlines — reads as illustrated, not a filtered photo
    const gray = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        gray[y * w + x] = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
      }
    }
    const edgeThresh = mode === "cartoon" ? 48 : 58;
    const ink = mode === "cartoon" ? 0.42 : 0.32;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx =
          -gray[(y - 1) * w + (x - 1)]! +
          gray[(y - 1) * w + (x + 1)]! +
          -2 * gray[y * w + (x - 1)]! +
          2 * gray[y * w + (x + 1)]! +
          -gray[(y + 1) * w + (x - 1)]! +
          gray[(y + 1) * w + (x + 1)]!;
        const gy =
          -gray[(y - 1) * w + (x - 1)]! -
          2 * gray[(y - 1) * w + x]! -
          gray[(y - 1) * w + (x + 1)]! +
          gray[(y + 1) * w + (x - 1)]! +
          2 * gray[(y + 1) * w + x]! +
          gray[(y + 1) * w + (x + 1)]!;
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag > edgeThresh) {
          const i = (y * w + x) * 4;
          const t = Math.min(1, (mag - edgeThresh) / 80) * ink;
          d[i] = Math.round(d[i]! * (1 - t));
          d[i + 1] = Math.round(d[i + 1]! * (1 - t));
          d[i + 2] = Math.round(d[i + 2]! * (1 - t));
        }
      }
    }

    ctx.putImageData(image, 0, 0);

    // Soft blush + rim glow (companion portrait mood)
    ctx.globalCompositeOperation = "soft-light";
    const grd = ctx.createRadialGradient(
      w * 0.5,
      h * 0.32,
      w * 0.06,
      w * 0.5,
      h * 0.38,
      w * 0.7,
    );
    if (mode === "cartoon") {
      grd.addColorStop(0, "rgba(255, 170, 200, 0.62)");
      grd.addColorStop(0.35, "rgba(255, 210, 230, 0.35)");
      grd.addColorStop(0.55, "rgba(160, 210, 255, 0.18)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      grd.addColorStop(0, "rgba(255, 190, 220, 0.4)");
      grd.addColorStop(0.55, "rgba(120, 180, 255, 0.14)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Cheek blush discs
    ctx.globalCompositeOperation = "multiply";
    const blushL = ctx.createRadialGradient(
      w * 0.34,
      h * 0.42,
      0,
      w * 0.34,
      h * 0.42,
      w * 0.12,
    );
    blushL.addColorStop(0, "rgba(255, 120, 150, 0.28)");
    blushL.addColorStop(1, "rgba(255, 120, 150, 0)");
    ctx.fillStyle = blushL;
    ctx.fillRect(0, 0, w, h);
    const blushR = ctx.createRadialGradient(
      w * 0.66,
      h * 0.42,
      0,
      w * 0.66,
      h * 0.42,
      w * 0.12,
    );
    blushR.addColorStop(0, "rgba(255, 120, 150, 0.28)");
    blushR.addColorStop(1, "rgba(255, 120, 150, 0)");
    ctx.fillStyle = blushR;
    ctx.fillRect(0, 0, w, h);

    // Eye shimmer / catchlight band
    ctx.globalCompositeOperation = "screen";
    const eye = ctx.createRadialGradient(
      w * 0.5,
      h * 0.34,
      w * 0.02,
      w * 0.5,
      h * 0.34,
      w * 0.2,
    );
    eye.addColorStop(0, "rgba(255,255,255,0.32)");
    eye.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = eye;
    ctx.fillRect(0, 0, w, h);

    // Thin rim light on left edge
    ctx.globalCompositeOperation = "screen";
    const rim = ctx.createLinearGradient(0, 0, w * 0.28, 0);
    rim.addColorStop(0, "rgba(200, 230, 255, 0.35)");
    rim.addColorStop(1, "rgba(200, 230, 255, 0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "source-over";
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

/** @deprecated use buildStyledCssFallback(photo, "anime") */
export async function buildAnimeCssFallback(
  photoDataUrl: string,
): Promise<string | null> {
  return buildStyledCssFallback(photoDataUrl, "anime");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}
