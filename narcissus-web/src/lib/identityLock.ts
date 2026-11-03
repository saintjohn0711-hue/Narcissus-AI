import sharp from "sharp";

/**
 * Paste the original head/hair band back onto an edit so likeness holds.
 * Uses a soft vertical alpha: top of frame = original, mid/lower = edit.
 * Clothing edits below the neck stay; face + hairline stay from the upload.
 */
export async function lockHeadAndHair(
  edited: Uint8Array,
  original: Uint8Array,
  opts?: {
    /** 0–1 how much of the frame height is locked to the original (default ~0.42) */
    headRatio?: number;
    /** Feather band as fraction of height (default 0.14) */
    feather?: number;
    /** Extra pull of original overall color (0–0.15) — keep tiny so clothes don't return */
    globalPull?: number;
  },
): Promise<Uint8Array> {
  const headRatio = Math.min(0.55, Math.max(0.28, opts?.headRatio ?? 0.42));
  const feather = Math.min(0.22, Math.max(0.08, opts?.feather ?? 0.14));
  const globalPull = Math.min(0.12, Math.max(0, opts?.globalPull ?? 0));

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
    // ease
    a = a * a * (3 - 2 * a);
    a = Math.min(1, a + globalPull * (1 - a));

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const oa = a;
      const ea = 1 - oa;
      out[i] = Math.round(orig.data[i]! * oa + edit.data[i]! * ea);
      out[i + 1] = Math.round(orig.data[i + 1]! * oa + edit.data[i + 1]! * ea);
      out[i + 2] = Math.round(orig.data[i + 2]! * oa + edit.data[i + 2]! * ea);
      out[i + 3] = 255;
    }
  }

  return new Uint8Array(
    await sharp(out, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer(),
  );
}
