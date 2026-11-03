export type VideoTemplateId = "natural" | "blowjob" | "say";

export type VideoTemplate = {
  id: VideoTemplateId;
  label: string;
  blurb: string;
  /** Still-stage prompt before SVD (empty = animate the upload as-is) */
  stillPrompt?: string;
  /** How hard to reshape the still before animating (lower = more original) */
  stillDenoise: number;
  motion: number;
  needsSpeech: boolean;
};

export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: "natural",
    label: "Natural motion",
    blurb: "Keeps your photo almost untouched and adds subtle 5s movement.",
    stillDenoise: 0,
    motion: 90,
    needsSpeech: false,
  },
  {
    id: "blowjob",
    label: "Blowjob",
    blurb: "Adult oral template — light edit then 5s video, face locked as tight as we can.",
    stillPrompt:
      "photorealistic adult oral sex blowjob scene, same person face and identity preserved exactly, matching the reference photo face, realistic skin, intimate POV, detailed eyes and mouth",
    stillDenoise: 0.32,
    motion: 140,
    needsSpeech: false,
  },
  {
    id: "say",
    label: "Say this",
    blurb: "Make the photo talk — type the line you want spoken on camera.",
    stillDenoise: 0,
    motion: 110,
    needsSpeech: true,
  },
];

export function getVideoTemplate(id: string | undefined): VideoTemplate {
  return (
    VIDEO_TEMPLATES.find((t) => t.id === id) ||
    VIDEO_TEMPLATES[0]!
  );
}
