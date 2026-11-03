export type JobMode = "faceswap" | "undress";

const CKPT = "v1-5-pruned-emaonly-fp16.safetensors";

const NEGATIVE =
  "child, minor, underage, baby, toddler, teen, blurry, low quality, deformed, extra limbs, watermark, text";

/**
 * Phase-1 img2img graphs. True Reactor face-swap / dedicated undress LoRAs
 * can replace these once custom nodes + models are installed on the Pod.
 */
export function buildImg2ImgPrompt(
  mode: JobMode,
  imageName: string,
  opts?: { seed?: number; promptOverride?: string },
): Record<string, unknown> {
  const seed = opts?.seed ?? Math.floor(Math.random() * 2 ** 32);
  const positive =
    opts?.promptOverride ||
    (mode === "faceswap"
      ? "photorealistic adult portrait, same person likeness, face clearly visible, natural skin, studio soft light, detailed eyes"
      : "photorealistic adult nude body edit, remove clothing, natural skin texture, same person likeness, face preserved, tasteful lighting");

  const denoise = mode === "faceswap" ? 0.42 : 0.62;
  const prefix = mode === "faceswap" ? "narcissus_faceswap" : "narcissus_undress";

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: CKPT },
    },
    "2": {
      class_type: "LoadImage",
      inputs: { image: imageName },
    },
    "3": {
      class_type: "ImageScale",
      inputs: {
        image: ["2", 0],
        upscale_method: "lanczos",
        width: 512,
        height: 512,
        crop: "center",
      },
    },
    "4": {
      class_type: "CLIPTextEncode",
      inputs: { text: positive, clip: ["1", 1] },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: NEGATIVE, clip: ["1", 1] },
    },
    "6": {
      class_type: "VAEEncode",
      inputs: { pixels: ["3", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 20,
        cfg: 7,
        sampler_name: "euler",
        scheduler: "normal",
        denoise,
        model: ["1", 0],
        positive: ["4", 0],
        negative: ["5", 0],
        latent_image: ["6", 0],
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["7", 0], vae: ["1", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: prefix, images: ["8", 0] },
    },
  };
}
