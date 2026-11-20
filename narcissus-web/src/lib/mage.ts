/**
 * Mage.space API client — Mango image family.
 *
 * Docs: https://docs.mage.space/api/models/mango
 * Auth: Authorization Bearer $MAGE_API_KEY (key prefix mage_sk_…)
 *
 * Mango is Mage-proprietary (no open weights for Comfy). Photoreal character
 * consistency via `image` + `additional_images` / Characters — NOT FaceID.
 *
 * Adult Studio (undress / sex acts / cock ref) must stay on Comfy: Mage policy
 * forbids non-consensual sexual likeness and providers often `content_blocked`
 * with reason `nsfw`. See internal/mage-mango-studio-photos.md.
 */

export const MAGE_API_BASE = "https://api.mage.space";

/** Architecture path segment for POST /v1/{architecture}/generate */
export const MAGE_MANGO_ARCHITECTURE = "mango";

export type MageMangoModelId =
  | "mango"
  | "mango-v2"
  | "mango-v3s"
  | "mango-v3"
  | "mango-v3-turbo"
  | "mango-v4";

export const DEFAULT_MAGE_MANGO_MODEL: MageMangoModelId = "mango-v4";

/** Default gem price at Mage's documented default settings (~$0.042). */
export const MAGE_MANGO_DEFAULT_GEMS = 42;

export type MageRequestStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type MageGenerateResult = {
  type: "image" | "video" | "audio";
  url: string;
  width: number;
  height: number;
  seed: number;
  expires_at: string | null;
  moderation: { nsfw: boolean };
};

export type MageRequest = {
  request_id: string;
  status: MageRequestStatus;
  architecture: string;
  model_id: string | null;
  billing?: { mode: "gems"; gems_charged: number; gems_refunded?: number };
  result: MageGenerateResult | null;
  error: {
    code: string;
    message: string;
    reason?: string;
  } | null;
  status_url: string;
  cancel_url: string;
};

function apiKey(): string {
  return process.env.MAGE_API_KEY?.trim() || "";
}

export function isMageConfigured(): boolean {
  return Boolean(apiKey());
}

export function mageModelId(): MageMangoModelId {
  const raw = process.env.MAGE_MODEL_ID?.trim() || DEFAULT_MAGE_MANGO_MODEL;
  const allowed: MageMangoModelId[] = [
    "mango",
    "mango-v2",
    "mango-v3s",
    "mango-v3",
    "mango-v3-turbo",
    "mango-v4",
  ];
  return (allowed.includes(raw as MageMangoModelId)
    ? raw
    : DEFAULT_MAGE_MANGO_MODEL) as MageMangoModelId;
}

/**
 * Studio adult / genital / undress templates must never hit Mage.
 * Mango is for character-consistent photoreal edits when policy allows.
 */
export function mageEligibleStudioMode(
  mode: string,
  photoTemplateId?: string | null,
): { ok: boolean; reason?: string } {
  if (mode === "undress" || mode === "faceswap" || mode === "video" || mode === "toy") {
    return {
      ok: false,
      reason:
        "Mage Mango cannot run undress/faceswap/video/toy — use Comfy FaceID (NSFW).",
    };
  }
  if (mode === "scene") {
    const adult = new Set([
      "eye_contact_handjob",
      "blowjob",
      "double_blowjob",
      "cumshot",
      "facial",
      "missionary",
      "doggy",
      "riding",
    ]);
    if (photoTemplateId && adult.has(photoTemplateId)) {
      return {
        ok: false,
        reason:
          "Mage Mango blocks explicit sex-act stills (content_blocked/nsfw + likeness rules). Keep Comfy for Studio X acts.",
      };
    }
  }
  // custom + mild outfit scenes only when explicitly requested
  return { ok: true };
}

async function mageFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error("MAGE_API_KEY is not configured");
  return fetch(`${MAGE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

export type MangoGenerateInput = {
  prompt: string;
  modelId?: MageMangoModelId;
  aspectRatio?: string;
  resolution?: "1K" | "2K" | "3K" | "4K";
  seed?: number | null;
  /** Primary reference (face/body) — https or data URL */
  image?: string | null;
  /** Extra refs (e.g. cock / wardrobe) — Mage merges via additional_images */
  additionalImages?: string[];
  idempotencyKey?: string;
};

/** Submit Mango generation; returns the live request (poll status_url). */
export async function submitMangoGenerate(
  input: MangoGenerateInput,
): Promise<MageRequest> {
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    model_id: input.modelId || mageModelId(),
    aspect_ratio: input.aspectRatio || "4:5",
    resolution: input.resolution || "2K",
  };
  if (input.seed != null) body.seed = input.seed;
  if (input.image) body.image = input.image;
  if (input.additionalImages?.length) {
    body.additional_images = input.additionalImages;
  }

  const headers: Record<string, string> = {};
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey.slice(0, 255);
  }

  const res = await mageFetch(`/v1/${MAGE_MANGO_ARCHITECTURE}/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as MageRequest & {
    message?: string;
    code?: string;
  };
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Mage Mango submit failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function pollMageRequest(
  statusUrl: string,
  opts?: { timeoutMs?: number; intervalMs?: number },
): Promise<MageRequest> {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  const intervalMs = opts?.intervalMs ?? 2500;
  const key = apiKey();
  if (!key) throw new Error("MAGE_API_KEY is not configured");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const data = (await res.json()) as MageRequest;
    if (!res.ok) {
      throw new Error(
        data?.error?.message || `Mage status failed (${res.status})`,
      );
    }
    if (
      data.status === "completed" ||
      data.status === "failed" ||
      data.status === "cancelled"
    ) {
      return data;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for Mage Mango job");
}

/** Submit + poll until completed; throws on failed/cancelled. */
export async function runMangoToImage(
  input: MangoGenerateInput,
  opts?: { timeoutMs?: number },
): Promise<{ request: MageRequest; imageUrl: string; gemsCharged: number }> {
  const submitted = await submitMangoGenerate(input);
  const final = await pollMageRequest(submitted.status_url, {
    timeoutMs: opts?.timeoutMs,
  });
  if (final.status !== "completed" || !final.result?.url) {
    const err = final.error;
    const reason = err?.reason ? ` (${err.reason})` : "";
    throw new Error(
      err?.message ||
        `Mage Mango ${final.status}${reason}` ||
        "Mage Mango produced no image",
    );
  }
  return {
    request: final,
    imageUrl: final.result.url,
    gemsCharged: final.billing?.gems_charged ?? MAGE_MANGO_DEFAULT_GEMS,
  };
}

export function magePublicStatus() {
  return {
    configured: isMageConfigured(),
    architecture: MAGE_MANGO_ARCHITECTURE,
    defaultModelId: mageModelId(),
    defaultGems: MAGE_MANGO_DEFAULT_GEMS,
    env: ["MAGE_API_KEY", "MAGE_MODEL_ID"],
    note:
      "Mango is Mage-only (no Comfy checkpoint). Adult Studio acts stay on Comfy FaceID.",
  };
}
