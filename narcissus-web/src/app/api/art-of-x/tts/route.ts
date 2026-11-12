import { NextRequest, NextResponse } from "next/server";
import {
  isMuseVoiceAccentId,
  isMuseVoiceGender,
  isMuseVoicePresetId,
  textForSpeech,
  type MuseVoiceAccentId,
  type MuseVoiceGender,
  type MuseVoicePresetId,
} from "@/lib/museVoice";
import {
  isOpenAiTtsConfigured,
  OPENAI_TTS_MAX_CHARS,
  planOpenAiTts,
  resolveOpenAiTtsKey,
} from "@/lib/museOpenAiTts";

export const runtime = "nodejs";
export const maxDuration = 60;

type TtsBody = {
  text?: string;
  gender?: string;
  preset?: string;
  accent?: string;
  /** Optional preview flag — same engine, shorter cache hint. */
  preview?: boolean;
};

function parseSettings(body: TtsBody): {
  gender: MuseVoiceGender;
  preset: MuseVoicePresetId;
  accent: MuseVoiceAccentId;
} {
  const gender: MuseVoiceGender = isMuseVoiceGender(body.gender)
    ? body.gender
    : "female";
  const preset: MuseVoicePresetId = isMuseVoicePresetId(body.preset)
    ? body.preset
    : "auto";
  const accent: MuseVoiceAccentId = isMuseVoiceAccentId(body.accent)
    ? body.accent
    : "auto";
  return { gender, preset, accent };
}

/** Probe whether natural OpenAI TTS is configured (no audio). */
export async function GET() {
  const available = isOpenAiTtsConfigured();
  return NextResponse.json({
    available,
    provider: available ? "openai" : null,
    fallback: "web-speech",
    secret: "OPENAI_API_KEY",
    model: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
  });
}

/**
 * Natural Muse chat TTS — OpenAI `gpt-4o-mini-tts` → audio/mpeg.
 * Client falls back to Web Speech when this returns 503 / network error.
 */
export async function POST(req: NextRequest) {
  const key = resolveOpenAiTtsKey();
  if (!key) {
    return NextResponse.json(
      {
        error: "missing_openai_key",
        message:
          "Set OPENAI_API_KEY on the Vercel project (Production + Preview) for natural Muse chat TTS. Browser Web Speech remains the offline fallback.",
        fallback: "web-speech",
      },
      { status: 503 },
    );
  }

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
    return NextResponse.json(
      {
        error: "openai_tts_failed",
        status: upstream.status,
        detail: detail.slice(0, 400),
        fallback: "web-speech",
      },
      { status: 502 },
    );
  }

  const audio = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(audio, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": body.preview
        ? "no-store"
        : "private, max-age=60",
      "X-Muse-TTS-Provider": "openai",
      "X-Muse-TTS-Voice": plan.voice,
      "X-Muse-TTS-Model": plan.model,
      "X-Muse-TTS-Gender": plan.gender,
      "X-Muse-TTS-Preset": plan.preset,
      "X-Muse-TTS-Accent": plan.accent,
    },
  });
}
