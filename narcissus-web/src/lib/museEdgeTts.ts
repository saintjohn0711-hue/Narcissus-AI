/**
 * Keyless Microsoft Edge neural TTS for Muse chat.
 * Used when OPENAI_API_KEY is absent — server-side WebSocket (Node only).
 * Studio video mux still uses Python `lib/tts.ts` on the Comfy host.
 */

import { EdgeTTS } from "node-edge-tts";
import {
  getVoiceAccent,
  getVoicePreset,
  getVoiceRate,
  normalizeVoiceAccent,
  normalizeVoiceGender,
  normalizeVoicePreset,
  normalizeVoiceRate,
  type MuseVoiceAccentId,
  type MuseVoiceGender,
  type MuseVoicePresetId,
  type MuseVoiceRateId,
  type MuseVoiceSettings,
} from "@/lib/museVoice";

export type EdgeTtsPlan = {
  voice: string;
  lang: string;
  rate: string;
  pitch: string;
  gender: MuseVoiceGender;
  preset: MuseVoicePresetId;
  rateId: MuseVoiceRateId;
  accent: MuseVoiceAccentId;
};

/** Accent → preferred Edge Neural voice (femme / masc). */
const EDGE_VOICE_BY_ACCENT: Record<
  MuseVoiceAccentId,
  { female: string; male: string; lang: string }
> = {
  auto: {
    female: "en-US-AriaNeural",
    male: "en-US-GuyNeural",
    lang: "en-US",
  },
  "en-US": {
    female: "en-US-AriaNeural",
    male: "en-US-GuyNeural",
    lang: "en-US",
  },
  "en-GB": {
    female: "en-GB-SoniaNeural",
    male: "en-GB-RyanNeural",
    lang: "en-GB",
  },
  "en-AU": {
    female: "en-AU-NatashaNeural",
    male: "en-AU-WilliamNeural",
    lang: "en-AU",
  },
  "en-IE": {
    female: "en-IE-EmilyNeural",
    male: "en-IE-ConnorNeural",
    lang: "en-IE",
  },
  "en-IN": {
    female: "en-IN-NeerjaNeural",
    male: "en-IN-PrabhatNeural",
    lang: "en-IN",
  },
  "en-ZA": {
    female: "en-ZA-LeahNeural",
    male: "en-ZA-LukeNeural",
    lang: "en-ZA",
  },
  "fr-FR": {
    female: "fr-FR-DeniseNeural",
    male: "fr-FR-HenriNeural",
    lang: "fr-FR",
  },
  "es-ES": {
    female: "es-ES-ElviraNeural",
    male: "es-ES-AlvaroNeural",
    lang: "es-ES",
  },
  "es-MX": {
    female: "es-MX-DaliaNeural",
    male: "es-MX-JorgeNeural",
    lang: "es-MX",
  },
  "it-IT": {
    female: "it-IT-ElsaNeural",
    male: "it-IT-DiegoNeural",
    lang: "it-IT",
  },
  "pt-BR": {
    female: "pt-BR-FranciscaNeural",
    male: "pt-BR-AntonioNeural",
    lang: "pt-BR",
  },
  "de-DE": {
    female: "de-DE-KatjaNeural",
    male: "de-DE-ConradNeural",
    lang: "de-DE",
  },
  "nl-NL": {
    female: "nl-NL-FennaNeural",
    male: "nl-NL-MaartenNeural",
    lang: "nl-NL",
  },
};

/** Preset swaps within the same locale family for more character. */
function presetVoiceOverride(
  gender: MuseVoiceGender,
  preset: MuseVoicePresetId,
  accent: MuseVoiceAccentId,
): string | null {
  if (accent !== "auto" && accent !== "en-US") return null;
  if (gender === "female") {
    switch (preset) {
      case "sultry":
        return "en-US-JennyNeural";
      case "soft":
        return "en-US-AvaNeural";
      case "bright":
        return "en-US-SaraNeural";
      case "sexy":
        return "en-US-MichelleNeural";
      case "dominant":
        return "en-US-AriaNeural";
      default:
        return null;
    }
  }
  switch (preset) {
    case "deep":
      return "en-US-DavisNeural";
    case "warm":
      return "en-US-AndrewNeural";
    case "smooth":
      return "en-US-BrianNeural";
    case "sexy":
      return "en-US-ChristopherNeural";
    case "dominant":
      return "en-US-DavisNeural";
    default:
      return null;
  }
}

function ratePctToEdge(edgePct: number): string {
  const clamped = Math.max(-35, Math.min(15, Math.round(edgePct)));
  if (clamped === 0) return "default";
  return clamped > 0 ? `+${clamped}%` : `${clamped}%`;
}

function pitchToEdge(pitch: number): string {
  const pct = Math.round((pitch - 1) * 100);
  const clamped = Math.max(-15, Math.min(15, pct));
  if (clamped === 0) return "default";
  return clamped > 0 ? `+${clamped}%` : `${clamped}%`;
}

export function planEdgeTts(
  settings: Pick<MuseVoiceSettings, "gender" | "preset" | "accent" | "rate"> & {
    gender?: MuseVoiceGender | string;
    preset?: MuseVoicePresetId | string;
    accent?: MuseVoiceAccentId | string;
    rate?: MuseVoiceRateId | string;
  },
): EdgeTtsPlan {
  const gender = normalizeVoiceGender(settings.gender);
  const preset = normalizeVoicePreset(settings.preset, gender);
  const accent = normalizeVoiceAccent(settings.accent);
  const rateId = normalizeVoiceRate(settings.rate);
  const base = EDGE_VOICE_BY_ACCENT[accent] || EDGE_VOICE_BY_ACCENT.auto;
  const override = presetVoiceOverride(gender, preset, accent);
  const voice =
    override || (gender === "female" ? base.female : base.male);
  const presetDef = getVoicePreset(preset);
  const rateDef = getVoiceRate(rateId);
  const accentDef = getVoiceAccent(accent);

  return {
    voice,
    lang: base.lang || accentDef.lang || "en-US",
    rate: ratePctToEdge(rateDef.edgePct),
    pitch: pitchToEdge(presetDef.pitch),
    gender,
    preset,
    rateId,
    accent,
  };
}

/** Synthesize MP3 bytes via Edge neural voices (no API key). */
export async function synthesizeEdgeMp3(
  text: string,
  settings: Pick<MuseVoiceSettings, "gender" | "preset" | "accent" | "rate">,
): Promise<{ audio: Buffer; plan: EdgeTtsPlan }> {
  const plan = planEdgeTts(settings);
  const tts = new EdgeTTS({
    voice: plan.voice,
    lang: plan.lang,
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    rate: plan.rate,
    pitch: plan.pitch,
    timeout: 45000,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of tts.streamAudio(text)) {
    if (Buffer.isBuffer(chunk)) chunks.push(chunk);
  }
  const audio = Buffer.concat(chunks);
  if (!audio.length) {
    throw new Error("edge_tts_empty");
  }
  return { audio, plan };
}

/** Edge path needs no secret — always “configured” on Node. */
export function isEdgeTtsAvailable(): boolean {
  return true;
}
