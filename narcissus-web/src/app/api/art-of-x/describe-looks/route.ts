import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  images?: string[];
  gender?: string;
  name?: string;
};

function visionConfig(): { url: string; key: string; model: string } | null {
  const key =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.LOOKS_VISION_API_KEY?.trim() ||
    "";
  if (!key) return null;
  const url =
    process.env.LOOKS_VISION_URL?.trim() ||
    (process.env.AI_GATEWAY_API_KEY
      ? "https://ai-gateway.vercel.sh/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions");
  const model =
    process.env.LOOKS_VISION_MODEL?.trim() ||
    (process.env.AI_GATEWAY_API_KEY
      ? "openai/gpt-4o-mini"
      : "gpt-4o-mini");
  return { url, key, model };
}

export async function POST(req: NextRequest) {
  const cfg = visionConfig();
  if (!cfg) {
    return NextResponse.json(
      {
        error: "vision_not_configured",
        message:
          "No vision key set (AI_GATEWAY_API_KEY / OPENAI_API_KEY / LOOKS_VISION_API_KEY). Client will use local draft.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const images = (body.images || [])
    .filter((s) => typeof s === "string" && s.startsWith("data:image/"))
    .slice(0, 4);
  if (!images.length) {
    return NextResponse.json({ error: "no_images" }, { status: 400 });
  }

  const gender = typeof body.gender === "string" ? body.gender : "";
  const name = typeof body.name === "string" ? body.name : "";

  const system = `You write partner "looks" blurbs for a private adults-only sex-history tracker (Art of X).
Return ONLY the description — no quotes, labels, or preamble.

Tone: sensual, specific, and sexy — the kind of hungry detail you'd whisper about someone hot. Not clinical, not bland catalog copy, not vulgar porn-script. Still usable as a profile "looks" field.

Cover what you can see across 2–4 sentences (~60–120 words):
- Hair (color, length, texture, how it frames the face)
- Eyes and face if clear (gaze, lips, cheekbones, expression)
- Body / build / skin (curves, muscle, softness, posture — sensual but not medical)
- Style and vibe (clothing, grooming, energy — soft, fierce, flirty, polished, raw…)

Rules: adults 21+ only. No underage cues. No NSFW sex acts. No celebrity names. Stick to what's visible; light vibe inference is OK, wild invention is not. Prefer vivid concrete words over vague praise ("stunning", "attractive").`;

  const userText = [
    name ? `Partner name context: ${name}` : "",
    gender ? `Gender / presentation hint: ${gender}` : "",
    "Write a longer, sexy, specific looks description from the attached photo(s).",
  ]
    .filter(Boolean)
    .join("\n");

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    { type: "text", text: userText },
    ...images.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];

  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.7,
        max_tokens: 280,
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "vision_failed", status: res.status, detail: detail.slice(0, 400) },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const looks = data.choices?.[0]?.message?.content?.trim() || "";
    if (!looks) {
      return NextResponse.json({ error: "empty_looks" }, { status: 502 });
    }
    return NextResponse.json({ looks: looks.replace(/^["']|["']$/g, "") });
  } catch (err) {
    return NextResponse.json(
      {
        error: "vision_error",
        message: err instanceof Error ? err.message : "request failed",
      },
      { status: 502 },
    );
  }
}
