/**
 * Muse chat presence — style ids, CSS look maps, and local portrait cache.
 * Optional xAI image edit via /api/art-of-x/muse-portrait (no Comfy).
 */

export type MusePresenceStyle =
  | "realistic"
  | "soft-glam"
  | "anime"
  | "cartoon"
  | "cyberpunk";

export const MUSE_PRESENCE_STYLES: Array<{
  id: MusePresenceStyle;
  label: string;
  blurb: string;
  /** Auto-request xAI restyle when picked (if photo + no cache). */
  autoGenerate?: boolean;
}> = [
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
    id: "cartoon",
    label: "Cartoon AI",
    blurb: "Companion-app cartoon",
    autoGenerate: true,
  },
  {
    id: "cyberpunk",
    label: "Cyber neon",
    blurb: "Navy + electric blue",
    autoGenerate: true,
  },
];

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
const PORTRAIT_STORAGE = "narcissus.artOfX.musePresencePortraits.v2";

export function loadPresenceStyle(partnerId: number): MusePresenceStyle {
  if (typeof window === "undefined") return "realistic";
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
  return "realistic";
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
): string {
  return `${partnerId}:${style}:${photoFp}`;
}

export function loadCachedPortrait(
  partnerId: number,
  style: MusePresenceStyle,
  photo?: string | null,
): string | null {
  if (typeof window === "undefined") return null;
  if (style === "realistic") return null;
  try {
    const raw = localStorage.getItem(PORTRAIT_STORAGE);
    const map = raw ? (JSON.parse(raw) as PortraitCache) : {};
    const fp = photoFingerprint(photo);
    const url = map[portraitKey(partnerId, style, fp)];
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
): void {
  if (typeof window === "undefined") return;
  if (style === "realistic") return;
  try {
    const raw = localStorage.getItem(PORTRAIT_STORAGE);
    const map = raw ? (JSON.parse(raw) as PortraitCache) : {};
    const fp = photoFingerprint(photo);
    map[portraitKey(partnerId, style, fp)] = dataUrl;
    const keys = Object.keys(map);
    if (keys.length > 24) {
      for (const k of keys.slice(0, keys.length - 20)) {
        delete map[k];
      }
    }
    localStorage.setItem(PORTRAIT_STORAGE, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

/** Prompt for xAI image edit — keep likeness, apply look. */
export function styleEditPrompt(
  style: MusePresenceStyle,
  museName: string,
  looks?: string,
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
        `Identity-preserving anime stylization of this exact reference photo of adult ${museName}.`,
        `CRITICAL IDENTITY LOCK: preserve her unique face — forehead, brow, eye spacing/shape/color, nose bridge, lips, jawline, cheekbones, skin undertone, hair color, hairline, hair length and parting from the reference. Do NOT invent a generic anime face.`,
        `Style: high-quality sensual anime / modern seinen illustration — clean line art, soft cel shading, luminous eyes that still match her real eyes, refined hair strands matching her real hair, flattering figure, intimate premium look.`,
        `Not chibi, not moe-blob, not a different character. Same woman as the photo, rendered as sexy anime.${looksBit}`,
        `Adults 18+ only. Single portrait, no watermark, no text.`,
      ].join(" ");
    case "cartoon":
      return [
        `Turn this reference photo of adult ${museName} into a clear Cartoon AI companion avatar — like Character.AI / modern AI companion apps: 3D-cartoon / stylized cartoon face, NOT photoreal, NOT flat anime line-art.`,
        `CRITICAL IDENTITY LOCK: keep her recognizable — same hair color/length/parting, skin undertone, facial proportions, eye color, and overall look from the reference. She must still read as the same person.`,
        `Style: big expressive cartoon eyes, smooth plastic/soft 3D skin shading, simplified cute-sexy features, clean companion-app portrait lighting, flattering stylized body, premium and unmistakably cartoon.`,
        `Not a photo filter. Not realistic. Not chibi. Sexy cartoon companion avatar of this Muse.${looksBit}`,
        `Adults 18+ only. Single bust/portrait, no watermark, no text, no UI chrome.`,
      ].join(" ");
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

type CanvasFallbackMode = "anime" | "cartoon";

/**
 * Client canvas fallback when xAI is unavailable.
 * Keeps the Muse photo recognizable with stronger stylization for cartoon.
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;
    const levels = mode === "cartoon" ? 4 : 6;
    const step = 255 / (levels - 1);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i]! / step) * step;
      d[i + 1] = Math.round(d[i + 1]! / step) * step;
      d[i + 2] = Math.round(d[i + 2]! / step) * step;
      let r = d[i]!;
      let g = d[i + 1]!;
      let b = d[i + 2]!;
      if (mode === "cartoon") {
        // Punchier companion-app palette: warmer skin, bigger contrast
        const avg = (r + g + b) / 3;
        r = Math.min(255, Math.round(avg + (r - avg) * 1.45 + 18));
        g = Math.min(255, Math.round(avg + (g - avg) * 1.25 + 8));
        b = Math.min(255, Math.round(avg + (b - avg) * 1.15 + 4));
      } else {
        r = Math.min(255, Math.round(r * 1.06 + 6));
        g = Math.min(255, Math.round(g * 1.02));
        b = Math.min(255, Math.round(b * 1.08 + 10));
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    ctx.putImageData(image, 0, 0);
    ctx.globalCompositeOperation = "soft-light";
    const grd = ctx.createRadialGradient(
      w * 0.5,
      h * 0.32,
      w * 0.08,
      w * 0.5,
      h * 0.4,
      w * 0.72,
    );
    if (mode === "cartoon") {
      grd.addColorStop(0, "rgba(255, 210, 230, 0.55)");
      grd.addColorStop(0.4, "rgba(180, 220, 255, 0.22)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      grd.addColorStop(0, "rgba(255, 190, 220, 0.35)");
      grd.addColorStop(0.55, "rgba(120, 180, 255, 0.12)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    if (mode === "cartoon") {
      // Soft “eye highlight” band — reads more companion-cartoon without face ML
      ctx.globalCompositeOperation = "screen";
      const eye = ctx.createRadialGradient(
        w * 0.5,
        h * 0.36,
        w * 0.02,
        w * 0.5,
        h * 0.36,
        w * 0.22,
      );
      eye.addColorStop(0, "rgba(255,255,255,0.28)");
      eye.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = eye;
      ctx.fillRect(0, 0, w, h);
    }
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
