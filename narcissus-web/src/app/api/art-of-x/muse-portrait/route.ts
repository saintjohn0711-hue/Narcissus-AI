/**
 * Optional styled Muse portrait via xAI image edits.
 * Does NOT use Comfy — GPU pod may be offline. Falls back is client CSS.
 * Companion / Anime attach JuicyChat style-ref as a second edit image.
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
  type MusePresenceStyle,
} from "@/lib/musePresence";

export const runtime = "nodejs";
export const maxDuration = 90;

const XAI_IMAGE_EDITS_URL = "https://api.x.ai/v1/images/edits";
const DEFAULT_IMAGE_MODEL = "grok-imagine-image-2.0";
const STYLE_REF_REL = path.join("public", "muse-styles", "juichat-anime-ref.jpg");

const STYLES: MusePresenceStyle[] = [
  "realistic",
  "soft-glam",
  "anime",
  "cartoon",
  "cyberpunk",
];

type Body = {
  style?: string;
  photo?: string;
  name?: string;
  looks?: string;
  /** Companion customize — Features / Style / Clothing / Nude */
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

  const photo = typeof body.photo === "string" ? body.photo : "";
  if (!photo.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "photo_required", message: "Upload a Muse photo first." },
      { status: 400 },
    );
  }

  // Keep payload reasonable for edge/serverless limits
  if (photo.length > 3_500_000) {
    return NextResponse.json(
      { error: "photo_too_large", message: "Use a smaller Muse photo." },
      { status: 413 },
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
  const prompt = styleEditPrompt(style, name, looks, wardrobe);
  const model =
    process.env.XAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const apiKey = getXaiApiKey();
  // Companion defaults to high for clean Ani-class output; override with XAI_IMAGE_QUALITY.
  // Tradeoff: high costs more credits / latency. Fall back env: medium|low.
  const qualityEnv = process.env.XAI_IMAGE_QUALITY?.trim().toLowerCase();
  const quality =
    qualityEnv === "low" || qualityEnv === "medium" || qualityEnv === "high"
      ? qualityEnv
      : style === "cartoon"
        ? "high"
        : style === "anime"
          ? "medium"
          : "low";

  const museImage: ImageRef = { url: photo, type: "image_url" };
  // Companion full-length standing → tall frame; others stay 3:4
  const aspectRatio = style === "cartoon" ? "9:16" : "3:4";
  let editBody: Record<string, unknown> = {
    model,
    prompt,
    image: museImage,
    aspect_ratio: aspectRatio,
    quality,
    response_format: "b64_json",
    n: 1,
  };

  let usedStyleRef = false;
  if (styleUsesAnimeStyleRef(style)) {
    const styleRef = await loadAnimeStyleRef();
    if (styleRef) {
      usedStyleRef = true;
      // Multi-image: Image 1 = Muse identity, Image 2 = JuicyChat style bible
      editBody = {
        model,
        prompt,
        images: [
          museImage,
          { url: styleRef, type: "image_url" } satisfies ImageRef,
        ],
        aspect_ratio: aspectRatio,
        quality,
        response_format: "b64_json",
        n: 1,
      };
    }
  }

  try {
    const upstream = await fetch(XAI_IMAGE_EDITS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editBody),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      const detailLower = detail.toLowerCase();
      const authRejected = upstream.status === 401 || upstream.status === 403;
      const creditsExhausted =
        detailLower.includes("spending limit") ||
        detailLower.includes("available credits") ||
        detailLower.includes("permission-denied");
      const contentBlocked =
        detailLower.includes("content") ||
        detailLower.includes("safety") ||
        detailLower.includes("moderation") ||
        detailLower.includes("refused");
      const askingNude = wardrobe?.clothing === "nude";
      let message =
        "xAI image restyle failed — API key is present; retry or use another Muse photo.";
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
          "xAI refused this Nude request — Companion will not fake nude with a clothed photo filter.";
      }
      return NextResponse.json(
        {
          error,
          status: upstream.status,
          detail: detail.slice(0, 500),
          model,
          usedStyleRef,
          message,
        },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = data.data?.[0];
    let imageUrl: string | null = null;
    if (first?.b64_json) {
      imageUrl = `data:image/png;base64,${first.b64_json}`;
    } else if (first?.url) {
      imageUrl = first.url;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "empty_image", model },
        { status: 502 },
      );
    }

    return NextResponse.json({
      image: imageUrl,
      style,
      model,
      usedStyleRef,
      source: "xai",
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
