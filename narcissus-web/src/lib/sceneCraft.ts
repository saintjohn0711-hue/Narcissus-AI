/**
 * Art of X scene craft — LLM prompts + partner cards for /api/art-of-x/generate-scene.
 * Adults only (21+). Tuned for vivid, playful/steamy Grok-like prose.
 */

import {
  displayName,
  normalizeKinks,
  type PartnerRecord,
  type SceneLength,
  type SceneLocation,
} from "@/lib/artOfX";

export type ScenePov = "you" | "partner" | "third";

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
Write like the best of Grok's steamy mode: vivid, playful, filthy when earned, emotionally charged, specific — never generic porn template paste.

HARD RULES
- Adults only. Every person is 21+. Never invent or imply anyone under 21. No minors, no "teen", no age-play involving youth.
- Consensual adult erotica. Enthusiastic, negotiated heat — power exchange is fine when framed as wanted.
- No illegal content (CSAM, real non-consent violence as abuse, bestiality, incest with minors).
- Do not refuse ordinary adult kink. Deliver the scene the user asked for.

CRAFT (match Grok energy)
- Specific sensory detail: temperature, wetness, fabric, scent, sound, muscle tremor, eye contact, spit shine, breath on skin.
- Character voice: dialogue that sounds like THESE people (looks, dynamics, kink roles), not stock dirty talk.
- Use partner looks, history, dynamics, and kink status when provided — weave them in, don't dump lists.
- Vary sentence rhythm. Mix short punches with longer rolling sentences. Avoid repeating the same verb ("moans", "gasps") every line.
- Build arc: spark → escalation → peak tension → payoff (or deliberate edge/denial if asked). Surprises should land as plot turns, not bullet lists.
- Stay in the requested POV the whole time.
- Explicit anatomy words are welcome when they fit the intensity. Prefer concrete acts over euphemism soup.
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

  const lengthGuide =
    input.length === "short"
      ? "Length: SHORT (~350–550 words). One charged beat that still feels complete."
      : input.length === "long"
        ? "Length: LONG (~900–1400 words). Multiple position shifts, dialogue, edge/build, sensory density."
        : "Length: MEDIUM (~550–850 words). Opening heat, escalation, a strong mid beat, clear peak.";

  const modeBlock =
    input.mode === "generate"
      ? "MODE: Write a brand-new scene from scratch."
      : input.mode === "continue"
        ? "MODE: Continue the previous scene with a fresh beat (new acts/tension). Do not restart. Do not summarize. Append-ready prose only (no ---)."
        : `MODE: Steer the previous scene. Honor this direction literally and erotically: "${(input.direction || "").trim()}". Continue forward; do not restart.`;

  return [
    modeBlock,
    povLine,
    lengthGuide,
    `Intensity target: ${input.intensity}/10 (1 soft tease → 10 filthy overwhelming).`,
    `Setting: ${input.location.name} — ${input.location.desc}`,
    input.kinks.length
      ? `Scene kinks to feature: ${input.kinks.join(", ")}.`
      : "Scene kinks: follow partner cards.",
    input.roles?.trim() ? `Roles / who leads: ${input.roles.trim()}` : null,
    input.extra?.trim() ? `Extra direction: ${input.extra.trim()}` : null,
    input.surprises > 0
      ? `Fold in ${input.surprises} surprise turn(s) organically (texts, toys, power flip, watcher, denial, etc.) — never as a labeled list.`
      : null,
    `Cast: ${names || "(none)"}`,
    "",
    castBlock,
    input.previous?.trim()
      ? `\nPREVIOUS SCENE TEXT:\n${input.previous.trim().slice(-6000)}`
      : null,
    "",
    "Write the scene now.",
  ]
    .filter((x) => x !== null)
    .join("\n");
}

export function maxTokensFor(
  length: SceneLength,
  mode: SceneGenerateInput["mode"],
): number {
  if (mode !== "generate") {
    return length === "long" ? 1200 : length === "short" ? 500 : 800;
  }
  return length === "long" ? 3200 : length === "short" ? 900 : 2000;
}
