/** Body presentation for clothing removal — drives anatomy under the clothes. */
export type BodyTypeId = "female" | "male" | "tranny" | "cross_dresser";

export type BodyType = {
  id: BodyTypeId;
  label: string;
  blurb: string;
  /** Positive prompt fragment describing nude anatomy after clothing removal */
  anatomyPrompt: string;
  /** Extra negatives so the wrong sex characteristics don't leak in */
  anatomyNegative: string;
};

export const BODY_TYPES: BodyType[] = [
  {
    id: "female",
    label: "Female",
    blurb: "Cis female body under the clothes.",
    anatomyPrompt:
      "adult woman nude body, natural female breasts, nipples, vagina, vulva, feminine hips and waist, no penis, no testicles",
    anatomyNegative:
      "penis, dick, cock, balls, testicles, scrotum, male chest, flat chest, beard, adam's apple, shemale, futa",
  },
  {
    id: "male",
    label: "Male",
    blurb: "Cis male body under the clothes.",
    anatomyPrompt:
      "adult man nude body, male chest, flat pectorals, penis, cock, testicles, masculine shoulders, no breasts, no vagina",
    anatomyNegative:
      "female breasts, boobs, cleavage, vagina, vulva, pussy, feminine hips, lipstick, shemale, futa",
  },
  {
    id: "tranny",
    label: "Tranny",
    blurb: "Feminine presentation with breasts and penis.",
    anatomyPrompt:
      "adult transgender woman nude body, feminine face and body, natural female breasts, nipples, penis, cock, testicles, soft feminine hips, no vagina",
    anatomyNegative:
      "vagina, vulva, pussy, flat male chest only, no breasts, cis man only, cis woman only",
  },
  {
    id: "cross_dresser",
    label: "Cross Dresser",
    blurb: "Male body under feminine clothing (clothes were the costume).",
    anatomyPrompt:
      "adult male crossdresser now nude, male body underneath feminine clothes removed, flat male chest, penis, cock, testicles, masculine body, no female breasts, no vagina",
    anatomyNegative:
      "female breasts, boobs, vagina, vulva, pussy, feminine nude woman, shemale breasts with penis",
  },
];

export function getBodyType(id: string | undefined): BodyType {
  return BODY_TYPES.find((b) => b.id === id) || BODY_TYPES[0]!;
}

export function isBodyTypeId(id: string): id is BodyTypeId {
  return BODY_TYPES.some((b) => b.id === id);
}
