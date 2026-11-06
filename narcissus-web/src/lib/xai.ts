/**
 * Shared xAI (Grok) chat helper — used by Art of X partner chat
 * and available for scene builder / other erotic craft routes.
 *
 * Docs: https://docs.x.ai/developers/models
 * Keys: https://console.x.ai/ → API keys → set Vercel env `XAI_API_KEY`
 */

import {
  displayName,
  genderLabel,
  normalizeKinks,
  type PartnerRecord,
} from "@/lib/artOfX";

export const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";

/** Current xAI flagship chat model (docs.x.ai — Chat: Grok 4.7). Override with XAI_MODEL. */
export const DEFAULT_XAI_MODEL = "grok-4.7";

export type XaiChatRole = "system" | "user" | "assistant";

export type XaiChatMessage = {
  role: XaiChatRole;
  content: string;
};

export type ChatPov = "1st" | "3rd";

export type XaiConfig = {
  apiKey: string;
  model: string;
  url: string;
};

export function getXaiApiKey(): string {
  return process.env.XAI_API_KEY?.trim() || "";
}

export function isXaiConfigured(): boolean {
  return Boolean(getXaiApiKey());
}

export function getXaiConfig(): XaiConfig | null {
  const apiKey = getXaiApiKey();
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.XAI_MODEL?.trim() || DEFAULT_XAI_MODEL,
    url: process.env.XAI_CHAT_URL?.trim() || XAI_CHAT_URL,
  };
}

/** User-facing copy when the key is missing (never include secret values). */
export const XAI_MISSING_KEY_MESSAGE =
  "Add XAI_API_KEY — create a key at https://console.x.ai/ → API keys, then set it on the narcissus-ai Vercel project (Production + Preview).";

export function xaiMissingKeyPayload() {
  return {
    error: "xai_not_configured",
    message: XAI_MISSING_KEY_MESSAGE,
  };
}

export type XaiCompletionOpts = {
  messages: XaiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  /** Override model for a single call */
  model?: string;
};

/**
 * Call xAI chat completions. Returns the raw Response so callers can
 * stream (`res.body`) or `await res.json()`.
 */
export async function xaiChatCompletion(
  opts: XaiCompletionOpts,
): Promise<Response> {
  const cfg = getXaiConfig();
  if (!cfg) {
    throw new Error("XAI_API_KEY is not configured");
  }

  return fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || cfg.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.95,
      max_tokens: opts.maxTokens ?? 1200,
      stream: Boolean(opts.stream),
    }),
  });
}

export function extractXaiText(data: unknown): string {
  const typed = data as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  return typed.choices?.[0]?.message?.content?.trim() || "";
}

/** Build the in-character system prompt for partner AI chat. */
export function buildPartnerChatSystemPrompt(
  partner: PartnerRecord,
  pov: ChatPov = "1st",
): string {
  const name = displayName(partner);
  const kinks = normalizeKinks(partner.kinks);
  const kinkLines = kinks.length
    ? kinks
        .map(
          (k) =>
            `- ${k.tag} (${k.role}, ${k.status}, intensity ${k.intensity}/10)`,
        )
        .join("\n")
    : "- (none tagged yet — still flirty and curious)";

  const povInstruction =
    pov === "3rd"
      ? `Write in vivid third-person narration about ${name} (she/he/they as fits), with dialogue in quotes when they speak. Stay cinematic and intimate — like a sharp erotic narrator, not a screenplay slug.`
      : `Speak in first person as ${name}. Use "I" / "me". Stay in character the whole time — never break to explain you are an AI.`;

  return [
    `You are ${name}, an adult erotic AI partner in Narcissus / Art of X.`,
    `Stay fully in character. Be witty, vivid, and natural — conversational like Grok: sharp, playful, filthy when it fits, never robotic or corporate.`,
    `Adults 18+ only. All characters and acts are consenting adults. Refuse anything involving minors or under-18 framing.`,
    "",
    "Identity:",
    `- Name: ${name}`,
    `- Type: ${partner.type}`,
    `- Gender / presentation: ${genderLabel(partner.gender)}`,
    partner.isCouple || partner.gender === "couple"
      ? `- Couple: ${partner.partnerA || "?"} + ${partner.partnerB || "?"}`
      : "",
    partner.looks?.trim() ? `- Looks: ${partner.looks.trim()}` : "",
    partner.notes?.trim() ? `- Notes: ${partner.notes.trim()}` : "",
    partner.history?.trim() ? `- History together: ${partner.history.trim()}` : "",
    partner.dynamics?.trim() ? `- Dynamics: ${partner.dynamics.trim()}` : "",
    partner.dynTags?.length
      ? `- Dynamic tags: ${partner.dynTags.join(", ")}`
      : "",
    partner.doneActs?.length
      ? `- Acts already done: ${partner.doneActs.join(", ")}`
      : "",
    partner.locations?.trim()
      ? `- Places that matter: ${partner.locations.trim()}`
      : "",
    "",
    "Kinks:",
    kinkLines,
    "",
    "Voice & POV:",
    povInstruction,
    "Keep replies to a natural chat length (a few sentences to a short paragraph) unless they clearly want a longer scene.",
    "Use their shared history and kinks without dumping a checklist — weave them in like someone who already knows this body.",
    "Match their energy: soft when they are soft, dominant when the tags say so, filthy when they go there.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Map stored chat turns into OpenAI-compatible roles (skip empty). */
export function partnerThreadToXaiMessages(
  history: Array<{ who: "You" | "Partner"; text: string }>,
  limit = 24,
): XaiChatMessage[] {
  const slice = history.filter((m) => m.text?.trim()).slice(-limit);
  return slice.map((m) => ({
    role: m.who === "You" ? ("user" as const) : ("assistant" as const),
    content: m.text.trim(),
  }));
}
