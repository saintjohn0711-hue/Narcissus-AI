/**
 * Pull a short "looks" line from partner photo(s).
 * Prefer server vision (/api/art-of-x/describe-looks) when configured;
 * otherwise infer a draft from local color/framing analysis.
 */

export type LooksHint = {
  gender?: string;
  name?: string;
};

type Rgb = { r: number; g: number; b: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read photo"));
    el.src = src;
  });
}

function avgRegion(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Rgb {
  const left = Math.floor(clamp01(x0) * w);
  const top = Math.floor(clamp01(y0) * h);
  const right = Math.max(left + 1, Math.floor(clamp01(x1) * w));
  const bottom = Math.max(top + 1, Math.floor(clamp01(y1) * h));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(Math.min(right - left, bottom - top) / 24));
  for (let y = top; y < bottom; y += step) {
    for (let x = left; x < right; x += step) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  if (!n) return { r: 128, g: 128, b: 128 };
  return { r: r / n, g: g / n, b: b / n };
}

function lum(c: Rgb) {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function sat(c: Rgb) {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  if (max < 1) return 0;
  return (max - min) / max;
}

function hairLabel(c: Rgb): string {
  const L = lum(c);
  const S = sat(c);
  if (L < 45) return "dark / black hair";
  if (L < 90 && S < 0.25) return "dark brown hair";
  if (L < 130 && c.r > c.b + 20) return "brown hair";
  if (L >= 130 && L < 190 && S < 0.35) return "light brown / dirty blonde hair";
  if (L >= 170 && S < 0.3) return "blonde / light hair";
  if (c.r > c.g + 25 && c.r > c.b + 15 && L > 70) return "auburn / red hair";
  if (S > 0.45 && (c.b > c.r + 20 || c.g > c.r + 20)) return "dyed / vivid hair";
  return "medium-tone hair";
}

function skinLabel(c: Rgb): string {
  const L = lum(c);
  if (L < 70) return "deep skin";
  if (L < 110) return "medium-deep skin";
  if (L < 155) return "medium skin";
  if (L < 195) return "light-medium skin";
  return "fair skin";
}

function frameLabel(w: number, h: number): string {
  const ratio = w / Math.max(1, h);
  if (ratio < 0.72) return "portrait framing";
  if (ratio > 1.25) return "wide / landscape framing";
  return "square-ish framing";
}

function genderPhrase(gender?: string): string {
  switch (gender) {
    case "woman":
      return "feminine presentation";
    case "man":
      return "masculine presentation";
    case "trans":
      return "trans feminine presentation";
    case "crossdresser":
      return "cross-dresser presentation";
    case "couple":
      return "couple";
    default:
      return "";
  }
}

/** Local draft looks line from one or more photos (no cloud vision). */
export async function inferLooksLocally(
  dataUrls: string[],
  hints: LooksHint = {},
): Promise<string> {
  if (!dataUrls.length) throw new Error("Choose at least one photo");

  const parts: string[] = [];
  const genderBit = genderPhrase(hints.gender);
  if (genderBit) parts.push(genderBit);

  const hairVotes = new Map<string, number>();
  const skinVotes = new Map<string, number>();
  let frame = "";

  for (const src of dataUrls.slice(0, 4)) {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    const maxSide = 320;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Top-center ≈ hair; mid-center ≈ face/skin
    const hair = avgRegion(data, canvas.width, canvas.height, 0.28, 0.02, 0.72, 0.28);
    const face = avgRegion(data, canvas.width, canvas.height, 0.32, 0.22, 0.68, 0.52);
    const hairL = hairLabel(hair);
    const skinL = skinLabel(face);
    hairVotes.set(hairL, (hairVotes.get(hairL) || 0) + 1);
    skinVotes.set(skinL, (skinVotes.get(skinL) || 0) + 1);
    if (!frame) frame = frameLabel(img.naturalWidth, img.naturalHeight);
  }

  const top = (votes: Map<string, number>) =>
    [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const hair = top(hairVotes);
  const skin = top(skinVotes);
  if (hair) parts.push(hair);
  if (skin) parts.push(skin);
  if (frame) parts.push(frame);
  if (dataUrls.length > 1) {
    parts.push(`from ${dataUrls.length} photos`);
  }

  const line = parts.join(", ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

export type DescribeLooksResult = {
  looks: string;
  source: "vision" | "local";
};

/** Prefer server vision; fall back to local draft. */
export async function pullLooksFromPhotos(
  dataUrls: string[],
  hints: LooksHint = {},
): Promise<DescribeLooksResult> {
  if (!dataUrls.length) throw new Error("Choose at least one photo");

  try {
    const res = await fetch("/api/art-of-x/describe-looks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: dataUrls.slice(0, 4),
        gender: hints.gender || "",
        name: hints.name || "",
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { looks?: string };
      if (data.looks?.trim()) {
        return { looks: data.looks.trim(), source: "vision" };
      }
    }
  } catch {
    // fall through to local
  }

  const looks = await inferLooksLocally(dataUrls, hints);
  return { looks, source: "local" };
}
