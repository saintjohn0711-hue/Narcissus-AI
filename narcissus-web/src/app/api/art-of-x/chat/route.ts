import { NextRequest, NextResponse } from "next/server";
import type { PartnerRecord } from "@/lib/artOfX";
import {
  buildPartnerChatSystemPrompt,
  extractXaiText,
  getXaiConfig,
  isXaiConfigured,
  partnerThreadToXaiMessages,
  xaiChatCompletion,
  xaiMissingKeyPayload,
  type ChatPov,
  type XaiChatMessage,
} from "@/lib/xai";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatBody = {
  partner?: PartnerRecord;
  /** Optional second Muse for dual-cast / paired play */
  cast?: PartnerRecord | null;
  messages?: Array<{ who: "You" | "Partner"; text: string }>;
  /** Latest user turn; appended if not already last in messages */
  message?: string;
  pov?: ChatPov;
  stream?: boolean;
};

function parsePov(raw: unknown): ChatPov {
  return raw === "3rd" ? "3rd" : "1st";
}

export async function POST(req: NextRequest) {
  if (!isXaiConfigured()) {
    return NextResponse.json(xaiMissingKeyPayload(), { status: 503 });
  }

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const partner = body.partner;
  if (!partner || typeof partner !== "object" || !partner.name) {
    return NextResponse.json({ error: "partner_required" }, { status: 400 });
  }

  const pov = parsePov(body.pov);
  const history = Array.isArray(body.messages) ? body.messages : [];
  const latest =
    typeof body.message === "string" ? body.message.trim() : "";

  const thread = [...history];
  if (latest) {
    const last = thread[thread.length - 1];
    if (!(last && last.who === "You" && last.text.trim() === latest)) {
      thread.push({ who: "You", text: latest });
    }
  }

  if (!thread.some((m) => m.who === "You" && m.text.trim())) {
    return NextResponse.json({ error: "message_required" }, { status: 400 });
  }

  const cast =
    body.cast &&
    typeof body.cast === "object" &&
    body.cast.name &&
    Number(body.cast.id) !== Number(partner.id)
      ? body.cast
      : null;

  const messages: XaiChatMessage[] = [
    {
      role: "system",
      content: buildPartnerChatSystemPrompt(partner, pov, cast),
    },
    ...partnerThreadToXaiMessages(thread),
  ];

  const wantStream = body.stream !== false;
  const cfg = getXaiConfig()!;

  try {
    const upstream = await xaiChatCompletion({
      messages,
      temperature: 0.95,
      maxTokens: 1200,
      stream: wantStream,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: "xai_failed",
          status: upstream.status,
          detail: detail.slice(0, 500),
          model: cfg.model,
        },
        { status: 502 },
      );
    }

    if (wantStream && upstream.body) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-XAI-Model": cfg.model,
        },
      });
    }

    const data = await upstream.json();
    const text = extractXaiText(data);
    if (!text) {
      return NextResponse.json(
        { error: "empty_reply", model: cfg.model },
        { status: 502 },
      );
    }
    return NextResponse.json({ text, model: cfg.model });
  } catch (err) {
    return NextResponse.json(
      {
        error: "xai_error",
        message: err instanceof Error ? err.message : "request failed",
      },
      { status: 502 },
    );
  }
}
