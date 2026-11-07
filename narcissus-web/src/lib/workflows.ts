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
/**
 * NA-75 InstantID is SDXL-only. Prefer RealVisXL when present on the volume.
 * Falls back to SD1.5 realism + FaceID Plus V2 / ReActor if missing.
 */
export const INSTANTID_CKPTS = [
  "RealVisXL_V4.0.safetensors",
  "juggernautXL_v9Rdphoto2Lightning.safetensors",
];
export const FACEID_SD15_CKPTS = [
  "epicrealism_naturalSinRC1VAE.safetensors",
  "dreamshaper_8.safetensors",
  CKPT_SD15,
];

export type IdentityEngine = "instantid" | "faceid" | "reactor";

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
  // Undress: body can change; ReActor (+ light head-lock) restores identity.
  // GFPGAN after-swap was the likeness killer — keep denoise high enough to
  // strip clothes; ReActor with an upper-face source recovers identity.
  const base =
    mode === "faceswap"
      ? 0.28
      : mode === "undress"
        ? 0.48
        : mode === "scene"
          ? 0.4
          : 0.3;
  const clamped = Math.min(1, Math.max(0.35, identity));
  const factor = 1.35 - clamped; // 0.35..1.0
  if (mode === "undress") {
    // InstantID+SDXL needs a higher floor to actually strip clothes.
    return Math.max(0.48, Math.min(0.64, base * (1.05 + factor * 0.12)));
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
 * Upper-body face crop → square for ReActor. Wider/taller so off-center faces
 * still land in the crop. InstantID identity uses the full frame (node 3).
 */
function wireUpperFaceCrop(
  graph: Record<string, unknown>,
  width: number,
  height: number,
  outSize = 640,
) {
  const faceX = Math.round(width * 0.08);
  const faceY = Math.round(height * 0.0);
  const faceW = Math.round(width * 0.84);
  const faceH = Math.round(height * 0.7);
  graph["16"] = {
    class_type: "ImageCrop",
    inputs: {
      image: ["3", 0],
      width: faceW,
      height: faceH,
      x: faceX,
      y: faceY,
    },
  };
  graph["17"] = {
    class_type: "ImageScale",
    inputs: {
      image: ["16", 0],
      upscale_method: "lanczos",
      width: outSize,
      height: outSize,
      crop: "disabled",
    },
  };
}

/** ReActor polish: raw inswapper, no GFPGAN (NA-73). */
function wireReactorPolish(
  graph: Record<string, unknown>,
  inputImage: [string, number],
  sourceImage: [string, number],
  savePrefix: string,
) {
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
  graph["12"] = {
    class_type: "ReActorFaceSwapOpt",
    inputs: {
      enabled: true,
      input_image: inputImage,
      source_image: sourceImage,
      swap_model: "inswapper_128.onnx",
      facedetection: "retinaface_resnet50",
      face_restore_model: "none",
      face_restore_visibility: 0.35,
      codeformer_weight: 0.0,
      options: ["9", 0],
    },
  };
  graph["15"] = {
    class_type: "SaveImage",
    inputs: {
      filename_prefix: savePrefix,
      images: ["12", 0],
    },
  };
}

/**
 * NA-75 InstantID conditioning (SDXL). Mutates graph: adds InstantID loaders +
 * ApplyInstantIDAdvanced. Returns { model, positive, negative } node refs for
 * KSampler. Requires RealVisXL (or other SDXL) checkpoint already on node "1".
 *
 * Undress must NOT keypoint-lock the full clothed frame (`image_kps` = body):
 * that freezes fabric silhouettes so clothes stay on (NA-79) and blocks cock
 * anatomy (NA-78). Soft ControlNet + early end_at keeps InstantID face while
 * the body can go nude.
 *
 * NA-81: InstantID `image` MUST be the full frame. Feeding the upper-face crop
 * caused `Reference Image: No face detected.` on off-center photos.
 */
function wireInstantId(
  graph: Record<string, unknown>,
  identity: number,
  opts?: { undressBody?: boolean },
): { model: [string, number]; positive: [string, number]; negative: [string, number] } {
  const id = Math.min(1, Math.max(0.35, identity));
  const undress = opts?.undressBody === true;
  // Face IP stays strong; body ControlNet nearly off on undress so fabric can go.
  const ipWeight = undress ? 0.7 + id * 0.18 : 0.75 + id * 0.25;
  const cnStrength = undress ? 0.12 + id * 0.06 : 0.45 + id * 0.1;
  graph["30"] = {
    class_type: "InstantIDModelLoader",
    inputs: { instantid_file: "ip-adapter.bin" },
  };
  graph["31"] = {
    class_type: "InstantIDFaceAnalysis",
    inputs: { provider: "CUDA" },
  };
  graph["32"] = {
    class_type: "ControlNetLoader",
    inputs: { control_net_name: "instantid-controlnet.safetensors" },
  };
  graph["33"] = {
    class_type: "ApplyInstantIDAdvanced",
    inputs: {
      instantid: ["30", 0],
      insightface: ["31", 0],
      control_net: ["32", 0],
      // Full frame for identity — crop caused No face detected (NA-81).
      image: ["3", 0],
      model: ["1", 0],
      positive: ["4", 0],
      negative: ["5", 0],
      ip_weight: ipWeight,
      cn_strength: cnStrength,
      start_at: 0.0,
      // End ControlNet early on undress so mid/late steps can erase clothes.
      end_at: undress ? 0.55 : 0.85,
      noise: undress ? 0.5 : 0.4,
      combine_embeds: "average",
      // Soft pose hint on undress (weak CN); full frame always for kps safety.
      image_kps: ["3", 0],
    },
  };
  return {
    model: ["33", 0],
    positive: ["33", 1],
    negative: ["33", 2],
  };
}

/** NA-75 FaceID Plus V2 on SD1.5 (epicrealism). Returns conditioned MODEL ref. */
function wireFaceIdPlus(
  graph: Record<string, unknown>,
  identity: number,
): [string, number] {
  const id = Math.min(1, Math.max(0.35, identity));
  graph["20"] = {
    class_type: "IPAdapterUnifiedLoaderFaceID",
    inputs: {
      model: ["1", 0],
      preset: "FACEID PLUS V2",
      lora_strength: 0.7 + id * 0.15,
      provider: "CUDA",
    },
  };
  graph["21"] = {
    class_type: "IPAdapterFaceID",
    inputs: {
      model: ["20", 0],
      ipadapter: ["20", 1],
      image: ["17", 0],
      weight: 0.85 + id * 0.25,
      weight_faceidv2: 1.1 + id * 0.4,
      weight_type: "linear",
      combine_embeds: "concat",
      start_at: 0.0,
      end_at: 0.9,
      embeds_scaling: "V only",
    },
  };
  return ["21", 0];
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
  // Prefer raw swap identity; heavy GFPGAN was washing faces into generics (NA-73).
  const restoreVisibility = opts?.restoreVisibility ?? 0.45;
  const facedetection = opts?.facedetection ?? "retinaface_resnet50";
  const faceRestore = opts?.faceRestore ?? "none";

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
    /**
     * NA-75 identity engine. Default `instantid` (SDXL RealVis + InstantID +
     * ReActor polish). `faceid` = SD1.5 FaceID Plus V2 + ReActor. `reactor` =
     * legacy ReActor-only after img2img.
     *
     * NA-78: `needsCock` bodies always force FaceID + epicrealism — RealVisXL
     * InstantID soft-censors penises even with explicit prompts.
     */
    identityEngine?: IdentityEngine;
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
  const needsCock = body.needsCock;
  // Cock undress: RealVisXL InstantID will strip clothes but keep a vagina /
  // Barbie crotch. Route to NSFW SD1.5 epicrealism + FaceID instead.
  let engine: IdentityEngine = opts?.identityEngine ?? "instantid";
  if (needsCock && engine === "instantid") {
    engine = "faceid";
  }
  const useInstantId = engine === "instantid";
  const useFaceId = engine === "faceid";
  // InstantID prefers non-1024 square (watermark avoidance in training data).
  const width = opts?.width ?? (useInstantId ? 1016 : 768);
  const height = opts?.height ?? (useInstantId ? 1016 : 768);
  // NA-79: InstantID undress needs high denoise once clothing silhouette lock
  // is off; clothes-on failures were denoise ~0.55–0.61 fighting ControlNet.
  const denoise =
    opts?.denoise ??
    (useInstantId
      ? Math.max(0.7, Math.min(0.8, denoiseForIdentity("undress", identity) + 0.22))
      : needsCock
        ? Math.max(0.6, Math.min(0.72, denoiseForIdentity("undress", identity) + 0.16))
        : Math.max(0.55, Math.min(0.68, denoiseForIdentity("undress", identity) + 0.1)));
  const ckpt =
    opts?.checkpoint?.trim() ||
    (useInstantId
      ? INSTANTID_CKPTS[0]!
      : needsCock || useFaceId
        ? FACEID_SD15_CKPTS[0]!
        : CKPT_SD15);
  const faceLock = opts?.faceLock !== false;
  const stamp = Date.now().toString(36);
  const savePrefix = `narcissus_undress_${body.id}_${stamp}`;

  // Strip clothes first in the prompt (NA-79); cock anatomy front-loaded (NA-78).
  const stripClothes =
    "completely naked, fully nude, all clothing removed, no fabric, no shirt, no pants, no dress, no bra, no panties, bare skin only";
  const positive = [
    stripClothes,
    needsCock ? anatomy.positive : "",
    needsCock
      ? "mandatory visible penis and testicles in the crotch, cock fully rendered, not smoothed flat, not censored, not hidden"
      : "",
    opts?.promptOverride?.trim() || DEFAULT_PROMPTS.undress,
    needsCock ? "" : anatomy.positive,
    "nude skin only where clothes were, clothing fully erased",
    "maintain identical subject placement, camera angle, framing, and perspective",
    "exact same face as the reference photo, identical eyes nose mouth bone structure",
    "exact same hairstyle hair color hair length and hairline as the reference photo",
    "preserve facial identity and hair, photorealistic skin",
    needsCock ? anatomy.positive : "",
  ]
    .filter(Boolean)
    .join(", ");

  const negative = [
    NEGATIVE,
    anatomy.negative,
    "clothes, clothing, shirt, pants, dress, bra, panties, underwear, lingerie, pantyhose, stockings, fabric, covered, dressed, clothed, outfit, garment, textile, leotard, swimsuit, singlet",
    "blank, black image, empty frame",
    "different face, different person, different hairstyle, hair cut, bald, wrong hair color, face morph",
    needsCock
      ? "smooth Barbie crotch, featureless groin, no genitals, censored, mosaic, covered crotch, vagina only, closed legs hiding penis"
      : "",
    useInstantId ? "watermark, text, logo" : "",
  ]
    .filter(Boolean)
    .join(", ");

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
  };

  // Face crop always when identity conditioning is on (InstantID / FaceID / ReActor).
  if (faceLock || useInstantId || useFaceId) {
    wireUpperFaceCrop(graph, width, height, useInstantId ? 640 : 512);
  }

  let modelRef: [string, number] = ["1", 0];
  let posRef: [string, number] = ["4", 0];
  let negRef: [string, number] = ["5", 0];
  let cfg = needsCock ? 7.0 : 5.5;
  let steps = needsCock ? 36 : 32;

  if (faceLock && useInstantId) {
    // All InstantID undress: face-crop kps so clothing silhouette isn't locked.
    const iid = wireInstantId(graph, identity, { undressBody: true });
    modelRef = iid.model;
    posRef = iid.positive;
    negRef = iid.negative;
    cfg = 3.8;
    steps = 32;
  } else if (faceLock && useFaceId) {
    modelRef = wireFaceIdPlus(graph, identity);
    cfg = needsCock ? 7.0 : 5.5;
  }

  graph["7"] = {
    class_type: "KSampler",
    inputs: {
      seed,
      steps,
      cfg,
      sampler_name: "euler",
      scheduler: "normal",
      denoise,
      model: modelRef,
      positive: posRef,
      negative: negRef,
      latent_image: ["6", 0],
    },
  };
  graph["8"] = {
    class_type: "VAEDecode",
    inputs: { samples: ["7", 0], vae: ["1", 2] },
  };

  // NA-79: clothing strip refine on the *base* checkpoint (no InstantID /
  // FaceID). Identity adapters fight fabric erasure; ReActor restores face after.
  let decodeRef: [string, number] = ["8", 0];
  {
    const stripPos = [
      stripClothes,
      anatomy.positive,
      "bare breasts or bare chest, bare crotch, nude skin replacing every garment",
      "same pose framing and face as the previous frame",
    ].join(", ");
    const stripNeg = [
      NEGATIVE,
      anatomy.negative,
      "clothes, clothing, shirt, pants, dress, bra, panties, underwear, fabric, textile, garment, leotard, swimsuit, singlet, covered, dressed",
    ].join(", ");
    graph["34"] = {
      class_type: "CLIPTextEncode",
      inputs: { text: stripPos, clip: ["1", 1] },
    };
    graph["35"] = {
      class_type: "CLIPTextEncode",
      inputs: { text: stripNeg, clip: ["1", 1] },
    };
    graph["36"] = {
      class_type: "VAEEncode",
      inputs: { pixels: ["8", 0], vae: ["1", 2] },
    };
    graph["37"] = {
      class_type: "KSampler",
      inputs: {
        seed: (seed + 7) >>> 0,
        steps: 22,
        cfg: useInstantId ? 5.0 : 6.5,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: useInstantId ? 0.55 : 0.48,
        // Raw ckpt — InstantID/FaceID MODEL fights clothing removal.
        model: ["1", 0],
        positive: ["34", 0],
        negative: ["35", 0],
        latent_image: ["36", 0],
      },
    };
    graph["38"] = {
      class_type: "VAEDecode",
      inputs: { samples: ["37", 0], vae: ["1", 2] },
    };
    decodeRef = ["38", 0];
  }

  // NA-78: anatomy refine — base model only, high denoise so a cock can appear
  // where FaceID/img2img left a vagina. Face restored by ReActor afterward.
  if (needsCock) {
    const cockPos = [
      stripClothes,
      anatomy.positive,
      "replace the crotch with a clearly visible penis and testicles, photo-real cock shaft and glans, scrotum hanging, no vagina",
      "same face body pose and framing as the previous frame",
    ].join(", ");
    const cockNeg = [
      NEGATIVE,
      anatomy.negative,
      "clothes, fabric, Barbie crotch, vagina, vulva, pussy, no penis, missing penis, censored, mosaic",
    ].join(", ");
    graph["40"] = {
      class_type: "CLIPTextEncode",
      inputs: { text: cockPos, clip: ["1", 1] },
    };
    graph["41"] = {
      class_type: "CLIPTextEncode",
      inputs: { text: cockNeg, clip: ["1", 1] },
    };
    graph["42"] = {
      class_type: "VAEEncode",
      inputs: { pixels: decodeRef, vae: ["1", 2] },
    };
    graph["43"] = {
      class_type: "KSampler",
      inputs: {
        seed: (seed + 17) >>> 0,
        steps: 28,
        cfg: 8.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 0.58,
        model: ["1", 0],
        positive: ["40", 0],
        negative: ["41", 0],
        latent_image: ["42", 0],
      },
    };
    graph["44"] = {
      class_type: "VAEDecode",
      inputs: { samples: ["43", 0], vae: ["1", 2] },
    };
    decodeRef = ["44", 0];
  }

  if (faceLock) {
    // InstantID/FaceID condition generation; ReActor polish locks likeness
    // without GFPGAN wash (smoke: InstantID+ReActor ~0.91 cosine, no paste).
    wireReactorPolish(graph, decodeRef, ["17", 0], savePrefix);
  } else {
    graph["10"] = {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: savePrefix,
        images: decodeRef,
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
    identityEngine?: IdentityEngine;
  },
): Record<string, unknown> {
  const seed = opts?.seed ?? Math.floor(Math.random() * 2 ** 32);
  const identity = opts?.identity ?? 0.9;
  const engine: IdentityEngine = opts?.identityEngine ?? "instantid";
  const useInstantId = engine === "instantid";
  const useFaceId = engine === "faceid";
  const denoise = opts?.denoise ?? sceneDenoise(0.42, identity);
  const width = opts?.width ?? (useInstantId ? 1016 : 768);
  const height = opts?.height ?? (useInstantId ? 1016 : 768);
  const ckpt =
    opts?.checkpoint?.trim() ||
    (useInstantId ? INSTANTID_CKPTS[0]! : CKPT_SD15);
  const faceLock = opts?.faceLock !== false;
  const prefix = opts?.prefix ?? "narcissus_scene";
  const stamp = Date.now().toString(36);
  const savePrefix = `${prefix}_${stamp}`;

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
    useInstantId ? "watermark, text, logo" : "",
  ]
    .filter(Boolean)
    .join(", ");

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
  };

  if (faceLock || useInstantId || useFaceId) {
    wireUpperFaceCrop(graph, width, height, useInstantId ? 640 : 512);
  }

  let modelRef: [string, number] = ["1", 0];
  let posRef: [string, number] = ["4", 0];
  let negRef: [string, number] = ["5", 0];
  let cfg = 7;
  let steps = 36;

  if (faceLock && useInstantId) {
    const iid = wireInstantId(graph, identity);
    modelRef = iid.model;
    posRef = iid.positive;
    negRef = iid.negative;
    cfg = 3.5;
    steps = 30;
  } else if (faceLock && useFaceId) {
    modelRef = wireFaceIdPlus(graph, identity);
    cfg = 5.5;
  }

  graph["7"] = {
    class_type: "KSampler",
    inputs: {
      seed,
      steps,
      cfg,
      sampler_name: "euler",
      scheduler: "normal",
      denoise,
      model: modelRef,
      positive: posRef,
      negative: negRef,
      latent_image: ["6", 0],
    },
  };
  graph["8"] = {
    class_type: "VAEDecode",
    inputs: { samples: ["7", 0], vae: ["1", 2] },
  };

  if (faceLock) {
    wireReactorPolish(graph, ["8", 0], ["17", 0], savePrefix);
  } else {
    graph["10"] = {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: savePrefix,
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
