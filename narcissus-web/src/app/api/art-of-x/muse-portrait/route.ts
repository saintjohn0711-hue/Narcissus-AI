/**
 * Optional styled Muse portrait via xAI image edits.
 * Does NOT use Comfy — GPU pod may be offline. Falls back is client CSS.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getXaiApiKey,
  isXaiConfigured,
  xaiMissingKeyPayload,
} from "@/lib/xai";
import {
  styleEditPrompt,
  type MusePresenceStyle,
} from "@/lib/musePresence";

export const runtime = "nodejs";
export const maxDuration = 90;

const XAI_IMAGE_EDITS_URL = "https://api.x.ai/v1/images/edits";
const DEFAULT_IMAGE_MODEL = "grok-imagine-image-2.0";

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
};

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
  const prompt = styleEditPrompt(style, name, looks);
  const model =
    process.env.XAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const apiKey = getXaiApiKey();
  // Anime / Cartoon AI identity stylization benefits from medium quality.
  const quality =
    style === "anime" || style === "cartoon" ? "medium" : "low";

  try {
    const upstream = await fetch(XAI_IMAGE_EDITS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        image: { url: photo, type: "image_url" },
        aspect_ratio: "3:4",
        quality,
        response_format: "b64_json",
        n: 1,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: "xai_image_failed",
          status: upstream.status,
          detail: detail.slice(0, 500),
          model,
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

    return NextResponse.json({ image: imageUrl, style, model });
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
