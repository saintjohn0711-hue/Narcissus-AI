import { getVideoTemplate, type VideoTemplateId } from "./templates";

export type JobMode = "faceswap" | "undress" | "custom" | "video";

const CKPT_SD15 = "v1-5-pruned-emaonly-fp16.safetensors";
const CKPT_SVD = "svd_xt.safetensors";

const NEGATIVE =
  "child, minor, underage, baby, toddler, teen, different person, face change, identity change, blurry, low quality, deformed, extra limbs, watermark, text";

const DEFAULT_PROMPTS: Record<Exclude<JobMode, "video">, string> = {
  faceswap:
    "photorealistic adult portrait of the exact same person as the reference, identical face, same eyes nose mouth bone structure, natural skin, studio soft light",
  undress:
    "photorealistic adult nude edit of the exact same person, identical face preserved perfectly, remove clothing, natural skin, same body identity",
  custom:
    "photorealistic adult photo of the exact same person as the reference, identical face and likeness, natural skin, detailed face",
};

export function defaultPromptFor(mode: JobMode): string {
  if (mode === "video") return "";
  return DEFAULT_PROMPTS[mode];
}

/** Map UI identity 0–1 → denoise (higher identity = lower denoise). */
export function denoiseForIdentity(
  mode: Exclude<JobMode, "video">,
  identity = 0.85,
): number {
  const base =
    mode === "faceswap" ? 0.28 : mode === "undress" ? 0.4 : 0.3;
  const clamped = Math.min(1, Math.max(0.35, identity));
  // identity 1 → ~55% of base denoise; identity 0.35 → full base
  const factor = 1.35 - clamped; // 0.35..1.0
  return Math.max(0.12, Math.min(0.55, base * factor));
}

/**
 * True face swap via ReActor:
 * - targetImage = body/scene photo that receives the face (input_image)
 * - faceImage = donor face to swap in (source_image)
 */
export function buildFaceSwapPrompt(
  targetImage: string,
  faceImage: string,
  opts?: {
    width?: number;
    height?: number;
    prefix?: string;
    restoreVisibility?: number;
  },
): Record<string, unknown> {
  const width = opts?.width ?? 768;
  const height = opts?.height ?? 768;
  const prefix = opts?.prefix ?? "narcissus_faceswap";
  const restoreVisibility = opts?.restoreVisibility ?? 1;

  return {
    "1": {
      class_type: "LoadImage",
      inputs: { image: targetImage },
    },
    "2": {
      class_type: "LoadImage",
      inputs: { image: faceImage },
    },
    "3": {
      class_type: "ImageScale",
      inputs: {
        image: ["1", 0],
        upscale_method: "lanczos",
        width,
        height,
        crop: "disabled",
      },
    },
    "4": {
      class_type: "ImageScale",
      inputs: {
        image: ["2", 0],
        upscale_method: "lanczos",
        width: 512,
        height: 512,
        crop: "disabled",
      },
    },
    "5": {
      class_type: "ReActorFaceSwap",
      inputs: {
        enabled: true,
        input_image: ["3", 0],
        source_image: ["4", 0],
        swap_model: "inswapper_128.onnx",
        facedetection: "retinaface_resnet50",
        face_restore_model: "GFPGANv1.4.pth",
        face_restore_visibility: restoreVisibility,
        codeformer_weight: 0.5,
        detect_gender_input: "no",
        detect_gender_source: "no",
        input_faces_index: "0",
        source_faces_index: "0",
        console_log_level: 1,
      },
    },
    "6": {
      class_type: "SaveImage",
      inputs: { filename_prefix: prefix, images: ["5", 0] },
    },
  };
}

export function buildImg2ImgPrompt(
  mode: Exclude<JobMode, "video">,
  imageName: string,
  opts?: {
    seed?: number;
    promptOverride?: string;
    identity?: number;
    denoise?: number;
    width?: number;
    height?: number;
    prefix?: string;
  },
): Record<string, unknown> {
  const seed = opts?.seed ?? Math.floor(Math.random() * 2 ** 32);
  const positive =
    `${opts?.promptOverride?.trim() || DEFAULT_PROMPTS[mode]}, exact same face as reference photo, preserve identity`;
  const denoise =
    opts?.denoise ?? denoiseForIdentity(mode, opts?.identity ?? 0.85);
  const width = opts?.width ?? 768;
  const height = opts?.height ?? 768;
  const prefix = opts?.prefix ?? `narcissus_${mode}`;

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: CKPT_SD15 },
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
        width,
        height,
        crop: "disabled",
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
        steps: 28,
        cfg: 5.5,
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
    // Blend original back in so the face/photo stays closer to the upload
    "9": {
      class_type: "ImageBlend",
      inputs: {
        image1: ["8", 0],
        image2: ["3", 0],
        blend_factor: Math.min(0.55, Math.max(0.2, (opts?.identity ?? 0.85) * 0.45)),
        blend_mode: "normal",
      },
    },
    "10": {
      class_type: "SaveImage",
      inputs: { filename_prefix: prefix, images: ["9", 0] },
    },
  };
}

export type VideoBuildOpts = {
  seed?: number;
  template?: VideoTemplateId;
  speech?: string;
  identity?: number;
  /** 5s default */
  seconds?: number;
  fps?: number;
  width?: number;
  height?: number;
};

/**
 * 5s SVD video. Templates:
 * - natural / say: animate the upload directly (max likeness)
 * - blowjob: light still edit then animate
 * Speech text is attached for the say template (lip-sync API can hook later).
 */
export function buildVideoPrompt(
  imageName: string,
  opts?: VideoBuildOpts,
): Record<string, unknown> {
  const tpl = getVideoTemplate(opts?.template);
  const seed = opts?.seed ?? Math.floor(Math.random() * 2 ** 32);
  const fps = opts?.fps ?? 8;
  const seconds = opts?.seconds ?? 5;
  const frames = Math.max(8, Math.round(fps * seconds));
  const motion = tpl.motion;
  const width = opts?.width ?? 576;
  const height = opts?.height ?? 320;
  const identity = opts?.identity ?? 0.9;

  // Direct photo → video (best likeness)
  if (tpl.stillDenoise <= 0) {
    return svdFromImage(imageName, {
      seed,
      frames,
      fps,
      motion,
      width,
      height,
      prefix: `narcissus_${tpl.id}`,
    });
  }

  // Template that needs a posed still first, then SVD — keep denoise low
  const denoise = Math.max(
    0.18,
    tpl.stillDenoise * (1.3 - Math.min(1, Math.max(0.4, identity))),
  );
  const still = buildImg2ImgPrompt("custom", imageName, {
    seed,
    promptOverride: tpl.stillPrompt,
    denoise,
    identity,
    width,
    height,
    prefix: `narcissus_${tpl.id}_still`,
  });

  // Rebuild as a single graph: still nodes 1-9, then SVD from blended still (node 9)
  // Drop SaveImage (10); feed 9 into SVD chain starting at 11
  const { "10": _save, ...stillNodes } = still as Record<string, unknown>;
  void _save;

  return {
    ...stillNodes,
    "11": {
      class_type: "ImageOnlyCheckpointLoader",
      inputs: { ckpt_name: CKPT_SVD },
    },
    "12": {
      class_type: "ImageScale",
      inputs: {
        image: ["9", 0],
        upscale_method: "lanczos",
        width,
        height,
        crop: "disabled",
      },
    },
    "13": {
      class_type: "SVD_img2vid_Conditioning",
      inputs: {
        clip_vision: ["11", 1],
        init_image: ["12", 0],
        vae: ["11", 2],
        width,
        height,
        video_frames: frames,
        motion_bucket_id: motion,
        fps,
        augmentation_level: 0.0,
      },
    },
    "14": {
      class_type: "KSampler",
      inputs: {
        seed: seed + 1,
        steps: 20,
        cfg: 2.5,
        sampler_name: "euler",
        scheduler: "karras",
        denoise: 1.0,
        model: ["11", 0],
        positive: ["13", 0],
        negative: ["13", 1],
        latent_image: ["13", 2],
      },
    },
    "15": {
      class_type: "VAEDecode",
      inputs: { samples: ["14", 0], vae: ["11", 2] },
    },
    "16": {
      class_type: "CreateVideo",
      inputs: { images: ["15", 0], fps },
    },
    "17": {
      class_type: "SaveVideo",
      inputs: {
        video: ["16", 0],
        filename_prefix: `narcissus_${tpl.id}`,
        format: "mp4",
        codec: "h264",
      },
    },
  };
}

function svdFromImage(
  imageName: string,
  opts: {
    seed: number;
    frames: number;
    fps: number;
    motion: number;
    width: number;
    height: number;
    prefix: string;
  },
): Record<string, unknown> {
  return {
    "1": {
      class_type: "ImageOnlyCheckpointLoader",
      inputs: { ckpt_name: CKPT_SVD },
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
        width: opts.width,
        height: opts.height,
        crop: "disabled",
      },
    },
    "4": {
      class_type: "SVD_img2vid_Conditioning",
      inputs: {
        clip_vision: ["1", 1],
        init_image: ["3", 0],
        vae: ["1", 2],
        width: opts.width,
        height: opts.height,
        video_frames: opts.frames,
        motion_bucket_id: opts.motion,
        fps: opts.fps,
        augmentation_level: 0.0,
      },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed: opts.seed,
        steps: 20,
        cfg: 2.5,
        sampler_name: "euler",
        scheduler: "karras",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["4", 0],
        negative: ["4", 1],
        latent_image: ["4", 2],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "CreateVideo",
      inputs: { images: ["6", 0], fps: opts.fps },
    },
    "8": {
      class_type: "SaveVideo",
      inputs: {
        video: ["7", 0],
        filename_prefix: opts.prefix,
        format: "mp4",
        codec: "h264",
      },
    },
  };
}
