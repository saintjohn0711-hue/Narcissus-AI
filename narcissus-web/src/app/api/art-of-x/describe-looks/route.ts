import { NextRequest, NextResponse } from "next/server";
import { resolveChatLlm } from "@/lib/llmConfig";

export const runtime = "nodejs";

type Body = {
  images?: string[];
  gender?: string;
  name?: string;
};

export async function POST(req: NextRequest) {
  const cfg = resolveChatLlm({
    modelEnv: process.env.LOOKS_VISION_MODEL,
    gatewayDefault: "openai/gpt-4o-mini",
    openaiDefault: "gpt-4o-mini",
  });
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

  const system = `You write short adult partner "looks" blurbs for a private sex-history tracker.
Return ONLY one plain sentence or comma-separated phrase (max ~30 words).
Describe visible appearance: hair, eyes if clear, skin, body type/build, facial features, style/clothing vibe.
No NSFW acts, no names of celebrities, no speculation beyond the photo. Adults only.`;

  const userText = [
    name ? `Partner name context: ${name}` : "",
    gender ? `Gender / presentation hint: ${gender}` : "",
    "Write the looks description from the attached photo(s).",
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
        temperature: 0.4,
        max_tokens: 120,
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
