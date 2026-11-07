/**
 * Studio templates — photo scenes + video clips.
 * Restored after VM wipe (NA-41 / NA-48). Photo options must stay visible
 * even when Comfy is down; generation can still 404 at job time.
 *
 * NA-80: video modes expanded toward competitor parity (acts + face-swap video).
 */

export type TemplateKind = "photo" | "video";

export type PhotoTemplateId =
  | "blowjob"
  | "double_blowjob"
  | "cumshot"
  | "facial"
  | "missionary"
  | "doggy"
  | "riding"
  | "lingerie"
  | "bikini"
  | "lbd"
  | "wet_silk";

export type VideoTemplateId =
  | "natural"
  | "blowjob"
  | "double_blowjob"
  | "cumshot"
  | "facial"
  | "missionary"
  | "doggy"
  | "riding"
  | "lingerie"
  | "say"
  | "face_swap";

export type StudioTemplateId = PhotoTemplateId | VideoTemplateId;

/** UI grouping for video templates in Studio. */
export type VideoGroup = "motion" | "act" | "speak" | "swap";

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
  /** Donor face upload required (face-swap still/video) */
  needsFace?: boolean;
  /** Outfit-change looks (lingerie / bikini / LBD / wet silk) */
  outfitChange?: boolean;
  /** Append undress-style body/cock anatomy into the still prompt when set */
  useBodyOptions?: boolean;
  videoGroup?: VideoGroup;
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
    useBodyOptions: true,
  },
  {
    id: "double_blowjob",
    kind: "photo",
    label: "Double blowjob",
    blurb: "Two mouths sharing — your face on the primary subject.",
    stillPrompt:
      "photorealistic adult double blowjob threesome oral scene, two women sharing one penis, same person face and identity preserved exactly on the primary subject matching the reference photo, intimate close-up, realistic skin",
    stillDenoise: 0.58,
    useBodyOptions: true,
  },
  {
    id: "cumshot",
    kind: "photo",
    label: "Cumshot",
    blurb: "Finish on body — face and hair stay yours.",
    stillPrompt:
      "photorealistic adult cumshot scene, semen on body and chest, same person face and identity preserved exactly matching the reference photo, aroused expression, realistic skin and fluid detail",
    stillDenoise: 0.52,
    useBodyOptions: true,
  },
  {
    id: "facial",
    kind: "photo",
    label: "Facial",
    blurb: "Finish on face — likeness locked tight.",
    stillPrompt:
      "photorealistic adult facial cumshot, semen on face and lips, same person face and identity preserved exactly matching the reference photo, eyes open, intimate close-up portrait, realistic skin",
    stillDenoise: 0.5,
    useBodyOptions: true,
  },
  {
    id: "missionary",
    kind: "photo",
    label: "Missionary",
    blurb: "Missionary sex still — face locked, body engaged.",
    stillPrompt:
      "photorealistic adult missionary sex scene, lying on back legs open, partner between legs, penetrative sex, same person face and identity preserved exactly matching the reference photo, intimate bedroom, realistic skin",
    stillDenoise: 0.56,
    useBodyOptions: true,
  },
  {
    id: "doggy",
    kind: "photo",
    label: "Doggy",
    blurb: "Doggy-style still — face glance back, body bent.",
    stillPrompt:
      "photorealistic adult doggy style sex scene, on all fours looking back, penetrative sex from behind, same person face and identity preserved exactly matching the reference photo, intimate, realistic skin",
    stillDenoise: 0.56,
    useBodyOptions: true,
  },
  {
    id: "riding",
    kind: "photo",
    label: "Riding",
    blurb: "Cowgirl riding still — face toward camera.",
    stillPrompt:
      "photorealistic adult cowgirl riding sex scene, straddling partner facing camera, penetrative sex, same person face and identity preserved exactly matching the reference photo, intimate, realistic skin",
    stillDenoise: 0.56,
    useBodyOptions: true,
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
    videoGroup: "motion",
  },
  {
    id: "blowjob",
    kind: "video",
    label: "Blowjob",
    blurb:
      "Oral POV still → 5s video. Face locked as tight as the stack allows.",
    stillPrompt:
      "photorealistic adult oral sex blowjob scene, same person face and identity preserved exactly, matching the reference photo face, lips around penis, realistic skin, intimate POV, detailed eyes and mouth",
    stillDenoise: 0.34,
    motion: 145,
    needsSpeech: false,
    useBodyOptions: true,
    videoGroup: "act",
  },
  {
    id: "double_blowjob",
    kind: "video",
    label: "Double blowjob",
    blurb: "Two mouths sharing — primary face is yours, then 5s motion.",
    stillPrompt:
      "photorealistic adult double blowjob threesome oral scene, two women sharing one penis, same person face and identity preserved exactly on the primary subject matching the reference photo, intimate close-up, realistic skin",
    stillDenoise: 0.36,
    motion: 140,
    useBodyOptions: true,
    videoGroup: "act",
  },
  {
    id: "cumshot",
    kind: "video",
    label: "Cumshot",
    blurb: "Finish on body — still edit then 5s fluid motion.",
    stillPrompt:
      "photorealistic adult cumshot scene, semen on body and chest, same person face and identity preserved exactly matching the reference photo, aroused expression, realistic skin and fluid detail",
    stillDenoise: 0.34,
    motion: 130,
    useBodyOptions: true,
    videoGroup: "act",
  },
  {
    id: "facial",
    kind: "video",
    label: "Facial",
    blurb: "Finish on face — likeness first, then subtle motion.",
    stillPrompt:
      "photorealistic adult facial cumshot, semen on face and lips, same person face and identity preserved exactly matching the reference photo, eyes open, intimate close-up portrait, realistic skin",
    stillDenoise: 0.32,
    motion: 110,
    useBodyOptions: true,
    videoGroup: "act",
  },
  {
    id: "missionary",
    kind: "video",
    label: "Missionary",
    blurb: "Missionary sex still → thrusting motion.",
    stillPrompt:
      "photorealistic adult missionary sex scene, lying on back legs open, partner between legs, penetrative sex, same person face and identity preserved exactly matching the reference photo, intimate bedroom, realistic skin",
    stillDenoise: 0.36,
    motion: 155,
    useBodyOptions: true,
    videoGroup: "act",
  },
  {
    id: "doggy",
    kind: "video",
    label: "Doggy",
    blurb: "Doggy-style still → rhythmic motion.",
    stillPrompt:
      "photorealistic adult doggy style sex scene, on all fours looking back, penetrative sex from behind, same person face and identity preserved exactly matching the reference photo, intimate, realistic skin",
    stillDenoise: 0.36,
    motion: 160,
    useBodyOptions: true,
    videoGroup: "act",
  },
  {
    id: "riding",
    kind: "video",
    label: "Riding",
    blurb: "Cowgirl still → bounce motion toward camera.",
    stillPrompt:
      "photorealistic adult cowgirl riding sex scene, straddling partner facing camera, penetrative sex, same person face and identity preserved exactly matching the reference photo, intimate, realistic skin",
    stillDenoise: 0.36,
    motion: 155,
    useBodyOptions: true,
    videoGroup: "act",
  },
  {
    id: "lingerie",
    kind: "video",
    label: "Lingerie tease",
    blurb: "Sheer lingerie still → soft tease motion.",
    stillPrompt:
      "photorealistic adult woman in elegant sheer lingerie, lace bra and panties, same person face and identity preserved exactly matching the reference photo, bedroom soft light, realistic fabric and skin",
    stillDenoise: 0.3,
    motion: 100,
    outfitChange: true,
    videoGroup: "act",
  },
  {
    id: "say",
    kind: "video",
    label: "Say this",
    blurb: "Make the photo talk — pick a voice and type the line (TTS muxed when available).",
    stillDenoise: 0,
    motion: 120,
    needsSpeech: true,
    videoGroup: "speak",
  },
  {
    id: "face_swap",
    kind: "video",
    label: "Face-swap video",
    blurb:
      "Swap your face onto a body/scene photo, then animate 5s — competitor-style short clip.",
    stillDenoise: 0,
    motion: 115,
    needsFace: true,
    videoGroup: "swap",
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

export const VIDEO_MOTION_TEMPLATES = VIDEO_TEMPLATES.filter(
  (t) => t.videoGroup === "motion",
);
export const VIDEO_ACT_TEMPLATES = VIDEO_TEMPLATES.filter(
  (t) => t.videoGroup === "act",
);
export const VIDEO_SPEAK_TEMPLATES = VIDEO_TEMPLATES.filter(
  (t) => t.videoGroup === "speak",
);
export const VIDEO_SWAP_TEMPLATES = VIDEO_TEMPLATES.filter(
  (t) => t.videoGroup === "swap",
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
