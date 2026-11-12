/**
 * Muse chat voice narration — browser Web Speech API baseline (zero cost).
 *
 * Studio already has Edge-TTS (`lib/tts.ts`) for Say-This video mux on Comfy hosts.
 * That toolchain is not available on Vercel serverless, so Companion chat uses
 * SpeechSynthesis here. Upgrade path: OpenAI TTS / ElevenLabs when their keys
 * are intentionally provisioned (not present as chat-TTS secrets today).
 */

export type MuseVoiceGender = "female" | "male";

/** Presentation gender from Muse profile (kept local to avoid circular imports). */
export type MusePresentationGender =
  | "woman"
  | "man"
  | "trans"
  | "crossdresser"
  | "couple"
  | string;

export type MuseVoicePresetId =
  | "auto"
  | "sultry"
  | "soft"
  | "bright"
  | "deep"
  | "warm"
  | "smooth";

/**
 * Accent / locale preference. Stored on Muse `voiceId` as `accent:<BCP47>`
 * when not an exact SpeechSynthesisVoice.voiceURI.
 */
export type MuseVoiceAccentId =
  | "auto"
  | "en-US"
  | "en-GB"
  | "en-AU"
  | "en-IE"
  | "en-IN"
  | "en-ZA"
  | "fr-FR"
  | "es-ES"
  | "es-MX"
  | "it-IT"
  | "pt-BR"
  | "de-DE"
  | "nl-NL";

export type MuseVoiceSettings = {
  gender: MuseVoiceGender;
  /** Named delivery preset (pitch/rate). */
  preset: MuseVoicePresetId;
  /** Locale accent preference (maps to Web Speech lang). */
  accent: MuseVoiceAccentId;
  /** Optional SpeechSynthesisVoice.voiceURI — browser-specific. */
  voiceId?: string;
};

/** Prefix for encoding accent prefs into the Muse `voiceId` column. */
export const VOICE_ACCENT_PREFIX = "accent:";

export const MUSE_VOICE_PRESETS: Array<{
  id: MuseVoicePresetId;
  label: string;
  blurb: string;
  genders: MuseVoiceGender[] | "both";
  rate: number;
  pitch: number;
}> = [
  {
    id: "auto",
    label: "Auto",
    blurb: "Best matching system voice for the gender.",
    genders: "both",
    rate: 0.96,
    pitch: 1,
  },
  {
    id: "sultry",
    label: "Sultry",
    blurb: "Slower, lower — intimate female tone.",
    genders: ["female"],
    rate: 0.88,
    pitch: 0.85,
  },
  {
    id: "soft",
    label: "Soft",
    blurb: "Gentle female delivery.",
    genders: ["female"],
    rate: 0.94,
    pitch: 1.05,
  },
  {
    id: "bright",
    label: "Bright",
    blurb: "Clear, slightly brighter female.",
    genders: ["female"],
    rate: 1.02,
    pitch: 1.12,
  },
  {
    id: "deep",
    label: "Deep",
    blurb: "Lower male register.",
    genders: ["male"],
    rate: 0.9,
    pitch: 0.78,
  },
  {
    id: "warm",
    label: "Warm",
    blurb: "Warm conversational male.",
    genders: ["male"],
    rate: 0.95,
    pitch: 0.92,
  },
  {
    id: "smooth",
    label: "Smooth",
    blurb: "Steady, confident male.",
    genders: ["male"],
    rate: 0.98,
    pitch: 0.88,
  },
];

export const MUSE_VOICE_ACCENTS: Array<{
  id: MuseVoiceAccentId;
  label: string;
  blurb: string;
  /** BCP-47 lang tag preferred for SpeechSynthesisVoice.lang matching. */
  lang: string;
  group: "english" | "romance" | "other" | "auto";
}> = [
  {
    id: "auto",
    label: "Auto",
    blurb: "Best English (or available) system voice for the gender.",
    lang: "",
    group: "auto",
  },
  {
    id: "en-US",
    label: "US",
    blurb: "American English",
    lang: "en-US",
    group: "english",
  },
  {
    id: "en-GB",
    label: "UK",
    blurb: "British English",
    lang: "en-GB",
    group: "english",
  },
  {
    id: "en-AU",
    label: "AU",
    blurb: "Australian English",
    lang: "en-AU",
    group: "english",
  },
  {
    id: "en-IE",
    label: "IE",
    blurb: "Irish English",
    lang: "en-IE",
    group: "english",
  },
  {
    id: "en-IN",
    label: "IN",
    blurb: "Indian English",
    lang: "en-IN",
    group: "english",
  },
  {
    id: "en-ZA",
    label: "ZA",
    blurb: "South African English",
    lang: "en-ZA",
    group: "english",
  },
  {
    id: "fr-FR",
    label: "FR",
    blurb: "French",
    lang: "fr-FR",
    group: "romance",
  },
  {
    id: "es-ES",
    label: "ES",
    blurb: "Spanish (Spain)",
    lang: "es-ES",
    group: "romance",
  },
  {
    id: "es-MX",
    label: "MX",
    blurb: "Spanish (Mexico)",
    lang: "es-MX",
    group: "romance",
  },
  {
    id: "it-IT",
    label: "IT",
    blurb: "Italian",
    lang: "it-IT",
    group: "romance",
  },
  {
    id: "pt-BR",
    label: "BR",
    blurb: "Portuguese (Brazil)",
    lang: "pt-BR",
    group: "romance",
  },
  {
    id: "de-DE",
    label: "DE",
    blurb: "German",
    lang: "de-DE",
    group: "other",
  },
  {
    id: "nl-NL",
    label: "NL",
    blurb: "Dutch",
    lang: "nl-NL",
    group: "other",
  },
];

const FEMALE_NAME =
  /\b(female|woman|girl|zira|samantha|victoria|karen|moira|tessa|fiona|veena|susan|hazel|catherine|sarah|aria|jenny|sonia|sara|ava|emma|amy|allison|linda|heather|kathy|julie|melina|serena|nora|joanna|ivy|kimberly|salli|lisa|natalie|olivia|emily|anna)\b/i;
const MALE_NAME =
  /\b(male|man|boy|david|mark|daniel|james|george|fred|tom|guy|davis|brian|ryan|nathan|alex|matthew|justin|joey|eric|michael|christopher|arthur|ravi|aaron|adam|wayne|gordon)\b/i;

export function defaultVoiceGender(
  museGender: MusePresentationGender | undefined,
): MuseVoiceGender {
  switch (museGender) {
    case "man":
      return "male";
    case "woman":
    case "trans":
    case "crossdresser":
    case "couple":
    default:
      return "female";
  }
}

export function isMuseVoiceGender(v: unknown): v is MuseVoiceGender {
  return v === "female" || v === "male";
}

export function isMuseVoicePresetId(v: unknown): v is MuseVoicePresetId {
  return MUSE_VOICE_PRESETS.some((p) => p.id === v);
}

export function isMuseVoiceAccentId(v: unknown): v is MuseVoiceAccentId {
  return MUSE_VOICE_ACCENTS.some((a) => a.id === v);
}

export function normalizeVoiceGender(
  raw: unknown,
  museGender?: MusePresentationGender,
): MuseVoiceGender {
  if (isMuseVoiceGender(raw)) return raw;
  return defaultVoiceGender(museGender);
}

export function normalizeVoicePreset(
  raw: unknown,
  gender: MuseVoiceGender,
): MuseVoicePresetId {
  if (isMuseVoicePresetId(raw)) {
    const def = MUSE_VOICE_PRESETS.find((p) => p.id === raw)!;
    if (def.genders === "both" || def.genders.includes(gender)) return raw;
  }
  return "auto";
}

export function normalizeVoiceAccent(raw: unknown): MuseVoiceAccentId {
  if (isMuseVoiceAccentId(raw)) return raw;
  return "auto";
}

export type ParsedVoiceId =
  | { kind: "none" }
  | { kind: "accent"; accent: MuseVoiceAccentId }
  | { kind: "uri"; uri: string };

/** Decode Muse `voiceId`: accent tag, exact URI, or empty. */
export function parseVoiceId(raw: unknown): ParsedVoiceId {
  if (typeof raw !== "string") return { kind: "none" };
  const trimmed = raw.trim().slice(0, 200);
  if (!trimmed) return { kind: "none" };
  if (trimmed.toLowerCase().startsWith(VOICE_ACCENT_PREFIX)) {
    const tag = trimmed.slice(VOICE_ACCENT_PREFIX.length).trim();
    const accent = normalizeVoiceAccent(tag);
    if (accent === "auto") return { kind: "none" };
    return { kind: "accent", accent };
  }
  return { kind: "uri", uri: trimmed };
}

/** Persist accent preference into Muse `voiceId` (keeps URI if present). */
export function encodeAccentVoiceId(accent: MuseVoiceAccentId): string {
  if (accent === "auto") return "";
  return `${VOICE_ACCENT_PREFIX}${accent}`;
}

export function accentFromVoiceId(raw: unknown): MuseVoiceAccentId {
  const parsed = parseVoiceId(raw);
  return parsed.kind === "accent" ? parsed.accent : "auto";
}

export function exactVoiceUriFromVoiceId(raw: unknown): string | undefined {
  const parsed = parseVoiceId(raw);
  return parsed.kind === "uri" ? parsed.uri : undefined;
}

export function voiceSettingsFromPartner(partner: {
  gender?: MusePresentationGender;
  voiceGender?: string;
  voicePreset?: string;
  voiceId?: string;
}): MuseVoiceSettings {
  const gender = normalizeVoiceGender(partner.voiceGender, partner.gender);
  const parsed = parseVoiceId(partner.voiceId);
  return {
    gender,
    preset: normalizeVoicePreset(partner.voicePreset, gender),
    accent: parsed.kind === "accent" ? parsed.accent : "auto",
    voiceId: parsed.kind === "uri" ? parsed.uri : undefined,
  };
}

export function getVoicePreset(id: MuseVoicePresetId) {
  return MUSE_VOICE_PRESETS.find((p) => p.id === id) || MUSE_VOICE_PRESETS[0]!;
}

export function getVoiceAccent(id: MuseVoiceAccentId) {
  return MUSE_VOICE_ACCENTS.find((a) => a.id === id) || MUSE_VOICE_ACCENTS[0]!;
}

export function presetsForGender(gender: MuseVoiceGender) {
  return MUSE_VOICE_PRESETS.filter(
    (p) => p.genders === "both" || p.genders.includes(gender),
  );
}

export function accentLabel(id: MuseVoiceAccentId): string {
  return getVoiceAccent(id).label;
}

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis.getVoices() || [];
}

/** Chrome loads voices asynchronously — call once on mount. */
export function warmSpeechVoices(): () => void {
  if (!speechSupported()) return () => undefined;
  const synth = window.speechSynthesis;
  const onChange = () => {
    void synth.getVoices();
  };
  onChange();
  synth.addEventListener?.("voiceschanged", onChange);
  return () => synth.removeEventListener?.("voiceschanged", onChange);
}

function normalizeLangTag(lang: string): string {
  return String(lang || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function langPrimary(lang: string): string {
  return normalizeLangTag(lang).split("-")[0] || "";
}

function scoreVoice(
  voice: SpeechSynthesisVoice,
  gender: MuseVoiceGender,
  accent: MuseVoiceAccentId,
): number {
  let score = 0;
  const blob = `${voice.name} ${voice.voiceURI} ${voice.lang}`;
  const voiceLang = normalizeLangTag(voice.lang);
  const accentDef = getVoiceAccent(accent);
  const wantLang = normalizeLangTag(accentDef.lang);

  if (wantLang) {
    if (voiceLang === wantLang) score += 70;
    else if (langPrimary(voiceLang) === langPrimary(wantLang)) {
      // Same language family (e.g. en-AU vs en-GB) — useful fallback
      score += 28;
      // Prefer closer regional tags when present in the name/URI
      const region = wantLang.split("-")[1];
      if (region && blob.toLowerCase().includes(region)) score += 12;
    } else {
      score -= 35;
    }
  } else {
    if (voiceLang.startsWith("en")) score += 40;
    else score -= 20;
  }

  const femaleHit = FEMALE_NAME.test(blob);
  const maleHit = MALE_NAME.test(blob);
  if (gender === "female") {
    if (femaleHit) score += 50;
    if (maleHit && !femaleHit) score -= 40;
  } else {
    if (maleHit) score += 50;
    if (femaleHit && !maleHit) score -= 40;
  }

  // Prefer local / higher-quality neural names when present
  if (/neural|premium|enhanced|natural/i.test(blob)) score += 8;
  if (voice.localService) score += 4;
  if (/google|microsoft|apple|samantha|daniel|moira/i.test(blob)) score += 3;

  return score;
}

export function pickSpeechVoice(
  settings: MuseVoiceSettings,
): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (!voices.length) return null;

  if (settings.voiceId) {
    const exact =
      voices.find((v) => v.voiceURI === settings.voiceId) ||
      voices.find((v) => v.name === settings.voiceId);
    if (exact) return exact;
  }

  const accent = normalizeVoiceAccent(settings.accent);
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const s = scoreVoice(v, settings.gender, accent);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

export type SpeakState = "idle" | "playing" | "paused";

export type SpeakController = {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getState: () => SpeakState;
};

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeMessageId: string | null = null;
let listeners = new Set<() => void>();

export function getActiveNarrationId(): string | null {
  return activeMessageId;
}

export function subscribeNarration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const l of listeners) l();
}

function clearActive() {
  activeUtterance = null;
  activeMessageId = null;
  notify();
}

/** Strip stage directions / markdown noise so TTS reads cleaner. */
export function textForSpeech(raw: string): string {
  let t = String(raw || "");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/_([^_]+)_/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Soften long *action* stage directions into short pauses
  t = t.replace(/\*([^*]{3,120})\*/g, ". ");
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 4500);
}

export function stopNarration() {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  clearActive();
}

export function pauseNarration() {
  if (!speechSupported()) return;
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    notify();
  }
}

export function resumeNarration() {
  if (!speechSupported()) return;
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    notify();
  }
}

export function narrationStateFor(messageId: string): SpeakState {
  if (activeMessageId !== messageId) return "idle";
  if (!speechSupported()) return "idle";
  if (window.speechSynthesis.paused) return "paused";
  if (window.speechSynthesis.speaking || activeUtterance) return "playing";
  return "idle";
}

export function speakMessage(
  messageId: string,
  text: string,
  settings: MuseVoiceSettings,
): SpeakController | null {
  if (!speechSupported()) return null;
  const cleaned = textForSpeech(text);
  if (!cleaned) return null;

  stopNarration();

  const preset = getVoicePreset(settings.preset);
  const accent = getVoiceAccent(normalizeVoiceAccent(settings.accent));
  const utter = new SpeechSynthesisUtterance(cleaned);
  const voice = pickSpeechVoice(settings);
  if (voice) utter.voice = voice;
  utter.rate = preset.rate;
  utter.pitch = preset.pitch;
  utter.volume = 1;
  utter.lang = voice?.lang || accent.lang || "en-US";

  activeUtterance = utter;
  activeMessageId = messageId;
  notify();

  utter.onend = () => {
    if (activeUtterance === utter) clearActive();
  };
  utter.onerror = () => {
    if (activeUtterance === utter) clearActive();
  };

  // Some browsers need a tick after cancel before speak
  window.setTimeout(() => {
    if (activeUtterance === utter) {
      window.speechSynthesis.speak(utter);
      notify();
    }
  }, 20);

  return {
    stop: stopNarration,
    pause: pauseNarration,
    resume: resumeNarration,
    getState: () => narrationStateFor(messageId),
  };
}

/** Shared id so selection previews cancel each other (and chat narration). */
export const VOICE_PREVIEW_MESSAGE_ID = "__muse-voice-preview__";

/** Short default line for gender / accent / delivery previews. */
export const DEFAULT_VOICE_PREVIEW_LINE =
  "Hey… it's me. How do I sound like this?";

/**
 * Speak a short sample with the selected Muse voice settings.
 * Stops any previous preview or bubble narration first.
 */
export function previewVoice(
  settings: MuseVoiceSettings,
  sampleText?: string,
): SpeakController | null {
  const line =
    textForSpeech(sampleText || "") || DEFAULT_VOICE_PREVIEW_LINE;
  return speakMessage(VOICE_PREVIEW_MESSAGE_ID, line, settings);
}

export function isVoicePreviewActive(): boolean {
  return activeMessageId === VOICE_PREVIEW_MESSAGE_ID;
}

/** Chat-level prefs (device only). */
export const CHAT_VOICE_PREFS_KEY = "narcissus.artOfX.chatVoicePrefs.v1";

export type ChatVoicePrefs = {
  /** Auto-play Muse replies when they finish streaming. */
  autoNarrateMuse: boolean;
  /** Also narrate the user's messages (off by default). */
  narrateUser: boolean;
};

export const DEFAULT_CHAT_VOICE_PREFS: ChatVoicePrefs = {
  autoNarrateMuse: false,
  narrateUser: false,
};

export function loadChatVoicePrefs(): ChatVoicePrefs {
  if (typeof window === "undefined") return { ...DEFAULT_CHAT_VOICE_PREFS };
  try {
    const raw = localStorage.getItem(CHAT_VOICE_PREFS_KEY);
    if (!raw) return { ...DEFAULT_CHAT_VOICE_PREFS };
    const parsed = JSON.parse(raw) as Partial<ChatVoicePrefs>;
    return {
      autoNarrateMuse: Boolean(parsed.autoNarrateMuse),
      narrateUser: Boolean(parsed.narrateUser),
    };
  } catch {
    return { ...DEFAULT_CHAT_VOICE_PREFS };
  }
}

export function saveChatVoicePrefs(prefs: ChatVoicePrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_VOICE_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
}
