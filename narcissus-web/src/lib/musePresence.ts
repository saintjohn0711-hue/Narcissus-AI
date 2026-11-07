/**
 * Muse chat presence — style ids, CSS look maps, and local portrait cache.
 * v1 animates uploaded photos with CSS (no Comfy). Optional xAI image edit
 * can mint a styled portrait via /api/art-of-x/muse-portrait.
 */

export type MusePresenceStyle =
  | "realistic"
  | "soft-glam"
  | "anime"
  | "cyberpunk";

export const MUSE_PRESENCE_STYLES: Array<{
  id: MusePresenceStyle;
  label: string;
  blurb: string;
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
  },
  {
    id: "anime",
    label: "Anime glow",
    blurb: "Illustrated, still her",
  },
  {
    id: "cyberpunk",
    label: "Cyber neon",
    blurb: "Navy + electric blue",
  },
];

const STYLE_STORAGE = "narcissus.artOfX.musePresenceStyle.v1";
const PORTRAIT_STORAGE = "narcissus.artOfX.musePresencePortraits.v1";

export function loadPresenceStyle(partnerId: number): MusePresenceStyle {
  if (typeof window === "undefined") return "realistic";
  try {
    const raw = localStorage.getItem(STYLE_STORAGE);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    const v = map[String(partnerId)];
    if (
      v === "realistic" ||
      v === "soft-glam" ||
      v === "anime" ||
      v === "cyberpunk"
    ) {
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

function portraitKey(partnerId: number, style: MusePresenceStyle): string {
  return `${partnerId}:${style}`;
}

export function loadCachedPortrait(
  partnerId: number,
  style: MusePresenceStyle,
): string | null {
  if (typeof window === "undefined") return null;
  if (style === "realistic") return null;
  try {
    const raw = localStorage.getItem(PORTRAIT_STORAGE);
    const map = raw ? (JSON.parse(raw) as PortraitCache) : {};
    const url = map[portraitKey(partnerId, style)];
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
): void {
  if (typeof window === "undefined") return;
  if (style === "realistic") return;
  try {
    const raw = localStorage.getItem(PORTRAIT_STORAGE);
    const map = raw ? (JSON.parse(raw) as PortraitCache) : {};
    map[portraitKey(partnerId, style)] = dataUrl;
    // Keep cache lean — drop oldest-ish keys if oversized
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
    ? ` Keep their real features: ${looks.trim().slice(0, 280)}.`
    : " Preserve face identity, hair, skin tone, and body shape from the reference.";

  switch (style) {
    case "soft-glam":
      return `Restyle this adult woman portrait of ${museName} into soft glam editorial photography: warm rose-gold rim light, creamy skin, subtle metallic copper highlights, sensual but tasteful, shallow depth of field, premium fashion magazine quality.${looksBit} Same person, same pose family. Adults 18+ only.`;
    case "anime":
      return `Restyle this adult portrait of ${museName} into a high-quality anime-adjacent illustration: soft cel shading, luminous eyes, refined line work, sensual figure, still clearly the same face and hair.${looksBit} Elegant, not chibi. Adults 18+ only.`;
    case "cyberpunk":
      return `Restyle this adult portrait of ${museName} into cyberpunk neon: deep navy shadows, electric cyan rim light, subtle rose-gold metal accents, rain-haze bokeh, sensual futuristic glamour, same face and body.${looksBit} Cinematic still. Adults 18+ only.`;
    default:
      return `Photorealistic portrait of ${museName}, natural light, same person as the reference.${looksBit}`;
  }
}
