/**
 * Shared OpenAI-compatible chat config for Art of X.
 * Prefers Vercel AI Gateway (Grok when available); falls back to OpenAI.
 */

export type LlmConfig = {
  url: string;
  key: string;
  model: string;
  via: "ai-gateway" | "openai" | "custom";
};

export function resolveChatLlm(opts?: {
  /** Override model (e.g. SCENE_MODEL). */
  modelEnv?: string;
  /** Default gateway model when using AI Gateway / OIDC. */
  gatewayDefault?: string;
  /** Default OpenAI model when using OPENAI_API_KEY directly. */
  openaiDefault?: string;
}): LlmConfig | null {
  const key =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.LOOKS_VISION_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    "";
  if (!key) return null;

  const customUrl = process.env.SCENE_LLM_URL?.trim() || process.env.LOOKS_VISION_URL?.trim();
  const hasGateway =
    Boolean(process.env.AI_GATEWAY_API_KEY?.trim()) ||
    Boolean(process.env.VERCEL_OIDC_TOKEN?.trim()) ||
    (customUrl || "").includes("ai-gateway.vercel.sh");

  const via: LlmConfig["via"] = customUrl
    ? "custom"
    : hasGateway
      ? "ai-gateway"
      : "openai";

  const url =
    customUrl ||
    (via === "ai-gateway"
      ? "https://ai-gateway.vercel.sh/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions");

  const model =
    opts?.modelEnv?.trim() ||
    process.env.AI_GATEWAY_MODEL?.trim() ||
    (via === "openai"
      ? opts?.openaiDefault || "gpt-4o"
      : opts?.gatewayDefault || "spacexai/grok-4.20-non-reasoning");

  return { url, key, model, via };
}

export async function chatCompletion(opts: {
  cfg: LlmConfig;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  const res = await fetch(opts.cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.cfg.model,
      temperature: opts.temperature ?? 1.05,
      max_tokens: opts.maxTokens ?? 2200,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `llm_failed ${res.status}: ${detail.slice(0, 400) || res.statusText}`,
    );
  }

  const data = (await res.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("llm_empty");
  return { text, model: data.model || opts.cfg.model };
}
