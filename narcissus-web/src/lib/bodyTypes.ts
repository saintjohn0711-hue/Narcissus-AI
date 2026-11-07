/** Body presentation for clothing removal — drives anatomy under the clothes. */
export type BodyTypeId = "female" | "male" | "tranny" | "cross_dresser";

export type CockStateId = "hard" | "soft";
export type CockSizeId = "small" | "average" | "large" | "huge";

export type BodyType = {
  id: BodyTypeId;
  label: string;
  blurb: string;
  /** Needs visible penis after undress */
  needsCock: boolean;
  /** Base anatomy without cock state/size (those layer on when needsCock) */
  anatomyPrompt: string;
  anatomyNegative: string;
};

export type CockState = {
  id: CockStateId;
  label: string;
  prompt: string;
  negative: string;
};

export type CockSize = {
  id: CockSizeId;
  label: string;
  prompt: string;
};

export const BODY_TYPES: BodyType[] = [
  {
    id: "female",
    label: "Female",
    blurb: "Cis female body under the clothes.",
    needsCock: false,
    anatomyPrompt:
      "adult woman nude body, natural female breasts, nipples, vagina, vulva, feminine hips and waist, no penis, no testicles",
    anatomyNegative:
      "penis, dick, cock, balls, testicles, scrotum, male chest, flat chest, beard, adam's apple, shemale, futa",
  },
  {
    id: "male",
    label: "Male",
    blurb: "Cis male body under the clothes.",
    needsCock: true,
    anatomyPrompt:
      "adult man nude body, male chest, flat pectorals, clearly visible penis and testicles between the legs, masculine shoulders, no breasts, no vagina",
    anatomyNegative:
      "female breasts, boobs, cleavage, vagina, vulva, pussy, feminine hips, lipstick, shemale, futa, crotch covered, no penis, missing penis",
  },
  {
    id: "tranny",
    label: "Tranny",
    blurb: "Feminine body with breasts and a visible penis.",
    needsCock: true,
    anatomyPrompt:
      "adult transgender woman fully nude, feminine breasts and nipples, soft feminine hips, add a clearly visible penis and testicles on the crotch, hard or soft cock hanging or erect between the legs, shemale futa anatomy, no vagina, genitals not censored",
    anatomyNegative:
      "vagina, vulva, pussy, Barbie crotch, smooth featureless groin, flat male chest only, no breasts, cis man only, cis woman only, crotch covered, no penis, missing penis, smoothed crotch, censored",
  },
  {
    id: "cross_dresser",
    label: "Cross Dresser",
    blurb: "Male body under feminine clothing — penis visible once undressed.",
    needsCock: true,
    anatomyPrompt:
      "adult male crossdresser fully nude after clothes removed, flat male chest, masculine body, add a clearly visible penis and testicles between the legs, cock and balls fully in frame, no female breasts, no vagina, genitals not censored",
    anatomyNegative:
      "female breasts, boobs, vagina, vulva, pussy, Barbie crotch, smooth featureless groin, feminine nude woman, crotch covered, no penis, missing penis, smoothed crotch, censored",
  },
];

export const COCK_STATES: CockState[] = [
  {
    id: "hard",
    label: "Hard",
    prompt:
      "erect hard cock standing up, fully erect penis, rigid shaft, aroused",
    negative: "flaccid, soft penis, limp dick, soft cock hanging down",
  },
  {
    id: "soft",
    label: "Soft",
    prompt:
      "soft flaccid penis hanging naturally, limp cock, unerect, relaxed genitals",
    negative: "erect, hard cock, erection, stiff penis, aroused",
  },
];

export const COCK_SIZES: CockSize[] = [
  {
    id: "small",
    label: "Small",
    prompt: "small penis, short thin cock",
  },
  {
    id: "average",
    label: "Average",
    prompt: "average sized penis, normal cock proportions",
  },
  {
    id: "large",
    label: "Large",
    prompt: "large thick penis, big cock, heavy shaft",
  },
  {
    id: "huge",
    label: "Huge",
    prompt: "huge very large thick penis, massive cock, oversized shaft",
  },
];

export function getBodyType(id: string | undefined): BodyType {
  return BODY_TYPES.find((b) => b.id === id) || BODY_TYPES[0]!;
}

export function isBodyTypeId(id: string): id is BodyTypeId {
  return BODY_TYPES.some((b) => b.id === id);
}

export function getCockState(id: string | undefined): CockState {
  return COCK_STATES.find((c) => c.id === id) || COCK_STATES[0]!;
}

export function isCockStateId(id: string): id is CockStateId {
  return COCK_STATES.some((c) => c.id === id);
}

export function getCockSize(id: string | undefined): CockSize {
  return COCK_SIZES.find((c) => c.id === id) || COCK_SIZES[1]!;
}

export function isCockSizeId(id: string): id is CockSizeId {
  return COCK_SIZES.some((c) => c.id === id);
}

/** Full anatomy block including optional cock state/size. */
export function anatomyPromptFor(
  bodyTypeId: BodyTypeId,
  cockStateId?: CockStateId,
  cockSizeId?: CockSizeId,
): { positive: string; negative: string } {
  const body = getBodyType(bodyTypeId);
  if (!body.needsCock) {
    return { positive: body.anatomyPrompt, negative: body.anatomyNegative };
  }
  const state = getCockState(cockStateId);
  const size = getCockSize(cockSizeId);
  return {
    positive: [
      body.anatomyPrompt,
      size.prompt,
      state.prompt,
      "genitals fully visible and detailed, penis in frame, not cropped, not covered",
      "explicit nude crotch with cock, photo-real penis shaft and glans, scrotum visible",
    ].join(", "),
    negative: [
      body.anatomyNegative,
      state.negative,
      "Barbie doll crotch, blank groin, no genitals, censored genitals",
    ].join(", "),
  };
}
