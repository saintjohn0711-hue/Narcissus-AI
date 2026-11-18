import { NextRequest, NextResponse } from "next/server";
import {
  isMuseVoiceAccentId,
  isMuseVoiceGender,
  isMuseVoicePresetId,
  isMuseVoiceRateId,
  textForSpeech,
  type MuseVoiceAccentId,
  type MuseVoiceGender,
  type MuseVoicePresetId,
  type MuseVoiceRateId,
} from "@/lib/museVoice";
import {
  isOpenAiTtsConfigured,
  OPENAI_TTS_DEFAULT_MODEL,
  OPENAI_TTS_MAX_CHARS,
  planOpenAiTts,
  resolveOpenAiTtsKey,
} from "@/lib/museOpenAiTts";
import { synthesizeEdgeMp3 } from "@/lib/museEdgeTts";

export const runtime = "nodejs";
export const maxDuration = 60;

type TtsBody = {
  text?: string;
  gender?: string;
  preset?: string;
  rate?: string;
  accent?: string;
  /** Optional preview flag — same engine, shorter cache hint. */
  preview?: boolean;
};

function parseSettings(body: TtsBody): {
  gender: MuseVoiceGender;
  preset: MuseVoicePresetId;
  rate: MuseVoiceRateId;
  accent: MuseVoiceAccentId;
} {
  const gender: MuseVoiceGender = isMuseVoiceGender(body.gender)
    ? body.gender
    : "female";
  const preset: MuseVoicePresetId = isMuseVoicePresetId(body.preset)
    ? body.preset
    : "auto";
  const rate: MuseVoiceRateId = isMuseVoiceRateId(body.rate)
    ? body.rate
    : "normal";
  const accent: MuseVoiceAccentId = isMuseVoiceAccentId(body.accent)
    ? body.accent
    : "auto";
  return { gender, preset, rate, accent };
}

/**
 * Probe whether server TTS can return audio.
 * OpenAI when `OPENAI_API_KEY` is set; otherwise keyless Edge neural.
 */
export async function GET() {
  const openai = isOpenAiTtsConfigured();
  return NextResponse.json({
    available: true,
    provider: openai ? "openai" : "edge",
    openaiConfigured: openai,
    edgeFallback: true,
    fallback: "web-speech",
    secret: "OPENAI_API_KEY",
    model: openai
      ? process.env.OPENAI_TTS_MODEL?.trim() || OPENAI_TTS_DEFAULT_MODEL
      : "edge-neural",
    hint: openai
      ? null
      : "Server uses Microsoft Edge neural TTS (no key). Add OPENAI_API_KEY on Vercel (Production + Preview) and redeploy for OpenAI marin/cedar-class voices.",
  });
}

async function synthesizeOpenAi(
  cleaned: string,
  settings: ReturnType<typeof parseSettings>,
): Promise<{ audio: Buffer; plan: ReturnType<typeof planOpenAiTts> } | null> {
  const key = resolveOpenAiTtsKey();
  if (!key) return null;

  const plan = planOpenAiTts(settings);
  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: plan.model,
      voice: plan.voice,
      input: cleaned,
      instructions: plan.instructions,
      speed: plan.speed,
      response_format: "mp3",
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(
      `openai_tts_failed ${upstream.status}: ${detail.slice(0, 200)}`,
    );
  }

  const audio = Buffer.from(await upstream.arrayBuffer());
  return { audio, plan };
}

/**
 * Muse chat TTS → audio/mpeg.
 * 1) OpenAI `gpt-4o-mini-tts` when `OPENAI_API_KEY` is set
 * 2) Microsoft Edge neural (keyless) otherwise
 * Client falls back to Web Speech only if this returns errors.
 */
export async function POST(req: NextRequest) {
  let body: TtsBody;
  try {
    body = (await req.json()) as TtsBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const cleaned = textForSpeech(String(body.text || "")).slice(
    0,
    OPENAI_TTS_MAX_CHARS,
  );
  if (!cleaned) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  const settings = parseSettings(body);
  const cacheControl = body.preview ? "no-store" : "private, max-age=60";

  // Prefer OpenAI when configured.
  if (isOpenAiTtsConfigured()) {
    try {
      const result = await synthesizeOpenAi(cleaned, settings);
      if (result) {
        return new NextResponse(new Uint8Array(result.audio), {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": cacheControl,
            "X-Muse-TTS-Provider": "openai",
            "X-Muse-TTS-Voice": result.plan.voice,
            "X-Muse-TTS-Model": result.plan.model,
            "X-Muse-TTS-Gender": result.plan.gender,
            "X-Muse-TTS-Preset": result.plan.preset,
            "X-Muse-TTS-Rate": result.plan.rate,
            "X-Muse-TTS-Accent": result.plan.accent,
          },
        });
      }
    } catch {
      // Soft-fall through to Edge so chat Play still works.
    }
  }

  try {
    const { audio, plan } = await synthesizeEdgeMp3(cleaned, settings);
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": cacheControl,
        "X-Muse-TTS-Provider": "edge",
        "X-Muse-TTS-Voice": plan.voice,
        "X-Muse-TTS-Model": "edge-neural",
        "X-Muse-TTS-Gender": plan.gender,
        "X-Muse-TTS-Preset": plan.preset,
        "X-Muse-TTS-Rate": plan.rateId,
        "X-Muse-TTS-Accent": plan.accent,
      },
    });
  } catch (err) {
    const detail =
      err instanceof Error ? err.message.slice(0, 400) : "edge_tts_failed";
    return NextResponse.json(
      {
        error: "tts_failed",
        detail,
        fallback: "web-speech",
        secret: isOpenAiTtsConfigured() ? null : "OPENAI_API_KEY",
      },
      { status: 502 },
    );
  }
}
