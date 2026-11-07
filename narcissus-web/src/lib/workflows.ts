import {
  anatomyPromptFor,
  getBodyType,
  type BodyTypeId,
  type CockSizeId,
  type CockStateId,
} from "./bodyTypes";
import { getVideoTemplate, type VideoTemplateId } from "./templates";

export type JobMode = "faceswap" | "undress" | "custom" | "scene" | "video";

const CKPT_SD15 = "v1-5-pruned-emaonly-fp16.safetensors";
const CKPT_SVD = "svd_xt.safetensors";
/** Prefer NSFW-capable realism checkpoint when present on the pod. */
const CKPT_UNDRESS_CANDIDATES = [
  "epicrealism_naturalSinRC1VAE.safetensors",
  "realisticVisionV60B1_v51VAE.safetensors",
  "dreamshaper_8.safetensors",
  CKPT_SD15,
];

const NEGATIVE =
  "child, minor, underage, baby, toddler, teen, different person, face change, identity change, blurry, low quality, deformed, extra limbs, watermark, text";

const DEFAULT_PROMPTS: Record<Exclude<JobMode, "video">, string> = {
  faceswap:
    "photorealistic adult portrait of the exact same person as the reference, identical face, same eyes nose mouth bone structure, natural skin, studio soft light",
  undress:
    "photorealistic adult nude edit of the exact same person, identical face preserved perfectly, completely remove all clothing, natural skin, same pose and framing",
  custom:
    "photorealistic adult photo of the exact same person as the reference, identical face and likeness, natural skin, detailed face",
  scene:
    "photorealistic adult scene of the exact same person as the reference, identical face and likeness, natural skin, detailed face",
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
  // Undress: body can change; head integrity is restored post-pass.
  // Keep denoise moderate so pose/background don't drift.
  const base =
    mode === "faceswap"
      ? 0.28
      : mode === "undress"
        ? 0.5
        : mode === "scene"
          ? 0.4
          : 0.3;
  const clamped = Math.min(1, Math.max(0.35, identity));
  const factor = 1.35 - clamped; // 0.35..1.0
  if (mode === "undress") {
    return Math.max(0.38, Math.min(0.56, base * (0.95 + factor * 0.12)));
  }
  if (mode === "scene") {
    // Floor high enough that SD1.5 actually reshapes the frame (acts/outfits).
    return Math.max(0.52, Math.min(0.72, base * (1.15 + factor * 0.15)));
  }
  return Math.max(0.12, Math.min(0.55, base * factor));
}

/**
 * Scene-template denoise. Template `stillDenoise` is a strength hint — never
 * crush it by (1.25 − identity); that made blowjob/outfits look like passthrough
 * (~0.12–0.15 denoise) before ImageBlend + head-lock pasted the upload back.
 */
export function sceneDenoise(stillDenoise: number, identity = 0.9): number {
  const id = Math.min(1, Math.max(0.5, identity));
  // Identity only trims a little; keep a hard floor so the edit is visible.
  const trim = (1 - id) * 0.1; // 0..0.05
  const boosted = Math.max(0.58, stillDenoise + 0.22);
  return Math.min(0.78, Math.max(0.55, boosted - trim));
}

export function undressCheckpoint(preferred?: string): string {
  if (preferred && preferred.trim()) return preferred.trim();
  return CKPT_UNDRESS_CANDIDATES[0]!;
}

/**
 * True face swap via ReActor:
 * - targetImage = body/scene photo that receives the face (input_image)
 * - faceImage = donor face to swap in (source_image)
 *
 * Use center crop (not letterbox) so face detectors see a filled frame —
 * letterboxed scales often make ReActor emit a pure-black "success" frame.
 */
export function buildFaceSwapPrompt(
  targetImage: string,
  faceImage: string,
  opts?: {
    width?: number;
    height?: number;
    prefix?: string;
    restoreVisibility?: number;
    facedetection?:
      | "retinaface_resnet50"
      | "retinaface_mobile0.25"
      | "YOLOv5l"
      | "YOLOv5n";
    faceRestore?: "GFPGANv1.4.pth" | "none";
  },
): Record<string, unknown> {
  const width = opts?.width ?? 768;
  const height = opts?.height ?? 768;
  const prefix = opts?.prefix ?? "narcissus_faceswap";
  const restoreVisibility = opts?.restoreVisibility ?? 1;
  const facedetection = opts?.facedetection ?? "retinaface_resnet50";
  const faceRestore = opts?.faceRestore ?? "GFPGANv1.4.pth";

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
        crop: "center",
      },
    },
    "4": {
      class_type: "ImageScale",
      inputs: {
        image: ["2", 0],
        upscale_method: "lanczos",
        width: 512,
        height: 512,
        crop: "center",
      },
    },
    "5": {
      class_type: "ReActorFaceSwap",
      inputs: {
        enabled: true,
        input_image: ["3", 0],
        source_image: ["4", 0],
        swap_model: "inswapper_128.onnx",
        facedetection,
        face_restore_model: faceRestore,
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

/**
 * Clothing removal (Deep Undress–style intent):
 * high denoise img2img with body-type anatomy + ReActor face lock from the upload.
 * No full-frame ImageBlend (that puts clothes back on).
 */
export function buildUndressPrompt(
  imageName: string,
  opts?: {
    seed?: number;
    promptOverride?: string;
    identity?: number;
    denoise?: number;
    width?: number;
    height?: number;
    bodyType?: BodyTypeId;
    cockState?: CockStateId;
    cockSize?: CockSizeId;
    checkpoint?: string;
    /** When false, skip ReActor (avoids black frames if face was lost). */
    faceLock?: boolean;
  },
): Record<string, unknown> {
  const body = getBodyType(opts?.bodyType);
  const anatomy = anatomyPromptFor(
    body.id,
    opts?.cockState,
    opts?.cockSize,
  );
  const seed = opts?.seed ?? Math.floor(Math.random() * 2 ** 32);
  const identity = opts?.identity ?? 0.85;
  const denoise = opts?.denoise ?? denoiseForIdentity("undress", identity);
  const width = opts?.width ?? 768;
  const height = opts?.height ?? 768;
  const ckpt = opts?.checkpoint?.trim() || CKPT_SD15;
  const faceLock = opts?.faceLock !== false;
  const stamp = Date.now().toString(36);

  const positive = [
    opts?.promptOverride?.trim() || DEFAULT_PROMPTS.undress,
    anatomy.positive,
    "completely remove all clothing and fabric, nude skin only where clothes were",
    "maintain identical subject placement, camera angle, framing, and perspective",
    "exact same face as the reference photo, identical eyes nose mouth bone structure",
    "exact same hairstyle hair color hair length and hairline as the reference photo",
    "preserve facial identity and hair, photorealistic skin",
  ].join(", ");

  const negative = [
    NEGATIVE,
    anatomy.negative,
    "clothes, clothing, shirt, pants, dress, bra, panties, underwear, fabric, covered, dressed",
    "blank, black image, empty frame",
    "different face, different person, different hairstyle, hair cut, bald, wrong hair color, face morph",
  ].join(", ");

  const graph: Record<string, unknown> = {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: ckpt },
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
      inputs: { text: negative, clip: ["1", 1] },
    },
    "6": {
      class_type: "VAEEncode",
      inputs: { pixels: ["3", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 32,
        cfg: body.needsCock ? 6.5 : 5.5,
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
  };

  if (faceLock) {
    // Stronger identity path: Options + FaceBoost → FaceSwapOpt → RestoreFace
    graph["9"] = {
      class_type: "ReActorOptions",
      inputs: {
        input_faces_order: "large-small",
        input_faces_index: "0",
        detect_gender_input: "no",
        source_faces_order: "large-small",
        source_faces_index: "0",
        detect_gender_source: "no",
        console_log_level: 1,
        restore_swapped_only: true,
      },
    };
    graph["11"] = {
      class_type: "ReActorFaceBoost",
      inputs: {
        enabled: true,
        boost_model: "GFPGANv1.4.pth",
        interpolation: "Bicubic",
        visibility: 1,
        codeformer_weight: 0.4,
        restore_with_main_after: true,
      },
    };
    graph["12"] = {
      class_type: "ReActorFaceSwapOpt",
      inputs: {
        enabled: true,
        input_image: ["8", 0],
        source_image: ["3", 0],
        swap_model: "inswapper_128.onnx",
        facedetection: "retinaface_resnet50",
        face_restore_model: "GFPGANv1.4.pth",
        face_restore_visibility: 1,
        codeformer_weight: 0.4,
        options: ["9", 0],
        face_boost: ["11", 0],
      },
    };
    graph["13"] = {
      class_type: "ReActorRestoreFace",
      inputs: {
        image: ["12", 0],
        facedetection: "retinaface_resnet50",
        model: "GFPGANv1.4.pth",
        visibility: 0.9,
        codeformer_weight: 0.35,
      },
    };
    graph["15"] = {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: `narcissus_undress_${body.id}_${stamp}`,
        images: ["13", 0],
      },
    };
  } else {
    graph["10"] = {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: `narcissus_undress_${body.id}_${stamp}`,
        images: ["8", 0],
      },
    };
  }

  return graph;
}

/**
 * Scene / act / outfit templates: strong img2img + optional ReActor face lock.
 * No full-frame ImageBlend (that pulled the upload back and cancelled the edit).
 */
export function buildScenePrompt(
  imageName: string,
  opts?: {
    seed?: number;
    promptOverride?: string;
    identity?: number;
    denoise?: number;
    width?: number;
    height?: number;
    prefix?: string;
    checkpoint?: string;
    /** ReActor face lock from the upload. Skip for face-effect templates (facial). */
    faceLock?: boolean;
  },
): Record<string, unknown> {
  const seed = opts?.seed ?? Math.floor(Math.random() * 2 ** 32);
  const identity = opts?.identity ?? 0.9;
  const denoise =
    opts?.denoise ?? sceneDenoise(0.42, identity);
  const width = opts?.width ?? 768;
  const height = opts?.height ?? 768;
  const ckpt = opts?.checkpoint?.trim() || CKPT_SD15;
  const faceLock = opts?.faceLock !== false;
  const prefix = opts?.prefix ?? "narcissus_scene";
  const stamp = Date.now().toString(36);

  const positive = [
    opts?.promptOverride?.trim() || DEFAULT_PROMPTS.scene,
    "major visible change from the reference photo required",
    "do not leave clothing pose or framing unchanged",
    "exact same face as the reference photo, identical eyes nose mouth bone structure",
    "exact same hairstyle hair color and hairline as the reference",
    "photorealistic skin, sharp detail",
  ].join(", ");

  const negative = [
    NEGATIVE,
    "identical to input, unchanged photo, passthrough, no change",
    "blank, black image, empty frame",
    "different face, different person, different hairstyle, wrong hair color",
  ].join(", ");

  const graph: Record<string, unknown> = {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: ckpt },
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
      inputs: { text: negative, clip: ["1", 1] },
    },
    "6": {
      class_type: "VAEEncode",
      inputs: { pixels: ["3", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 36,
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
  };

  if (faceLock) {
    graph["9"] = {
      class_type: "ReActorOptions",
      inputs: {
        input_faces_order: "large-small",
        input_faces_index: "0",
        detect_gender_input: "no",
        source_faces_order: "large-small",
        source_faces_index: "0",
        detect_gender_source: "no",
        console_log_level: 1,
        restore_swapped_only: true,
      },
    };
    graph["11"] = {
      class_type: "ReActorFaceBoost",
      inputs: {
        enabled: true,
        boost_model: "GFPGANv1.4.pth",
        interpolation: "Bicubic",
        visibility: 1,
        codeformer_weight: 0.4,
        restore_with_main_after: true,
      },
    };
    graph["12"] = {
      class_type: "ReActorFaceSwapOpt",
      inputs: {
        enabled: true,
        input_image: ["8", 0],
        source_image: ["3", 0],
        swap_model: "inswapper_128.onnx",
        facedetection: "retinaface_resnet50",
        face_restore_model: "GFPGANv1.4.pth",
        face_restore_visibility: 1,
        codeformer_weight: 0.4,
        options: ["9", 0],
        face_boost: ["11", 0],
      },
    };
    graph["15"] = {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: `${prefix}_${stamp}`,
        images: ["12", 0],
      },
    };
  } else {
    graph["10"] = {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: `${prefix}_${stamp}`,
        images: ["8", 0],
      },
    };
  }

  return graph;
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
    bodyType?: BodyTypeId;
    checkpoint?: string;
    faceLock?: boolean;
  },
): Record<string, unknown> {
  if (mode === "undress") {
    return buildUndressPrompt(imageName, opts);
  }
  if (mode === "scene") {
    return buildScenePrompt(imageName, opts);
  }

  const seed = opts?.seed ?? Math.floor(Math.random() * 2 ** 32);
  const positive =
    `${opts?.promptOverride?.trim() || DEFAULT_PROMPTS[mode]}, exact same face as reference photo, preserve identity`;
  const denoise =
    opts?.denoise ?? denoiseForIdentity(mode, opts?.identity ?? 0.85);
  const width = opts?.width ?? 768;
  const height = opts?.height ?? 768;
  const prefix = opts?.prefix ?? `narcissus_${mode}`;
  const ckpt = opts?.checkpoint?.trim() || CKPT_SD15;
  // Soft blend only for freeform custom — keep it light so edits stay visible.
  const blend = Math.min(
    0.28,
    Math.max(0.08, (opts?.identity ?? 0.85) * 0.22),
  );

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: ckpt },
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
    "9": {
      class_type: "ImageBlend",
      inputs: {
        image1: ["8", 0],
        image2: ["3", 0],
        blend_factor: blend,
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
  /** Realism ckpt for templates that img2img a still before SVD. */
  checkpoint?: string;
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
  const motion = tpl.motion ?? 90;
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
    checkpoint: opts?.checkpoint,
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
