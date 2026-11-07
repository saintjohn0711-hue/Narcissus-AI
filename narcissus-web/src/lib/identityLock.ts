import sharp from "sharp";

export type HeadLockShape = "band" | "oval";

/**
 * Paste original face/hair onto an edit so likeness holds.
 *
 * - `band` (legacy): full-width top strip — simple but pastes shoulders/clothes
 *   once headRatio creeps down toward the chest.
 * - `oval` (default, NA-74): center-weighted ellipse over face+hair with a soft
 *   rim + brightness harmonization so identity rises without dragging original
 *   straps/chest back in from the frame edges.
 */
export async function lockHeadAndHair(
  edited: Uint8Array,
  original: Uint8Array,
  opts?: {
    /** Legacy vertical band height 0–1 (used when shape=band) */
    headRatio?: number;
    /** Feather band as fraction of height (band) or relative soft edge (oval) */
    feather?: number;
    /** Extra pull of original overall color (0–0.15) — keep tiny so clothes don't return */
    globalPull?: number;
    /** Mask geometry. Default oval (NA-74). */
    shape?: HeadLockShape;
    /** Oval center Y as fraction of height (default ~0.14 — mid-face on standing shots) */
    faceCenterY?: number;
    /** Oval radius X as fraction of width (default ~0.32 — face + side hair) */
    faceRx?: number;
    /** Oval radius Y as fraction of height (default ~0.26 — hairline to chin) */
    faceRy?: number;
    /**
     * Optional: pull original face luminance toward the edit (0–1).
     * Default 0 — even mild matching was crushing insightface cosine in smokes.
     */
    lumaMatch?: number;
  },
): Promise<Uint8Array> {
  const shape: HeadLockShape = opts?.shape ?? "oval";
  const globalPull = Math.min(0.12, Math.max(0, opts?.globalPull ?? 0));
  const lumaMatch = Math.min(1, Math.max(0, opts?.lumaMatch ?? 0));

  const base = sharp(Buffer.from(edited)).ensureAlpha();
  const meta = await base.metadata();
  const width = meta.width || 768;
  const height = meta.height || 768;

  const orig = await sharp(Buffer.from(original))
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const edit = await base.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(width * height * 4);

  if (shape === "band") {
    const headRatio = Math.min(0.55, Math.max(0.22, opts?.headRatio ?? 0.42));
    const feather = Math.min(0.22, Math.max(0.08, opts?.feather ?? 0.14));
    const solidEnd = Math.floor(height * headRatio);
    const featherEnd = Math.min(
      height,
      Math.floor(height * (headRatio + feather)),
    );

    for (let y = 0; y < height; y++) {
      let a: number;
      if (y <= solidEnd) a = 1;
      else if (y >= featherEnd) a = 0;
      else a = 1 - (y - solidEnd) / Math.max(1, featherEnd - solidEnd);
      a = a * a * (3 - 2 * a);
      a = Math.min(1, a + globalPull * (1 - a));
      blendRow(out, orig.data, edit.data, width, y, () => a, 0);
    }
  } else {
    const cx = width * 0.5;
    const cy =
      height * Math.min(0.35, Math.max(0.08, opts?.faceCenterY ?? 0.14));
    const rx = width * Math.min(0.48, Math.max(0.22, opts?.faceRx ?? 0.32));
    const ry = height * Math.min(0.42, Math.max(0.16, opts?.faceRy ?? 0.26));
    const rim = Math.min(0.55, Math.max(0.18, opts?.feather ?? 0.35));

    for (let y = 0; y < height; y++) {
      blendRow(
        out,
        orig.data,
        edit.data,
        width,
        y,
        (x) => {
          const nx = (x - cx) / rx;
          const ny = (y - cy) / ry;
          // Slightly taller weight on top for hair volume
          const hairBias = y < cy ? 0.9 : 1.0;
          const d = Math.sqrt(nx * nx + (ny * hairBias) * (ny * hairBias));
          const inner = 1 - rim;
          let a: number;
          if (d <= inner) a = 1;
          else if (d >= 1) a = 0;
          else {
            const t = (d - inner) / Math.max(1e-6, rim);
            a = 1 - t;
            a = a * a * (3 - 2 * a);
          }
          return Math.min(1, a + globalPull * (1 - a));
        },
        lumaMatch,
      );
    }
  }

  return new Uint8Array(
    await sharp(out, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer(),
  );
}

function luma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function blendRow(
  out: Buffer,
  orig: Buffer,
  edit: Buffer,
  width: number,
  y: number,
  alphaAt: (x: number) => number,
  lumaMatch: number,
) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const oa = alphaAt(x);
    const ea = 1 - oa;
    let or_ = orig[i]!;
    let og = orig[i + 1]!;
    let ob = orig[i + 2]!;
    const er = edit[i]!;
    const eg = edit[i + 1]!;
    const eb = edit[i + 2]!;

    if (oa > 0 && lumaMatch > 0) {
      const ol = luma(or_, og, ob);
      const el = luma(er, eg, eb);
      if (ol > 1e-3) {
        // Match edit brightness while keeping original chroma/structure.
        const scale = 1 + lumaMatch * (el / ol - 1);
        or_ = Math.min(255, Math.max(0, or_ * scale));
        og = Math.min(255, Math.max(0, og * scale));
        ob = Math.min(255, Math.max(0, ob * scale));
      }
    }

    out[i] = Math.round(or_ * oa + er * ea);
    out[i + 1] = Math.round(og * oa + eg * ea);
    out[i + 2] = Math.round(ob * oa + eb * ea);
    out[i + 3] = 255;
  }
}
