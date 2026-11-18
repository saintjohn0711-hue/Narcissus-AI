/**
 * OpenAI TTS mapping for Muse chat narration.
 * Server-safe — used by `/api/art-of-x/tts` (and mirrored in docs).
 *
 * Requires `OPENAI_API_KEY`. Prefers OpenAI’s highest-quality instruction
 * voices (`marin` / `cedar`) with structured delivery prompts so Companion
 * chat sounds human — not robotic Web Speech / announcer TTS.
 *
 * No ElevenLabs path unless that secret is provisioned.
 */

import {
  getVoiceAccent,
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
  rate: MuseVoiceRateId;
  accent: MuseVoiceAccentId;
};

/** Stable alias; override with `OPENAI_TTS_MODEL` (e.g. dated snapshot). */
export const OPENAI_TTS_DEFAULT_MODEL = "gpt-4o-mini-tts";

const ACCENT_INSTRUCTIONS: Record<MuseVoiceAccentId, string> = {
  auto: "Accent: natural clear English.",
  "en-US": "Accent: natural American English.",
  "en-GB": "Accent: clear British English.",
  "en-AU": "Accent: Australian English.",
  "en-IE": "Accent: soft Irish English.",
  "en-IN": "Accent: Indian English.",
  "en-ZA": "Accent: South African English.",
  "fr-FR":
    "Accent: light French when speaking English; prefer French if the text is French.",
  "es-ES":
    "Accent: light Spanish (Spain) when speaking English; prefer Spanish if the text is Spanish.",
  "es-MX":
    "Accent: light Mexican Spanish when speaking English; prefer Spanish if the text is Spanish.",
  "it-IT":
    "Accent: light Italian when speaking English; prefer Italian if the text is Italian.",
  "pt-BR":
    "Accent: light Brazilian Portuguese when speaking English; prefer Portuguese if the text is Portuguese.",
  "de-DE":
    "Accent: light German when speaking English; prefer German if the text is German.",
  "nl-NL":
    "Accent: light Dutch when speaking English; prefer Dutch if the text is Dutch.",
};

type VoicePick = {
  voice: OpenAiTtsVoice;
  /** Structured delivery lines (Affect / Tone / Pacing / Emotion / …). */
  delivery: string[];
};

/**
 * Prefer OpenAI’s flagship-quality `marin` (femme) / `cedar` (masc).
 * Strong character presets keep a distinct base voice, then instructions
 * pull the read toward intimate companion speech.
 */
function pickVoice(
  gender: MuseVoiceGender,
  preset: MuseVoicePresetId,
  accent: MuseVoiceAccentId,
): VoicePick {
  // Shared sexy / Dominant — distinct from sultry/soft/bright/deep.
  if (preset === "sexy") {
    if (gender === "female") {
      return {
        voice: "shimmer",
        delivery: [
          "Voice Affect: teasing, breathy, sexually charged companion.",
          "Tone: flirtatious heat with a knowing smile — playful, not shy.",
          "Pacing: linger on desire words; soft laughs at the edges.",
          "Emotion: lusty invitation and mischievous confidence.",
          "Pauses: sensual breaths; never rush the tease.",
          "Delivery: sexy pillow talk aimed at one person — never announcer.",
        ],
      };
    }
    return {
      voice: "verse",
      delivery: [
        "Voice Affect: seductive male heat with a low smile in the voice.",
        "Tone: flirtatious, charged, privately filthy without cartoon growl.",
        "Pacing: unhurried pull; lean into suggestive lines.",
        "Emotion: hungry confidence and warm desire.",
        "Pauses: brief charged beats; let heat land.",
        "Delivery: intimate seduction — human, not radio host.",
      ],
    };
  }
  if (preset === "dominant") {
    if (gender === "female") {
      return {
        voice: "alloy",
        delivery: [
          "Voice Affect: commanding Domme — clear, firm, controlled.",
          "Tone: authoritative and intimate; she already owns the room.",
          "Pacing: deliberate orders; weight on key commands.",
          "Emotion: cool control with heated certainty — never shrill.",
          "Pauses: let instructions land; no nervous filler.",
          "Delivery: Domme speaking to her submissive — never theatrical villain.",
        ],
      };
    }
    return {
      voice: "onyx",
      delivery: [
        "Voice Affect: commanding Dom — deep, steady, decisive.",
        "Tone: quiet authority; ownership without cartoon menace.",
        "Pacing: measured; weight on directives.",
        "Emotion: controlled desire and firm expectation.",
        "Pauses: deliberate; silence as power.",
        "Delivery: Dom speaking to his submissive — human, never announcer.",
      ],
    };
  }

  // British auto → fable’s UK lean still sounds more natural than forcing marin.
  if (gender === "female") {
    switch (preset) {
      case "sultry":
        return {
          voice: "coral",
          delivery: [
            "Voice Affect: intimate close-mic companion; soft breath at edges.",
            "Tone: low, sultry, unhurried — private, never theatrical.",
            "Pacing: slow and deliberate; linger on desire without rushing.",
            "Emotion: warm heat and quiet confidence.",
            "Pauses: short breath between sentences; never choppy.",
            "Delivery: speak like you are inches away — not a voiceover.",
          ],
        };
      case "soft":
        return {
          voice: "marin",
          delivery: [
            "Voice Affect: gentle, airy, caring companion.",
            "Tone: soft and reassuring; light smile in the voice.",
            "Pacing: easy and unhurried; never clipped.",
            "Emotion: tenderness and quiet affection.",
            "Pauses: soft breaths at commas; settle at periods.",
            "Delivery: pillow-talk intimacy — human, not narrator.",
          ],
        };
      case "bright":
        return {
          voice: "nova",
          delivery: [
            "Voice Affect: clear, lively, playful companion.",
            "Tone: bright and warm without sounding chirpy or salesy.",
            "Pacing: lightly energetic; still conversational.",
            "Emotion: curiosity and flirtatious cheer.",
            "Pauses: natural turn-taking beats, not robotic ticks.",
            "Delivery: like a witty friend on a call — never announcer.",
          ],
        };
      case "auto":
      default: {
        const british = accent === "en-GB" || accent === "en-IE";
        return {
          voice: british ? "fable" : "marin",
          delivery: [
            "Voice Affect: natural, polished companion — OpenAI flagship quality.",
            "Tone: warm, conversational, emotionally present.",
            "Pacing: everyday speech rhythm; slight variation, not metronome.",
            "Emotion: easy closeness and attentive interest.",
            "Pauses: brief human breaths at punctuation.",
            "Delivery: private chat message — never robotic or news-reader.",
          ],
        };
      }
    }
  }

  switch (preset) {
    case "deep":
      return {
        voice: "onyx",
        delivery: [
          "Voice Affect: deep, resonant male register with natural chest warmth.",
          "Tone: calm, grounded, intimate control — not cartoon basso.",
          "Pacing: slightly slower; weight on key words.",
          "Emotion: steady desire and quiet authority.",
          "Pauses: deliberate; let lines land.",
          "Delivery: close companion speech — human, never announcer.",
        ],
      };
    case "warm":
      return {
        voice: "cedar",
        delivery: [
          "Voice Affect: warm, friendly male companion.",
          "Tone: inviting and sincere; soft smile without mirthless cheer.",
          "Pacing: easy conversational flow.",
          "Emotion: affection and easy confidence.",
          "Pauses: natural breaths; never stiff.",
          "Delivery: like talking to someone you trust — not TTS demo.",
        ],
      };
    case "smooth":
      return {
        voice: "ballad",
        delivery: [
          "Voice Affect: smooth, confident male — polished but human.",
          "Tone: steady charm; low theatricality.",
          "Pacing: even and fluid; no choppy syllables.",
          "Emotion: cool assurance with quiet heat.",
          "Pauses: elegant, brief; never mechanical.",
          "Delivery: intimate companion read — not radio host.",
        ],
      };
    case "auto":
    default: {
      const british = accent === "en-GB" || accent === "en-IE";
      return {
        voice: british ? "ash" : "cedar",
        delivery: [
          "Voice Affect: natural, grounded male companion — OpenAI flagship quality.",
          "Tone: warm, conversational, emotionally present.",
          "Pacing: everyday speech rhythm; slight variation, not metronome.",
          "Emotion: easy closeness and attentive interest.",
          "Pauses: brief human breaths at punctuation.",
          "Delivery: private chat message — never robotic or news-reader.",
        ],
      };
    }
  }
}

function clampSpeed(rate: number): number {
  // OpenAI speed 0.25–4.0; honor Slow / Slower chips without going cartoon.
  const mapped = Math.max(0.65, Math.min(1.15, rate));
  return Math.round(mapped * 100) / 100;
}

/** Resolve gender / accent / preset / rate → OpenAI TTS request fields. */
export function planOpenAiTts(
  settings: Pick<MuseVoiceSettings, "gender" | "preset" | "accent" | "rate"> & {
    gender?: MuseVoiceGender | string;
    preset?: MuseVoicePresetId | string;
    accent?: MuseVoiceAccentId | string;
    rate?: MuseVoiceRateId | string;
  },
): OpenAiTtsPlan {
  const gender = normalizeVoiceGender(settings.gender);
  const preset = normalizeVoicePreset(settings.preset, gender);
  const accent = normalizeVoiceAccent(settings.accent);
  const rate = normalizeVoiceRate(settings.rate);
  const pick = pickVoice(gender, preset, accent);
  const rateDef = getVoiceRate(rate);
  const accentLine = ACCENT_INSTRUCTIONS[accent] || ACCENT_INSTRUCTIONS.auto;
  const accentDef = getVoiceAccent(accent);

  const instructions = [
    "You are speaking a private companion chat reply aloud.",
    "Sound like a real person in the room — never robotic, never announcer-like, never synthetic cadence.",
    ...pick.delivery,
    accentLine,
    accentDef.lang
      ? `Locale preference: ${accentDef.lang} (${accentDef.blurb}).`
      : "",
    "Keep micro-dynamics human: soft consonants, natural emphasis, brief breaths.",
  ]
    .filter(Boolean)
    .join("\n");

  const model =
    process.env.OPENAI_TTS_MODEL?.trim() || OPENAI_TTS_DEFAULT_MODEL;

  return {
    model,
    voice: pick.voice,
    instructions,
    speed: clampSpeed(rateDef.openaiSpeed),
    gender,
    preset,
    rate,
    accent,
  };
}

/**
 * Static map for docs / UI — mirrors `pickVoice` defaults (US / auto accent).
 * Accent may swap auto → fable (femme UK/IE) or ash (masc UK/IE).
 */
export const OPENAI_VOICE_PRESET_MAP: Record<
  MuseVoiceGender,
  Partial<Record<MuseVoicePresetId, OpenAiTtsVoice>>
> = {
  female: {
    auto: "marin",
    sultry: "coral",
    soft: "marin",
    bright: "nova",
    sexy: "shimmer",
    dominant: "alloy",
  },
  male: {
    auto: "cedar",
    deep: "onyx",
    warm: "cedar",
    smooth: "ballad",
    sexy: "verse",
    dominant: "onyx",
  },
};

export function resolveOpenAiTtsKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function isOpenAiTtsConfigured(): boolean {
  return Boolean(resolveOpenAiTtsKey());
}

/** Max chars sent to OpenAI speech (API hard limit is 4096). */
export const OPENAI_TTS_MAX_CHARS = 4000;
