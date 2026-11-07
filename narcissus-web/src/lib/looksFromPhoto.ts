/**
 * Pull a partner "looks" blurb from photo(s).
 * Prefer server vision (/api/art-of-x/describe-looks) when configured;
 * otherwise infer a sensual draft from local color/framing analysis.
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

type HairCue = { label: string; texture: string };

function hairCue(c: Rgb): HairCue {
  const L = lum(c);
  const S = sat(c);
  if (L < 45)
    return { label: "ink-black hair", texture: "dark and glossy against the light" };
  if (L < 90 && S < 0.25)
    return { label: "deep brown hair", texture: "rich and shadowed" };
  if (L < 130 && c.r > c.b + 20)
    return { label: "warm brown hair", texture: "soft and touchable" };
  if (L >= 130 && L < 190 && S < 0.35)
    return { label: "dirty-blonde hair", texture: "sun-kissed and lived-in" };
  if (L >= 170 && S < 0.3)
    return { label: "blonde hair", texture: "light-catching and soft" };
  if (c.r > c.g + 25 && c.r > c.b + 15 && L > 70)
    return { label: "auburn hair", texture: "copper-warm and striking" };
  if (S > 0.45 && (c.b > c.r + 20 || c.g > c.r + 20))
    return { label: "vivid dyed hair", texture: "bold color that owns the frame" };
  return { label: "medium-tone hair", texture: "natural and easy" };
}

type SkinCue = { label: string; glow: string };

function skinCue(c: Rgb): SkinCue {
  const L = lum(c);
  if (L < 70)
    return { label: "deep skin", glow: "warm and luminous" };
  if (L < 110)
    return { label: "medium-deep skin", glow: "golden and inviting" };
  if (L < 155)
    return { label: "medium skin", glow: "sun-warmed and smooth" };
  if (L < 195)
    return { label: "light-medium skin", glow: "soft and flushed with light" };
  return { label: "fair skin", glow: "pale and delicate in the light" };
}

type FrameCue = { shot: string; energy: string };

function frameCue(w: number, h: number): FrameCue {
  const ratio = w / Math.max(1, h);
  if (ratio < 0.72)
    return {
      shot: "tight portrait",
      energy: "close enough to feel their breath — face and presence front and center",
    };
  if (ratio > 1.25)
    return {
      shot: "wide frame",
      energy: "body language and silhouette getting room to seduce",
    };
  return {
    shot: "balanced frame",
    energy: "face and figure sharing the heat evenly",
  };
}

function presencePhrase(gender?: string): string {
  switch (gender) {
    case "woman":
      return "Feminine presence that reads adult and intentional";
    case "man":
      return "Masculine presence that reads adult and intentional";
    case "trans":
      return "Trans feminine presence that reads adult and intentional";
    case "crossdresser":
      return "Cross-dressed presentation that reads adult and intentional";
    case "couple":
      return "Couple energy — two bodies sharing the frame";
    default:
      return "Adult presence that reads intentional";
  }
}

function bodyVibe(gender?: string, framing?: FrameCue): string {
  const close = framing?.shot === "tight portrait";
  switch (gender) {
    case "woman":
      return close
        ? "Soft lips and a gaze that holds — the kind of face you lean into"
        : "Curves and posture reading soft and confident, made to be looked at";
    case "man":
      return close
        ? "A steady jaw and eyes that mean business — quietly magnetic"
        : "Build and stance reading solid and sure, the kind of body you notice first";
    case "trans":
      return close
        ? "Soft features and a gaze that lands — pretty with heat behind it"
        : "Feminine lines and confidence that feel deliberate and sexy";
    case "crossdresser":
      return close
        ? "Made-up and intentional — the look is the flirt"
        : "Styled presentation with a playful, dressed-to-tease energy";
    case "couple":
      return "Chemistry in how they sit together — inviting and a little dangerous";
    default:
      return close
        ? "Features that pull focus — eyes, mouth, the quiet dare of the expression"
        : "A body and vibe that feel worth a second look";
  }
}

/** Local draft looks blurb from one or more photos (no cloud vision). */
export async function inferLooksLocally(
  dataUrls: string[],
  hints: LooksHint = {},
): Promise<string> {
  if (!dataUrls.length) throw new Error("Choose at least one photo");

  const hairVotes = new Map<string, { cue: HairCue; n: number }>();
  const skinVotes = new Map<string, { cue: SkinCue; n: number }>();
  let framing: FrameCue | null = null;

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
    const hCue = hairCue(hair);
    const sCue = skinCue(face);
    const hPrev = hairVotes.get(hCue.label);
    hairVotes.set(hCue.label, { cue: hCue, n: (hPrev?.n || 0) + 1 });
    const sPrev = skinVotes.get(sCue.label);
    skinVotes.set(sCue.label, { cue: sCue, n: (sPrev?.n || 0) + 1 });
    if (!framing) framing = frameCue(img.naturalWidth, img.naturalHeight);
  }

  const top = <T extends { n: number }>(votes: Map<string, T>) =>
    [...votes.values()].sort((a, b) => b.n - a.n)[0];

  const hair = top(hairVotes)?.cue;
  const skin = top(skinVotes)?.cue;
  const frame = framing ?? frameCue(1, 1);

  const multi =
    dataUrls.length > 1
      ? ` Pulled across ${dataUrls.length} photos — same heat, different angles.`
      : "";

  const sentences = [
    `${presencePhrase(hints.gender)}: ${hair?.label ?? "soft hair"}, ${hair?.texture ?? "catching the light"}, over ${skin?.label ?? "warm skin"} that looks ${skin?.glow ?? "alive"}.`,
    `${bodyVibe(hints.gender, frame)}.`,
    `${frame.shot[0].toUpperCase()}${frame.shot.slice(1)} — ${frame.energy}.${multi}`,
  ];

  return sentences.join(" ").replace(/\s+/g, " ").trim();
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
