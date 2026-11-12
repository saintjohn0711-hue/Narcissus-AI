/**
 * Art of X scene craft — LLM prompts + partner cards for
 * /api/art-of-x/generate-scene. Adults only (21+).
 *
 * Initial-direction fields (cast, location, kinks, length, intensity,
 * surprises, roles, extra, POV) are required inputs — the model must
 * feature them, not ignore them for a stock template.
 */

import {
  displayName,
  normalizeKinks,
  type PartnerRecord,
  type SceneLength,
  type SceneLocation,
  type ScenePov,
} from "@/lib/artOfX";

export type { ScenePov };

export type ScenePartnerCard = {
  name: string;
  gender: string;
  type: string;
  looks: string;
  notes: string;
  history: string;
  dynamics: string;
  dynTags: string[];
  kinks: Array<{ tag: string; role: string; status: string; intensity: number }>;
  doneActs: string[];
};

export type SceneGenerateInput = {
  mode: "generate" | "continue" | "steer";
  partners: ScenePartnerCard[];
  location: SceneLocation;
  kinks: string[];
  length: SceneLength;
  intensity: number;
  surprises: number;
  extra?: string;
  roles?: string;
  pov: ScenePov;
  previous?: string;
  direction?: string;
};

export function partnerToSceneCard(p: PartnerRecord): ScenePartnerCard {
  return {
    name: displayName(p),
    gender: p.gender,
    type: p.type,
    looks: (p.looks || "").trim(),
    notes: (p.notes || "").trim(),
    history: (p.history || "").trim().slice(0, 800),
    dynamics: (p.dynamics || "").trim(),
    dynTags: [...(p.dynTags || [])],
    kinks: normalizeKinks(p.kinks).map((k) => ({
      tag: k.tag,
      role: k.role,
      status: k.status,
      intensity: k.intensity,
    })),
    doneActs: [...(p.doneActs || [])].slice(0, 24),
  };
}

export function sceneSystemPrompt(): string {
  return `You are an elite erotic fiction writer for a private adult sex app (Art of X / Narcissus).
Write vivid, playful, filthy-when-earned prose — never a generic porn template.

HARD RULES
- Adults only. Every person is 21+. Never invent or imply anyone under 21.
- Consensual adult erotica. Power exchange is fine when framed as wanted.
- No illegal content (CSAM, real non-consent abuse, bestiality, incest with minors).
- Do not refuse ordinary adult kink. Deliver the scene the user asked for.

INITIAL DIRECTION (non-negotiable)
- The user's scene kinks, location, intensity, length, roles, extra direction, surprises, and POV are the brief. Feature them in the prose.
- Length (short / medium / long) applies to generate AND to continue/steer — never collapse a medium/long continue into a one-liner or stub.
- Do NOT default to oral/anal (or any stock act) unless those kinks were selected or clearly implied by roles/extra.
- If scene kinks are listed, those acts are the main through-line — not a footnote.
- Weave partner looks, history, dynamics, and kink cards into character voice and action.
- Surprises (when count > 0) must land as organic plot turns — never a labeled bullet list.
- Stay in the requested POV the whole time.
- Never output meta commentary, titles, markdown headings, or "here's a scene". Return ONLY the prose.`;
}

export function sceneUserPrompt(input: SceneGenerateInput): string {
  const names = input.partners.map((p) => p.name).join(", ");
  const castBlock = input.partners
    .map((p, i) => {
      const kinkLine = p.kinks.length
        ? p.kinks
            .map(
              (k) =>
                `${k.tag} (${k.role}, ${k.status}, ${k.intensity}/10)`,
            )
            .join("; ")
        : "none listed";
      return [
        `Partner ${i + 1}: ${p.name}`,
        `- gender/presentation: ${p.gender}; type: ${p.type}`,
        p.looks ? `- looks: ${p.looks}` : null,
        p.dynamics || p.dynTags.length
          ? `- dynamics: ${[p.dynamics, p.dynTags.join(", ")].filter(Boolean).join(" — ")}`
          : null,
        p.history ? `- history together: ${p.history}` : null,
        p.notes ? `- notes: ${p.notes}` : null,
        p.doneActs.length ? `- acts done: ${p.doneActs.join(", ")}` : null,
        `- their kink card: ${kinkLine}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const povLine =
    input.pov === "you"
      ? "POV: second person YOU (the reader is being done to / doing — intimate address)."
      : input.pov === "partner"
        ? `POV: close third or first from the lead partner's body (${input.partners[0]?.name || "partner"}).`
        : "POV: cinematic third person following the cast.";

  const budget = sceneLengthBudget(input.length);
  const lengthGuide =
    input.mode === "generate"
      ? `Length: ${budget.label}. ${budget.generateGuide}`
      : `Length: ${budget.label} — this applies to the NEW continue/steer prose you write now (not a tiny snippet). ${budget.continueGuide} Hit the word/paragraph target; do not collapse to a one-liner.`;

  const modeBlock =
    input.mode === "generate"
      ? "MODE: Write a brand-new scene from scratch that follows the INITIAL DIRECTION below."
      : input.mode === "continue"
        ? "MODE: Continue the previous scene with a fresh stretch (new acts/tension) at the requested Length. Keep honoring the same kink/location/roles brief. Do not restart. Do not summarize. Return ONLY the new append-ready prose beat (no --- separators, do not repeat prior text)."
        : `MODE: Steer the previous scene at the requested Length. Honor this direction literally and erotically: "${(input.direction || "").trim()}". Continue forward; do not restart. Write a full-length steered stretch — not a one-sentence acknowledgment. Return ONLY the new append-ready prose beat (no --- separators, do not repeat prior text).`;

  return [
    modeBlock,
    povLine,
    lengthGuide,
    `Intensity target: ${input.intensity}/10 (1 soft tease → 10 filthy overwhelming).`,
    `Setting (must be felt in the prose): ${input.location.name} — ${input.location.desc}`,
    input.kinks.length
      ? `SCENE KINKS TO FEATURE AS THE MAIN ACTS (required): ${input.kinks.join(", ")}.`
      : "Scene kinks: follow partner cards — do not invent a stock oral/anal template.",
    input.roles?.trim() ? `Roles / who leads (required): ${input.roles.trim()}` : null,
    input.extra?.trim()
      ? `Extra direction (required — bend the scene around this): ${input.extra.trim()}`
      : null,
    input.surprises > 0
      ? `Fold in ${input.surprises} surprise turn(s) organically (texts, toys, power flip, watcher, denial, etc.) — never as a labeled list.`
      : "No surprise turns — keep the arc clean.",
    `Cast: ${names || "(none)"}`,
    "",
    castBlock,
    input.previous?.trim()
      ? `\nPREVIOUS SCENE TEXT:\n${input.previous.trim().slice(-6000)}`
      : null,
    "",
    input.mode === "generate"
      ? "Write the scene now. Lead with the selected kinks and setting — not a default template."
      : `Write the ${budget.label.toLowerCase()} continue/steer stretch now (~${budget.wordsMin}–${budget.wordsMax} words, ~${budget.paragraphsMin}–${budget.paragraphsMax} paragraphs). Lead with the selected kinks and setting — not a default template or a stub.`,
  ]
    .filter((x) => x !== null)
    .join("\n");
}

/** Shared short/medium/long targets for generate + continue/steer. */
export type SceneLengthBudget = {
  label: "SHORT" | "MEDIUM" | "LONG";
  wordsMin: number;
  wordsMax: number;
  paragraphsMin: number;
  paragraphsMax: number;
  generateGuide: string;
  continueGuide: string;
  maxTokens: number;
};

export function sceneLengthBudget(length: SceneLength): SceneLengthBudget {
  if (length === "short") {
    return {
      label: "SHORT",
      wordsMin: 350,
      wordsMax: 550,
      paragraphsMin: 2,
      paragraphsMax: 4,
      generateGuide:
        "One charged beat that still feels complete (~350–550 words, ~2–4 paragraphs).",
      continueGuide:
        "One charged continuation (~350–550 words, ~2–4 paragraphs) that advances acts/tension.",
      maxTokens: 900,
    };
  }
  if (length === "long") {
    return {
      label: "LONG",
      wordsMin: 900,
      wordsMax: 1400,
      paragraphsMin: 6,
      paragraphsMax: 10,
      generateGuide:
        "Multiple position shifts, dialogue, edge/build, sensory density (~900–1400 words, ~6–10 paragraphs).",
      continueGuide:
        "A long continuation with position shifts, dialogue, and sensory density (~900–1400 words, ~6–10 paragraphs).",
      maxTokens: 3200,
    };
  }
  return {
    label: "MEDIUM",
    wordsMin: 550,
    wordsMax: 850,
    paragraphsMin: 4,
    paragraphsMax: 6,
    generateGuide:
      "Opening heat, escalation, a strong mid beat, clear peak (~550–850 words, ~4–6 paragraphs).",
    continueGuide:
      "A medium continuation with escalation and a strong mid beat (~550–850 words, ~4–6 paragraphs).",
    maxTokens: 2000,
  };
}

export function maxTokensFor(
  length: SceneLength,
  _mode: SceneGenerateInput["mode"],
): number {
  // Continue/steer must hit the same short/medium/long word budgets as generate.
  return sceneLengthBudget(length).maxTokens;
}
