/**
 * Studio templates — photo scenes + video clips.
 * Restored after VM wipe (NA-41 / NA-48). Photo options must stay visible
 * even when Comfy is down; generation can still 404 at job time.
 */

export type TemplateKind = "photo" | "video";

export type PhotoTemplateId =
  | "blowjob"
  | "double_blowjob"
  | "cumshot"
  | "facial"
  | "lingerie"
  | "bikini"
  | "lbd"
  | "wet_silk";

export type VideoTemplateId = "natural" | "blowjob" | "say";

export type StudioTemplateId = PhotoTemplateId | VideoTemplateId;

export type StudioTemplate = {
  id: StudioTemplateId;
  kind: TemplateKind;
  label: string;
  blurb: string;
  /** Img2img / still-stage prompt (empty = leave the upload as-is) */
  stillPrompt?: string;
  /** How hard to reshape before locking identity (photo) or animating (video) */
  stillDenoise: number;
  /** SVD motion bucket — video only */
  motion?: number;
  needsSpeech?: boolean;
  /** Outfit-change looks (lingerie / bikini / LBD / wet silk) */
  outfitChange?: boolean;
};

export type SayVoice = {
  id: string;
  label: string;
  blurb: string;
};

/** Edge-TTS neural voices for Say This (NA-25). */
export const SAY_VOICES: SayVoice[] = [
  {
    id: "en-US-JennyNeural",
    label: "Jenny",
    blurb: "Warm US female — default for Say This.",
  },
  {
    id: "en-US-AriaNeural",
    label: "Aria",
    blurb: "Soft US female, intimate tone.",
  },
  {
    id: "en-US-SaraNeural",
    label: "Sara",
    blurb: "Clear US female, slightly brighter.",
  },
  {
    id: "en-GB-SoniaNeural",
    label: "Sonia",
    blurb: "British female.",
  },
  {
    id: "en-US-GuyNeural",
    label: "Guy",
    blurb: "US male.",
  },
  {
    id: "en-US-DavisNeural",
    label: "Davis",
    blurb: "Deeper US male.",
  },
];

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  // —— Photo scenes (identity-locked img2img) ——
  {
    id: "blowjob",
    kind: "photo",
    label: "Blowjob",
    blurb: "Oral POV still — your face locked onto the scene.",
    stillPrompt:
      "photorealistic adult oral sex blowjob scene, same person face and identity preserved exactly, matching the reference photo face, lips around penis, intimate POV, detailed eyes and mouth, realistic skin",
    stillDenoise: 0.55,
  },
  {
    id: "double_blowjob",
    kind: "photo",
    label: "Double blowjob",
    blurb: "Two mouths sharing — your face on the primary subject.",
    stillPrompt:
      "photorealistic adult double blowjob threesome oral scene, two women sharing one penis, same person face and identity preserved exactly on the primary subject matching the reference photo, intimate close-up, realistic skin",
    stillDenoise: 0.58,
  },
  {
    id: "cumshot",
    kind: "photo",
    label: "Cumshot",
    blurb: "Finish on body — face and hair stay yours.",
    stillPrompt:
      "photorealistic adult cumshot scene, semen on body and chest, same person face and identity preserved exactly matching the reference photo, aroused expression, realistic skin and fluid detail",
    stillDenoise: 0.52,
  },
  {
    id: "facial",
    kind: "photo",
    label: "Facial",
    blurb: "Finish on face — likeness locked tight.",
    stillPrompt:
      "photorealistic adult facial cumshot, semen on face and lips, same person face and identity preserved exactly matching the reference photo, eyes open, intimate close-up portrait, realistic skin",
    stillDenoise: 0.5,
  },
  {
    id: "lingerie",
    kind: "photo",
    label: "Lingerie",
    blurb: "Outfit change — sheer lingerie, same person.",
    stillPrompt:
      "photorealistic adult woman in elegant sheer lingerie, lace bra and panties, same person face and identity preserved exactly matching the reference photo, bedroom soft light, realistic fabric and skin",
    stillDenoise: 0.5,
    outfitChange: true,
  },
  {
    id: "bikini",
    kind: "photo",
    label: "Bikini",
    blurb: "Outfit change — swimwear, same person.",
    stillPrompt:
      "photorealistic adult in a revealing bikini, same person face and identity preserved exactly matching the reference photo, sunlit skin, beach or pool vibe, realistic fabric",
    stillDenoise: 0.5,
    outfitChange: true,
  },
  {
    id: "lbd",
    kind: "photo",
    label: "Little black dress",
    blurb: "Outfit change — tight LBD, same person.",
    stillPrompt:
      "photorealistic adult in a tight little black dress, elegant evening look, same person face and identity preserved exactly matching the reference photo, soft glam light, realistic fabric and skin",
    stillDenoise: 0.5,
    outfitChange: true,
  },
  {
    id: "wet_silk",
    kind: "photo",
    label: "Wet silk",
    blurb: "Outfit change — wet silk clinging, same person.",
    stillPrompt:
      "photorealistic adult in wet translucent silk dress clinging to the body, same person face and identity preserved exactly matching the reference photo, glossy wet fabric, intimate lighting, realistic skin",
    stillDenoise: 0.52,
    outfitChange: true,
  },

  // —— Video (5s SVD) ——
  {
    id: "natural",
    kind: "video",
    label: "Natural motion",
    blurb: "Keeps your photo almost untouched and adds subtle 5s movement.",
    stillDenoise: 0,
    motion: 90,
    needsSpeech: false,
  },
  {
    id: "blowjob",
    kind: "video",
    label: "Blowjob",
    blurb:
      "Adult oral template — light edit then 5s video, face locked as tight as we can.",
    stillPrompt:
      "photorealistic adult oral sex blowjob scene, same person face and identity preserved exactly, matching the reference photo face, realistic skin, intimate POV, detailed eyes and mouth",
    stillDenoise: 0.32,
    motion: 140,
    needsSpeech: false,
  },
  {
    id: "say",
    kind: "video",
    label: "Say this",
    blurb: "Make the photo talk — pick a voice and type the line.",
    stillDenoise: 0,
    motion: 110,
    needsSpeech: true,
  },
];

export const PHOTO_TEMPLATES: StudioTemplate[] = STUDIO_TEMPLATES.filter(
  (t) => t.kind === "photo",
);

export const VIDEO_TEMPLATES: StudioTemplate[] = STUDIO_TEMPLATES.filter(
  (t) => t.kind === "video",
);

export const OUTFIT_TEMPLATES: StudioTemplate[] = PHOTO_TEMPLATES.filter(
  (t) => t.outfitChange,
);

export const ACT_TEMPLATES: StudioTemplate[] = PHOTO_TEMPLATES.filter(
  (t) => !t.outfitChange,
);

export type VideoTemplate = StudioTemplate;

export function getPhotoTemplate(id: string | undefined): StudioTemplate {
  return (
    PHOTO_TEMPLATES.find((t) => t.id === id) || PHOTO_TEMPLATES[0]!
  );
}

export function getVideoTemplate(id: string | undefined): StudioTemplate {
  return (
    VIDEO_TEMPLATES.find((t) => t.id === id) || VIDEO_TEMPLATES[0]!
  );
}

export function isPhotoTemplateId(id: string): id is PhotoTemplateId {
  return PHOTO_TEMPLATES.some((t) => t.id === id);
}

export function isVideoTemplateId(id: string): id is VideoTemplateId {
  return VIDEO_TEMPLATES.some((t) => t.id === id);
}

export function getSayVoice(id: string | undefined): SayVoice {
  return SAY_VOICES.find((v) => v.id === id) || SAY_VOICES[0]!;
}

export function isSayVoiceId(id: string): boolean {
  return SAY_VOICES.some((v) => v.id === id);
}
