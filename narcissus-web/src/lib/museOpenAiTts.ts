/**
 * OpenAI TTS mapping for Muse chat narration.
 * Server-safe — used by `/api/art-of-x/tts` (and mirrored in docs).
 *
 * Requires `OPENAI_API_KEY`. No ElevenLabs path unless that secret is provisioned.
 */

import {
  getVoiceAccent,
  getVoicePreset,
  normalizeVoiceAccent,
  normalizeVoiceGender,
  normalizeVoicePreset,
  type MuseVoiceAccentId,
  type MuseVoiceGender,
  type MuseVoicePresetId,
  type MuseVoiceSettings,
} from "@/lib/museVoice";

export type OpenAiTtsVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer"
  | "verse"
  | "marin"
  | "cedar";

export type OpenAiTtsPlan = {
  model: string;
  voice: OpenAiTtsVoice;
  instructions: string;
  speed: number;
  gender: MuseVoiceGender;
  preset: MuseVoicePresetId;
  accent: MuseVoiceAccentId;
};

const ACCENT_INSTRUCTIONS: Record<MuseVoiceAccentId, string> = {
  auto: "Speak clear, natural English.",
  "en-US": "Speak with a natural American English accent.",
  "en-GB": "Speak with a clear British English accent.",
  "en-AU": "Speak with an Australian English accent.",
  "en-IE": "Speak with an Irish English accent.",
  "en-IN": "Speak with an Indian English accent.",
  "en-ZA": "Speak with a South African English accent.",
  "fr-FR":
    "Prefer French when the text is French; otherwise speak English with a light French accent.",
  "es-ES":
    "Prefer Spanish (Spain) when the text is Spanish; otherwise speak English with a light Spanish accent.",
  "es-MX":
    "Prefer Mexican Spanish when the text is Spanish; otherwise speak English with a light Mexican Spanish accent.",
  "it-IT":
    "Prefer Italian when the text is Italian; otherwise speak English with a light Italian accent.",
  "pt-BR":
    "Prefer Brazilian Portuguese when the text is Portuguese; otherwise speak English with a light Brazilian Portuguese accent.",
  "de-DE":
    "Prefer German when the text is German; otherwise speak English with a light German accent.",
  "nl-NL":
    "Prefer Dutch when the text is Dutch; otherwise speak English with a light Dutch accent.",
};

type VoicePick = {
  voice: OpenAiTtsVoice;
  tone: string;
};

function pickVoice(
  gender: MuseVoiceGender,
  preset: MuseVoicePresetId,
): VoicePick {
  if (gender === "female") {
    switch (preset) {
      case "sultry":
        return {
          voice: "coral",
          tone: "Speak in a low, intimate, sultry tone — unhurried and close.",
        };
      case "soft":
        return {
          voice: "sage",
          tone: "Speak gently and softly, warm and caring.",
        };
      case "bright":
        return {
          voice: "nova",
          tone: "Speak with a bright, clear, lively tone.",
        };
      case "auto":
      default:
        return {
          voice: "marin",
          tone: "Speak naturally, warm and conversational, as a close companion.",
        };
    }
  }

  switch (preset) {
    case "deep":
      return {
        voice: "onyx",
        tone: "Speak in a deep, resonant male register — calm and grounded.",
      };
    case "warm":
      return {
        voice: "ash",
        tone: "Speak with a warm, friendly male conversational tone.",
      };
    case "smooth":
      return {
        voice: "ballad",
        tone: "Speak smoothly and confidently, steady male delivery.",
      };
    case "auto":
    default:
      return {
        voice: "cedar",
        tone: "Speak naturally, warm and conversational, as a close companion.",
      };
  }
}

function clampSpeed(rate: number): number {
  // Muse presets use ~0.88–1.02; OpenAI speed is 0.25–4.0.
  const mapped = Math.max(0.85, Math.min(1.15, rate));
  return Math.round(mapped * 100) / 100;
}

/** Resolve gender / accent / preset → OpenAI TTS request fields. */
export function planOpenAiTts(
  settings: Pick<MuseVoiceSettings, "gender" | "preset" | "accent"> & {
    gender?: MuseVoiceGender | string;
    preset?: MuseVoicePresetId | string;
    accent?: MuseVoiceAccentId | string;
  },
): OpenAiTtsPlan {
  const gender = normalizeVoiceGender(settings.gender);
  const preset = normalizeVoicePreset(settings.preset, gender);
  const accent = normalizeVoiceAccent(settings.accent);
  const pick = pickVoice(gender, preset);
  const presetDef = getVoicePreset(preset);
  const accentLine = ACCENT_INSTRUCTIONS[accent] || ACCENT_INSTRUCTIONS.auto;
  const accentDef = getVoiceAccent(accent);

  const instructions = [
    "You are narrating a private companion chat message.",
    "Sound human and natural — not robotic, not announcer-like.",
    pick.tone,
    accentLine,
    accentDef.lang
      ? `Locale preference: ${accentDef.lang} (${accentDef.blurb}).`
      : "",
    "Keep pacing natural; pause briefly at punctuation.",
  ]
    .filter(Boolean)
    .join(" ");

  const model =
    process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";

  return {
    model,
    voice: pick.voice,
    instructions,
    speed: clampSpeed(presetDef.rate),
    gender,
    preset,
    accent,
  };
}

export function resolveOpenAiTtsKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function isOpenAiTtsConfigured(): boolean {
  return Boolean(resolveOpenAiTtsKey());
}

/** Max chars sent to OpenAI speech (API hard limit is 4096). */
export const OPENAI_TTS_MAX_CHARS = 4000;
