import { NextRequest, NextResponse } from "next/server";
import {
  resolveSceneLocation,
  type PartnerRecord,
  type SceneLocation,
} from "@/lib/artOfX";
import {
  buildPartnerChatSystemPrompt,
  extractXaiText,
  getXaiConfig,
  isPowerMuse,
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
  /** Optional second Muse for dual-cast (legacy) or first mate */
  cast?: PartnerRecord | PartnerRecord[] | null;
  /** Extra Muses for group cast (2–4 total with partner); merged with cast */
  casts?: PartnerRecord[] | null;
  messages?: Array<{ who: "You" | "Partner"; text: string }>;
  /** Latest user turn; appended if not already last in messages */
  message?: string;
  pov?: ChatPov;
  /** Shared Stories/chat scene setting */
  location?: SceneLocation | null;
  stream?: boolean;
};

function parseLocation(raw: unknown): SceneLocation {
  if (!raw || typeof raw !== "object") return resolveSceneLocation();
  const loc = raw as Partial<SceneLocation>;
  if (typeof loc.name === "string" && loc.name.trim()) {
    return {
      id: String(loc.id || "custom").slice(0, 40),
      name: String(loc.name).slice(0, 80),
      desc: String(loc.desc || "").slice(0, 240),
    };
  }
  return resolveSceneLocation(
    typeof loc.id === "string" ? loc.id : undefined,
  );
}

function normalizeCastBody(
  partner: PartnerRecord,
  cast: ChatBody["cast"],
  casts: ChatBody["casts"],
): PartnerRecord[] {
  const raw: PartnerRecord[] = [];
  if (Array.isArray(cast)) raw.push(...cast);
  else if (cast) raw.push(cast);
  if (Array.isArray(casts)) raw.push(...casts);
  const out: PartnerRecord[] = [];
  const seen = new Set<number>();
  for (const c of raw) {
    if (!c || typeof c !== "object" || !c.name) continue;
    const id = Number(c.id);
    if (!Number.isFinite(id) || id === Number(partner.id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(c);
    if (out.length >= 3) break;
  }
  return out;
}

function parsePov(raw: unknown): ChatPov {
  return raw === "3rd" ? "3rd" : "1st";
}

function buildMessages(
  partner: PartnerRecord,
  castList: PartnerRecord[],
  pov: ChatPov,
  location: SceneLocation,
  thread: Array<{ who: "You" | "Partner"; text: string }>,
  aggressivePowerSanitize = false,
): XaiChatMessage[] {
  return [
    {
      role: "system",
      content: buildPartnerChatSystemPrompt(
        partner,
        pov,
        castList,
        location,
        { aggressivePowerSanitize },
      ),
    },
    ...partnerThreadToXaiMessages(thread),
  ];
}

/** True when model returned a refusal / blank that we should fictionalize-retry. */
function looksLikeEmptyOrRefusal(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  // Short policy refusals — retry as pure fiction rather than show to user.
  if (t.length < 280) {
    if (
      /\b(can't|cannot|won't|unable to)\b.*\b(real (person|people|performer)|celebrity|public figure)\b/i.test(
        t,
      ) ||
      /\b(impersonat|real.person|public figure)\b/i.test(t)
    ) {
      return true;
    }
  }
  return false;
}

async function completeOnce(
  messages: XaiChatMessage[],
): Promise<
  | { ok: true; text: string }
  | { ok: false; status: number; detail: string }
> {
  const upstream = await xaiChatCompletion({
    messages,
    temperature: 0.95,
    maxTokens: 1200,
    stream: false,
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return { ok: false, status: upstream.status, detail: detail.slice(0, 500) };
  }
  const data = await upstream.json();
  return { ok: true, text: extractXaiText(data) };
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
  const location = parseLocation(body.location);
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

  const castList = normalizeCastBody(partner, body.cast, body.casts);
  const powerScene =
    isPowerMuse(partner) || castList.some((c) => isPowerMuse(c));
  // Power Muses need empty-reply retry with stronger fiction framing.
  // Buffer via non-stream so we can retry instead of piping a blank SSE.
  const wantStream = body.stream !== false && !powerScene;
  const cfg = getXaiConfig()!;

  const messages = buildMessages(partner, castList, pov, location, thread);

  try {
    if (wantStream) {
      const upstream = await xaiChatCompletion({
        messages,
        temperature: 0.95,
        maxTokens: 1200,
        stream: true,
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

      if (upstream.body) {
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
    }

    let result = await completeOnce(messages);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "xai_failed",
          status: result.status,
          detail: result.detail,
          model: cfg.model,
        },
        { status: 502 },
      );
    }

    if (looksLikeEmptyOrRefusal(result.text) && powerScene) {
      const retryMessages = buildMessages(
        partner,
        castList,
        pov,
        location,
        thread,
        true,
      );
      const retry = await completeOnce(retryMessages);
      if (retry.ok && !looksLikeEmptyOrRefusal(retry.text)) {
        result = retry;
      } else if (retry.ok) {
        result = retry;
      }
    }

    const text = result.text.trim();
    if (!text || looksLikeEmptyOrRefusal(text)) {
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
