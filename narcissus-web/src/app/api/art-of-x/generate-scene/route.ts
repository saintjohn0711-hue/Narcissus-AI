import { NextRequest, NextResponse } from "next/server";
import type { SceneLength, SceneLocation } from "@/lib/artOfX";
import {
  maxTokensFor,
  sceneSystemPrompt,
  sceneUserPrompt,
  type SceneGenerateInput,
  type ScenePartnerCard,
  type ScenePov,
} from "@/lib/sceneCraft";
import {
  extractXaiText,
  getXaiConfig,
  isXaiConfigured,
  xaiChatCompletion,
  xaiMissingKeyPayload,
  type XaiChatMessage,
} from "@/lib/xai";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  mode?: SceneGenerateInput["mode"];
  partners?: ScenePartnerCard[];
  location?: SceneLocation;
  kinks?: string[];
  length?: SceneLength;
  intensity?: number;
  surprises?: number;
  extra?: string;
  roles?: string;
  pov?: ScenePov;
  previous?: string;
  direction?: string;
};

function sanitizePartners(raw: unknown): ScenePartnerCard[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 3).map((p) => {
    const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const kinksRaw = Array.isArray(o.kinks) ? o.kinks : [];
    return {
      name: String(o.name || "Partner").slice(0, 80),
      gender: String(o.gender || "").slice(0, 40),
      type: String(o.type || "").slice(0, 40),
      looks: String(o.looks || "").slice(0, 400),
      notes: String(o.notes || "").slice(0, 400),
      history: String(o.history || "").slice(0, 800),
      dynamics: String(o.dynamics || "").slice(0, 400),
      dynTags: Array.isArray(o.dynTags)
        ? o.dynTags.map((t) => String(t).slice(0, 40)).slice(0, 16)
        : [],
      kinks: kinksRaw.slice(0, 24).map((k) => {
        if (typeof k === "string") {
          return {
            tag: k.slice(0, 40),
            role: "Both",
            status: "Like",
            intensity: 6,
          };
        }
        const kk = (k && typeof k === "object" ? k : {}) as Record<
          string,
          unknown
        >;
        return {
          tag: String(kk.tag || "").slice(0, 40),
          role: String(kk.role || "Both").slice(0, 20),
          status: String(kk.status || "Like").slice(0, 20),
          intensity:
            typeof kk.intensity === "number" && Number.isFinite(kk.intensity)
              ? Math.min(10, Math.max(1, Math.round(kk.intensity)))
              : 6,
        };
      }),
      doneActs: Array.isArray(o.doneActs)
        ? o.doneActs.map((t) => String(t).slice(0, 60)).slice(0, 24)
        : [],
    };
  });
}

export async function POST(req: NextRequest) {
  if (!isXaiConfigured()) {
    return NextResponse.json(xaiMissingKeyPayload(), { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const partners = sanitizePartners(body.partners);
  if (!partners.length) {
    return NextResponse.json({ error: "no_partners" }, { status: 400 });
  }

  const location: SceneLocation = {
    id: String(body.location?.id || "custom").slice(0, 40),
    name: String(body.location?.name || "Private").slice(0, 80),
    desc: String(
      body.location?.desc || "Somewhere private enough to get loud.",
    ).slice(0, 240),
  };

  const length: SceneLength =
    body.length === "short" || body.length === "long" ? body.length : "medium";
  const mode: SceneGenerateInput["mode"] =
    body.mode === "continue" || body.mode === "steer" ? body.mode : "generate";
  const pov: ScenePov =
    body.pov === "partner" || body.pov === "third" ? body.pov : "you";
  const intensity = Math.min(
    10,
    Math.max(1, Math.round(Number(body.intensity) || 7)),
  );
  const surprises = Math.min(
    3,
    Math.max(0, Math.round(Number(body.surprises) || 0)),
  );

  if (mode !== "generate" && !String(body.previous || "").trim()) {
    return NextResponse.json({ error: "no_previous" }, { status: 400 });
  }
  if (mode === "steer" && !String(body.direction || "").trim()) {
    return NextResponse.json({ error: "no_direction" }, { status: 400 });
  }

  const input: SceneGenerateInput = {
    mode,
    partners,
    location,
    kinks: Array.isArray(body.kinks)
      ? body.kinks.map((k) => String(k).slice(0, 40)).slice(0, 24)
      : [],
    length,
    intensity,
    surprises,
    extra: String(body.extra || "").slice(0, 800),
    roles: String(body.roles || "").slice(0, 400),
    pov,
    previous: String(body.previous || "").slice(-6000),
    direction: String(body.direction || "").slice(0, 800),
  };

  const messages: XaiChatMessage[] = [
    { role: "system", content: sceneSystemPrompt() },
    { role: "user", content: sceneUserPrompt(input) },
  ];

  const cfg = getXaiConfig()!;

  try {
    const upstream = await xaiChatCompletion({
      messages,
      temperature: 1.05,
      maxTokens: maxTokensFor(length, mode),
      stream: false,
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

    const data = await upstream.json();
    const text = extractXaiText(data);
    if (!text) {
      return NextResponse.json(
        { error: "empty_scene", model: cfg.model },
        { status: 502 },
      );
    }

    if (/\b(minor|underage|preteen|\bteen\b|child|schoolgirl)\b/i.test(text)) {
      return NextResponse.json(
        { error: "safety_blocked", message: "Output failed adults-only check." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      text,
      source: "llm" as const,
      model: cfg.model,
      /** Echo of the brief the model was given — useful for UI/debug smoke. */
      applied: {
        locationId: location.id,
        locationName: location.name,
        kinks: input.kinks,
        length: input.length,
        intensity: input.intensity,
        surprises: input.surprises,
        roles: input.roles || "",
        extra: input.extra || "",
        pov: input.pov,
        partnerNames: partners.map((p) => p.name),
        mode: input.mode,
      },
    });
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
