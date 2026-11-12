import { NextRequest, NextResponse } from "next/server";
import {
  dreamMuseCatalogPromptBlock,
  parseDreamMuseLocal,
  sanitizeDreamMuseFill,
  type DreamMuseFill,
} from "@/lib/dreamMuse";
import {
  extractXaiText,
  getXaiConfig,
  isXaiConfigured,
  xaiChatCompletion,
} from "@/lib/xai";

export const runtime = "nodejs";
export const maxDuration = 45;

type Body = {
  description?: string;
};

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fall through
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "description_required" }, { status: 400 });
  }

  const local = parseDreamMuseLocal(description);

  if (!isXaiConfigured()) {
    return NextResponse.json({
      fill: local.fill,
      source: "local" as const,
      note: `${local.note} (xAI unavailable — local keywords used.)`,
    });
  }

  const cfg = getXaiConfig()!;
  const system = [
    "You map a free-text dream Muse description onto Narcissus Art of X Muse form fields.",
    "Adults 18+ only. Return ONLY a JSON object — no markdown, no preamble.",
    "Use ONLY tags from the allowed catalogs. Omit fields you cannot infer.",
    "Prefer Dream type unless the text clearly says Real or Wanted.",
    "Put appearance into looks; relationship/power vibe into dynamics + dynTags; desires into kinks; past acts into doneActs only when clearly already done.",
    "",
    dreamMuseCatalogPromptBlock(),
    "",
    'JSON shape: { "name"?: string, "type"?: "Real"|"Dream"|"Wanted", "gender"?: string, "isCouple"?: boolean, "partnerA"?: string, "partnerB"?: string, "looks"?: string, "notes"?: string, "history"?: string, "dynamics"?: string, "locations"?: string, "dynTags"?: string[], "doneActs"?: string[], "kinks"?: Array<{tag,role,status,intensity}> }',
  ].join("\n");

  try {
    const upstream = await xaiChatCompletion({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Dream Muse description:\n"""\n${description.slice(0, 4000)}\n"""`,
        },
      ],
      temperature: 0.35,
      maxTokens: 900,
      stream: false,
    });

    if (!upstream.ok) {
      return NextResponse.json({
        fill: local.fill,
        source: "local" as const,
        note: `${local.note} (xAI failed — local keywords used.)`,
        model: cfg.model,
      });
    }

    const data = await upstream.json();
    const text = extractXaiText(data);
    const parsed = extractJsonObject(text);
    const fill: DreamMuseFill = sanitizeDreamMuseFill(parsed);

    // If LLM returned almost nothing, fall back to local chips.
    const chipCount =
      (fill.kinks?.length || 0) +
      (fill.dynTags?.length || 0) +
      (fill.doneActs?.length || 0);
    if (chipCount === 0 && !fill.looks && !fill.name) {
      return NextResponse.json({
        fill: local.fill,
        source: "local" as const,
        note: `${local.note} (xAI returned little — local keywords used.)`,
        model: cfg.model,
      });
    }

    // Merge local keyword chips under LLM so catalog hits are not lost.
    const merged: DreamMuseFill = {
      ...local.fill,
      ...fill,
      dynTags: [
        ...new Set([...(local.fill.dynTags || []), ...(fill.dynTags || [])]),
      ],
      doneActs: [
        ...new Set([...(local.fill.doneActs || []), ...(fill.doneActs || [])]),
      ],
      kinks: (() => {
        const map = new Map(
          [...(local.fill.kinks || []), ...(fill.kinks || [])].map((k) => [
            k.tag,
            k,
          ]),
        );
        return [...map.values()];
      })(),
    };

    const picked =
      (merged.kinks?.length || 0) +
      (merged.dynTags?.length || 0) +
      (merged.doneActs?.length || 0);

    return NextResponse.json({
      fill: merged,
      source: "xai" as const,
      note: `Filled from description via xAI${picked ? ` · ${picked} chips` : ""} — tweak before saving.`,
      model: cfg.model,
    });
  } catch {
    return NextResponse.json({
      fill: local.fill,
      source: "local" as const,
      note: `${local.note} (xAI error — local keywords used.)`,
    });
  }
}
