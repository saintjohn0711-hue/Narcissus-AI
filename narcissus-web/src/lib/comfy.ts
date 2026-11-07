export type ComfyImageRef = {
  filename: string;
  subfolder: string;
  type: "input" | "output" | "temp";
  format?: string;
};

export type ComfyJobResult = {
  promptId: string;
  images: ComfyImageRef[];
  viewUrls: string[];
  mediaKind: "image" | "video";
};

function baseUrl(): string {
  const url = process.env.COMFYUI_BASE_URL?.replace(/\/$/, "");
  if (!url) throw new Error("COMFYUI_BASE_URL is not set");
  return url;
}

export function isComfyConfigured(): boolean {
  return Boolean(process.env.COMFYUI_BASE_URL?.trim());
}

export async function listCheckpoints(): Promise<string[]> {
  if (!isComfyConfigured()) return [];
  try {
    const res = await fetch(`${baseUrl()}/models/checkpoints`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data)
      ? data.filter((n): n is string => typeof n === "string")
      : [];
  } catch {
    return [];
  }
}

/** Pick first preferred checkpoint that exists on the pod. */
export async function resolveCheckpoint(
  preferred: string[],
  fallback: string,
): Promise<string> {
  const available = new Set(await listCheckpoints());
  for (const name of preferred) {
    if (available.has(name)) return name;
  }
  return fallback;
}

export async function uploadImage(
  file: File | Blob,
  filename: string,
): Promise<ComfyImageRef> {
  const body = new FormData();
  body.set("image", file, filename);
  body.set("overwrite", "true");
  const res = await fetch(`${baseUrl()}/upload/image`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(`ComfyUI upload failed (${res.status})`);
  }
  const data = (await res.json()) as {
    name: string;
    subfolder?: string;
    type?: string;
  };
  return {
    filename: data.name,
    subfolder: data.subfolder || "",
    type: (data.type as ComfyImageRef["type"]) || "input",
  };
}

/** Upload a finished PNG into Comfy input so /view can serve it if needed. */
export async function uploadResultPng(
  bytes: Uint8Array,
  filename: string,
): Promise<ComfyImageRef> {
  const blob = new Blob([Buffer.from(bytes)], { type: "image/png" });
  return uploadImage(blob, filename);
}

export async function queuePrompt(
  prompt: Record<string, unknown>,
  clientId = "narcissus-web",
): Promise<string> {
  const res = await fetch(`${baseUrl()}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, client_id: clientId }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error ||
      `ComfyUI prompt failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  if (!data.prompt_id) {
    throw new Error("ComfyUI did not return prompt_id");
  }
  return data.prompt_id as string;
}

type HistoryMedia = {
  filename: string;
  subfolder?: string;
  type?: string;
  format?: string;
};

type HistoryEntry = {
  outputs?: Record<
    string,
    {
      images?: HistoryMedia[];
      gifs?: HistoryMedia[];
      videos?: HistoryMedia[];
    }
  >;
  status?: {
    completed?: boolean;
    status_str?: string;
    messages?: unknown[];
  };
};

function collectMedia(entry: HistoryEntry): ComfyImageRef[] {
  const out: ComfyImageRef[] = [];
  for (const node of Object.values(entry.outputs || {})) {
    for (const key of ["gifs", "videos", "images"] as const) {
      for (const img of node[key] || []) {
        out.push({
          filename: img.filename,
          subfolder: img.subfolder || "",
          type: (img.type as ComfyImageRef["type"]) || "output",
          format: img.format,
        });
      }
    }
  }
  // Prefer real video containers, then animated stills
  const mp4 = out.filter((m) => /\.(mp4|webm)$/i.test(m.filename));
  if (mp4.length) return mp4;
  const animated = out.filter(
    (m) =>
      m.format?.includes("webp") ||
      m.format?.includes("gif") ||
      m.format?.includes("video") ||
      /\.(webp|gif)$/i.test(m.filename),
  );
  return animated.length ? animated : out;
}

/** Pull InstantID/Comfy exception text out of history status.messages. */
export function comfyExecutionErrorMessage(entry: HistoryEntry): string {
  const msgs = entry.status?.messages || [];
  for (const raw of msgs) {
    if (!Array.isArray(raw) || raw[0] !== "execution_error") continue;
    const detail = raw[1] as
      | {
          exception_message?: string;
          exception_type?: string;
          node_type?: string;
          node_id?: string | number;
        }
      | undefined;
    if (!detail || typeof detail !== "object") continue;
    const msg = String(detail.exception_message || "").trim();
    const node = detail.node_type
      ? ` (${detail.node_type}${detail.node_id != null ? ` #${detail.node_id}` : ""})`
      : "";
    if (msg) return `${msg}${node}`;
  }
  return "ComfyUI reported a job error";
}

export async function waitForPrompt(
  promptId: string,
  {
    timeoutMs = 300_000,
    intervalMs = 2000,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<ComfyImageRef[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${baseUrl()}/history/${promptId}`);
    if (!res.ok) {
      throw new Error(`ComfyUI history failed (${res.status})`);
    }
    const hist = (await res.json()) as Record<string, HistoryEntry>;
    const entry = hist[promptId];
    if (entry?.status?.status_str === "error") {
      throw new Error(comfyExecutionErrorMessage(entry));
    }
    if (entry?.outputs) {
      const media = collectMedia(entry);
      if (media.length) return media;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for ComfyUI job");
}

export function viewUrl(image: ComfyImageRef): string {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder,
    type: image.type,
  });
  return `${baseUrl()}/view?${params.toString()}`;
}

/** App-local URL so the browser never hits the Runpod proxy directly (avoids blank/403). */
export function proxyViewUrl(image: ComfyImageRef): string {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || "",
    type: image.type,
  });
  return `/api/media?${params.toString()}`;
}

export async function fetchImageBytes(
  image: ComfyImageRef,
): Promise<Uint8Array> {
  const res = await fetch(viewUrl(image), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch result image (${res.status})`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Detect pure/near-black frames (ReActor failure mode when no face is found).
 * Tiny compressed PNGs are a fast path; larger buffers are still scanned.
 */
export function isNearlyBlankImage(bytes: Uint8Array): boolean {
  // Blank RGB PNGs from Comfy are tiny (<8KB for 512–768). Real photos >>50KB.
  if (bytes.byteLength < 8_000) return true;
  if (bytes.byteLength < 40_000) {
    let nonzero = 0;
    const step = Math.max(1, Math.floor(bytes.byteLength / 400));
    for (let i = 64; i < bytes.byteLength; i += step) {
      if (bytes[i]! > 16) nonzero++;
    }
    return nonzero < 12;
  }
  return false;
}

/** Async blank check using sharp when available (more accurate). */
export async function isNearlyBlankImageAsync(
  bytes: Uint8Array,
): Promise<boolean> {
  if (isNearlyBlankImage(bytes)) return true;
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(Buffer.from(bytes))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = info.width * info.height;
    if (!pixels) return true;
    const step = Math.max(1, Math.floor(pixels / 4000));
    let dark = 0;
    let samples = 0;
    for (let i = 0; i < pixels; i += step) {
      const o = i * info.channels;
      const lum = (data[o]! + data[o + 1]! + data[o + 2]!) / 3;
      if (lum < 10) dark++;
      samples++;
    }
    return samples > 0 && dark / samples > 0.92;
  } catch {
    return false;
  }
}

function mediaKindOf(images: ComfyImageRef[]): "image" | "video" {
  return images.some(
    (m) =>
      m.format?.includes("webp") ||
      m.format?.includes("gif") ||
      m.format?.includes("video") ||
      /\.(webp|gif|mp4|webm)$/i.test(m.filename),
  )
    ? "video"
    : "image";
}

export async function runPromptToImages(
  prompt: Record<string, unknown>,
  opts?: { timeoutMs?: number; proxyUrls?: boolean },
): Promise<ComfyJobResult> {
  const promptId = await queuePrompt(prompt);
  const images = await waitForPrompt(promptId, {
    timeoutMs: opts?.timeoutMs,
  });
  const toUrl = opts?.proxyUrls === false ? viewUrl : proxyViewUrl;
  return {
    promptId,
    images,
    viewUrls: images.map(toUrl),
    mediaKind: mediaKindOf(images),
  };
}
