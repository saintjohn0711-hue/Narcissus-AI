import { NextRequest, NextResponse } from "next/server";
import {
  extractXaiText,
  getXaiConfig,
  isXaiConfigured,
  xaiChatCompletion,
} from "@/lib/xai";
import {
  heuristicExtractMemories,
  normalizeMemories,
  type MuseMemory,
  type MuseMemoryKind,
} from "@/lib/museChatMemory";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  userText?: string;
  museReply?: string;
  pairWith?: number | null;
};

/**
 * Extract durable memories from a chat turn.
 * Prefers xAI JSON when configured; falls back to local heuristics
 * (relationship “Joey is my boyfriend”, bi preference, remember…, etc.).
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const userText = typeof body.userText === "string" ? body.userText.trim() : "";
  const museReply =
    typeof body.museReply === "string" ? body.museReply.trim() : "";
  if (!userText && !museReply) {
    return NextResponse.json({ memories: [] as MuseMemory[] });
  }

  const pairRaw = body.pairWith as unknown;
  const pairWith =
    pairRaw == null || pairRaw === ""
      ? null
      : Number.isFinite(Number(pairRaw))
        ? Number(pairRaw)
        : null;

  const fallback = heuristicExtractMemories(userText, museReply, { pairWith });

  if (!isXaiConfigured()) {
    return NextResponse.json({ memories: fallback, source: "heuristic" });
  }

  const cfg = getXaiConfig()!;
  try {
    const upstream = await xaiChatCompletion({
      messages: [
        {
          role: "system",
          content: [
            "Extract durable adult erotic chat memories as JSON only.",
            'Return {"memories":[{"text":"...","kind":"fact|relationship|kink|place|nickname|scene|preference|mode"}]}',
            "Kinds: relationship = partner name + role (boyfriend/girlfriend/etc.); preference = orientation/play wants (e.g. wants Joey bisexual); fact/kink/place/nickname/scene/mode as fits.",
            "Only lasting facts worth bringing up later — max 4, short phrases, no dialogue quotes.",
            "If nothing durable, return {\"memories\":[]}.",
            "Adults 18+ only.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `User said:\n${userText || "(empty)"}\n\nMuse replied:\n${museReply || "(empty)"}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 400,
      stream: false,
    });

    if (!upstream.ok) {
      return NextResponse.json({ memories: fallback, source: "heuristic" });
    }

    const data = await upstream.json();
    const text = extractXaiText(data);
    const parsed = parseMemoriesJson(text, pairWith);
    const merged = normalizeMemories([...parsed, ...fallback]);
    return NextResponse.json({
      memories: merged,
      source: parsed.length ? "xai" : "heuristic",
      model: cfg.model,
    });
  } catch {
    return NextResponse.json({ memories: fallback, source: "heuristic" });
  }
}

function parseMemoriesJson(
  text: string,
  pairWith: number | null,
): MuseMemory[] {
  if (!text.trim()) return [];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  try {
    const json = JSON.parse(text.slice(start, end + 1)) as {
      memories?: Array<{ text?: string; kind?: string }>;
    };
    const now = new Date().toISOString();
    return normalizeMemories(
      (json.memories || []).map((m, i) => ({
        id: `mem_xai_${Date.now()}_${i}`,
        text: String(m.text || ""),
        kind: (m.kind || "fact") as MuseMemoryKind,
        at: now,
        source: "auto" as const,
        pairWith,
      })),
    );
  } catch {
    return [];
  }
}
