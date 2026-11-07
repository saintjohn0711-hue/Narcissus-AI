/**
 * Muse / Companion portraits via xAI Imagine.
 * Companion default: text-to-image from wardrobe traits (no Muse photo).
 * Optional: adjust prior companion art, or likeness-lock from a Muse photo.
 */

import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getXaiApiKey,
  isXaiConfigured,
  xaiMissingKeyPayload,
} from "@/lib/xai";
import {
  normalizeWardrobe,
  type CompanionWardrobe,
} from "@/lib/companionWardrobe";
import {
  styleEditPrompt,
  styleUsesAnimeStyleRef,
  type CompanionGenMode,
  type MusePresenceStyle,
} from "@/lib/musePresence";

export const runtime = "nodejs";
export const maxDuration = 90;

const XAI_IMAGE_EDITS_URL = "https://api.x.ai/v1/images/edits";
const XAI_IMAGE_GEN_URL = "https://api.x.ai/v1/images/generations";
const DEFAULT_IMAGE_MODEL = "grok-imagine-image-2.0";
const STYLE_REF_REL = path.join("public", "muse-styles", "juichat-anime-ref.jpg");

const STYLES: MusePresenceStyle[] = [
  "realistic",
  "soft-glam",
  "anime",
  "cartoon",
  "cyberpunk",
];

const GEN_MODES: CompanionGenMode[] = ["generate", "adjust", "likeness"];

type Body = {
  style?: string;
  /** Muse photo (required for non-Companion looks; optional likeness for Companion). */
  photo?: string;
  /** Last Companion illustration — preferred base for adjust / Nude. */
  priorImage?: string;
  /** Companion path: generate (scratch) | adjust | likeness. */
  mode?: string;
  name?: string;
  looks?: string;
  wardrobe?: Partial<CompanionWardrobe>;
};

type ImageRef = { url: string; type: "image_url" };

let styleRefDataUrl: string | null | undefined;

async function loadAnimeStyleRef(): Promise<string | null> {
  if (styleRefDataUrl !== undefined) return styleRefDataUrl;
  try {
    const abs = path.join(process.cwd(), STYLE_REF_REL);
    const buf = await readFile(abs);
    styleRefDataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
    return styleRefDataUrl;
  } catch {
    styleRefDataUrl = null;
    return null;
  }
}

function resolveQuality(style: MusePresenceStyle): string {
  const qualityEnv = process.env.XAI_IMAGE_QUALITY?.trim().toLowerCase();
  if (qualityEnv === "low" || qualityEnv === "medium" || qualityEnv === "auto") {
    return qualityEnv;
  }
  if (qualityEnv === "high") return "medium";
  return style === "cartoon" || style === "anime" ? "medium" : "low";
}

function isDataImage(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:image/");
}

function tooLarge(dataUrl: string): boolean {
  return dataUrl.length > 3_500_000;
}

function refusalPayload(
  upstreamStatus: number,
  detail: string,
  model: string,
  usedStyleRef: boolean,
  wardrobe: CompanionWardrobe | null,
  mode: CompanionGenMode,
) {
  const detailLower = detail.toLowerCase();
  const authRejected = upstreamStatus === 401 || upstreamStatus === 403;
  const creditsExhausted =
    detailLower.includes("spending limit") ||
    detailLower.includes("available credits") ||
    detailLower.includes("permission-denied");
  const contentBlocked =
    detailLower.includes("content") ||
    detailLower.includes("safety") ||
    detailLower.includes("moderation") ||
    detailLower.includes("refused") ||
    detailLower.includes("content-moderated");
  const askingNude = wardrobe?.clothing === "nude";

  let message =
    "xAI image restyle failed — API key is present; retry or tweak traits.";
  let error = "xai_image_failed";

  if (creditsExhausted) {
    message =
      "xAI image credits/spending limit reached — top up or raise the limit at console.x.ai, then regenerate.";
  } else if (authRejected) {
    message =
      "xAI rejected the API key — rotate XAI_API_KEY in Vercel Production env and redeploy.";
  } else if (askingNude && contentBlocked) {
    error = "nude_refused";
    message =
      "xAI blocked this Nude request (content moderation). Lingerie and other explicit outfits still work — pick Lingerie, or start the Comfy/RunPod undress pod for true nude. Companion will not fake nude with a filter.";
  } else if (contentBlocked) {
    error = "content_refused";
    message =
      "xAI content moderation blocked this Companion request — try softer clothing (Lingerie works) or different traits.";
  }

  return NextResponse.json(
    {
      error,
      status: upstreamStatus,
      detail: detail.slice(0, 500),
      model,
      usedStyleRef,
      mode,
      message,
    },
    { status: 502 },
  );
}

async function parseXaiImageResponse(
  upstream: Response,
): Promise<string | null> {
  const data = (await upstream.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const first = data.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  return null;
}

export async function POST(req: NextRequest) {
  if (!isXaiConfigured()) {
    return NextResponse.json(xaiMissingKeyPayload(), { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const style = body.style as MusePresenceStyle;
  if (!STYLES.includes(style) || style === "realistic") {
    return NextResponse.json(
      {
        error: "style_required",
        message: "Pick soft-glam, anime, cartoon, or cyberpunk.",
      },
      { status: 400 },
    );
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : "Muse";
  const looks =
    typeof body.looks === "string" ? body.looks.slice(0, 400) : undefined;
  const wardrobe =
    style === "cartoon" && body.wardrobe
      ? normalizeWardrobe(body.wardrobe)
      : style === "cartoon"
        ? normalizeWardrobe({})
        : null;

  let mode: CompanionGenMode = "likeness";
  if (style === "cartoon") {
    const requested = (body.mode || "generate") as CompanionGenMode;
    mode = GEN_MODES.includes(requested) ? requested : "generate";
  }

  const photo = isDataImage(body.photo) ? body.photo : "";
  const priorImage = isDataImage(body.priorImage) ? body.priorImage : "";

  // Non-Companion looks still require a Muse photo (edit path).
  if (style !== "cartoon" && !photo) {
    return NextResponse.json(
      { error: "photo_required", message: "Upload a Muse photo first." },
      { status: 400 },
    );
  }

  if (style === "cartoon" && mode === "likeness" && !photo) {
    return NextResponse.json(
      {
        error: "photo_required",
        message: "Add a Muse photo to lock likeness, or Generate Companion from scratch.",
      },
      { status: 400 },
    );
  }

  if (style === "cartoon" && mode === "adjust" && !priorImage && !photo) {
    // Fall back to from-scratch if nothing to adjust yet
    mode = "generate";
  }

  for (const img of [photo, priorImage]) {
    if (img && tooLarge(img)) {
      return NextResponse.json(
        { error: "photo_too_large", message: "Use a smaller image." },
        { status: 413 },
      );
    }
  }

  const prompt = styleEditPrompt(style, name, looks, wardrobe, mode);
  const model = process.env.XAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const apiKey = getXaiApiKey();
  const quality = resolveQuality(style);
  const aspectRatio = style === "cartoon" ? "9:16" : "3:4";

  let usedStyleRef = false;
  let upstreamUrl = XAI_IMAGE_EDITS_URL;
  let editBody: Record<string, unknown>;

  if (style === "cartoon" && mode === "generate") {
    upstreamUrl = XAI_IMAGE_GEN_URL;
    editBody = {
      model,
      prompt,
      aspect_ratio: aspectRatio,
      quality,
      response_format: "b64_json",
      n: 1,
    };
  } else {
    const primary: ImageRef = {
      url:
        style === "cartoon" && mode === "adjust" && priorImage
          ? priorImage
          : photo,
      type: "image_url",
    };
    editBody = {
      model,
      prompt,
      image: primary,
      aspect_ratio: aspectRatio,
      quality,
      response_format: "b64_json",
      n: 1,
    };

    if (styleUsesAnimeStyleRef(style)) {
      const styleRef = await loadAnimeStyleRef();
      if (styleRef) {
        usedStyleRef = true;
        editBody = {
          model,
          prompt,
          images: [
            primary,
            { url: styleRef, type: "image_url" } satisfies ImageRef,
          ],
          aspect_ratio: aspectRatio,
          quality,
          response_format: "b64_json",
          n: 1,
        };
      }
    }
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editBody),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return refusalPayload(
        upstream.status,
        detail,
        model,
        usedStyleRef,
        wardrobe,
        mode,
      );
    }

    const imageUrl = await parseXaiImageResponse(upstream);
    if (!imageUrl) {
      return NextResponse.json(
        { error: "empty_image", model, mode },
        { status: 502 },
      );
    }

    return NextResponse.json({
      image: imageUrl,
      style,
      model,
      usedStyleRef,
      source: "xai",
      mode,
      wardrobe: wardrobe || undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "xai_image_error",
        message: err instanceof Error ? err.message : "request failed",
      },
      { status: 502 },
    );
  }
}
