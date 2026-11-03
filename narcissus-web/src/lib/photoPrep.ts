export type FitMode = "cover" | "contain";

export type PrepOptions = {
  /** cover = crop to fill; contain = fit entire photo with padding */
  fit: FitMode;
  /** Output canvas size (square for photos; video uses 16:9 separately) */
  width: number;
  height: number;
  /** Normalized crop center 0–1 when fit=cover (0.5 = middle) */
  cropX?: number;
  cropY?: number;
  /** Pad color for contain mode */
  pad?: string;
  mime?: "image/jpeg" | "image/png";
  quality?: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for prep"));
    img.src = src;
  });
}

/**
 * Prepare an uploaded photo so generation matches framing:
 * - cover: center-crop (or offset) to fill the frame
 * - contain: letterbox/pillarbox so the entire photo fits
 */
export async function preparePhoto(
  file: Blob,
  opts: PrepOptions,
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = opts.width;
    canvas.height = opts.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");

    const pad = opts.pad || "#0c0b0a";
    ctx.fillStyle = pad;
    ctx.fillRect(0, 0, opts.width, opts.height);

    const scaleCover = Math.max(
      opts.width / img.naturalWidth,
      opts.height / img.naturalHeight,
    );
    const scaleContain = Math.min(
      opts.width / img.naturalWidth,
      opts.height / img.naturalHeight,
    );
    const scale = opts.fit === "cover" ? scaleCover : scaleContain;

    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    let dx: number;
    let dy: number;
    if (opts.fit === "cover") {
      const cx = opts.cropX ?? 0.5;
      const cy = opts.cropY ?? 0.5;
      // Position so the crop focus sits at (cx, cy) of the output
      dx = opts.width / 2 - drawW * cx;
      dy = opts.height / 2 - drawH * cy;
      // Clamp so we don't leave empty edges
      dx = Math.min(0, Math.max(opts.width - drawW, dx));
      dy = Math.min(0, Math.max(opts.height - drawH, dy));
    } else {
      dx = (opts.width - drawW) / 2;
      dy = (opts.height - drawH) / 2;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, drawW, drawH);

    const mime = opts.mime || "image/jpeg";
    const quality = opts.quality ?? 0.95;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
        mime,
        quality,
      );
    });
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function outputSizeForMode(
  mode: string,
): { width: number; height: number } {
  if (mode === "video") return { width: 576, height: 320 };
  return { width: 768, height: 768 };
}
