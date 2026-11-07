import { NextRequest, NextResponse } from "next/server";
import {
  getBodyType,
  getCockSize,
  getCockState,
  isBodyTypeId,
  isCockSizeId,
  isCockStateId,
  type BodyTypeId,
  type CockSizeId,
  type CockStateId,
} from "@/lib/bodyTypes";
import {
  fetchImageBytes,
  isComfyConfigured,
  isNearlyBlankImageAsync,
  resolveCheckpoint,
  runPromptToImages,
  uploadImage,
} from "@/lib/comfy";
import { lockHeadAndHair } from "@/lib/identityLock";
import { localResultUrl, saveLocalResult } from "@/lib/localResults";
import {
  getPhotoTemplate,
  getSayVoice,
  getVideoTemplate,
  isPhotoTemplateId,
  isSayVoiceId,
  isVideoTemplateId,
  type PhotoTemplateId,
  type VideoTemplateId,
} from "@/lib/templates";
import {
  buildFaceSwapPrompt,
  buildImg2ImgPrompt,
  buildScenePrompt,
  buildUndressPrompt,
  buildVideoPrompt,
  denoiseForIdentity,
  FACEID_SD15_CKPTS,
  INSTANTID_CKPTS,
  sceneDenoise,
  type IdentityEngine,
  type JobMode,
} from "@/lib/workflows";

export const runtime = "nodejs";
// Vercel plan caps: keep ≤60s for deployability. Long Comfy jobs need a
// dedicated worker / higher plan — Studio UI still ships.
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const MODES: JobMode[] = ["faceswap", "undress", "custom", "scene", "video"];

/** Prefer NSFW realism when present on the Comfy pod (still + video still-pass). */
const REALISM_CKPTS = [
  "epicrealism_naturalSinRC1VAE.safetensors",
  "realisticVisionV60B1_v51VAE.safetensors",
  "dreamshaper_8.safetensors",
  "v1-5-pruned-emaonly-fp16.safetensors",
];

/** NA-75: InstantID needs SDXL; FaceID Plus V2 stays on SD1.5 realism. */
const IDENTITY_SDXL_CKPTS = [...INSTANTID_CKPTS];
const IDENTITY_SD15_CKPTS = [...FACEID_SD15_CKPTS];

function asUploadFile(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = asUploadFile(form.get("photo"));
  const faceFile = asUploadFile(form.get("face"));
  const mode = String(form.get("mode") || "") as JobMode;
  const adultsConfirmed = form.get("adultsConfirmed") === "true";
  const promptOverride = String(form.get("prompt") || "").trim() || undefined;
  const speech = String(form.get("speech") || "").trim() || undefined;
  const templateRaw = String(form.get("template") || "");
  const voiceRaw = String(form.get("voice") || "en-US-JennyNeural");
  const voice = isSayVoiceId(voiceRaw)
    ? voiceRaw
    : "en-US-JennyNeural";
  const bodyTypeRaw = String(form.get("bodyType") || "female");
  const bodyType: BodyTypeId = isBodyTypeId(bodyTypeRaw)
    ? bodyTypeRaw
    : "female";
  const cockStateRaw = String(form.get("cockState") || "hard");
  const cockState: CockStateId = isCockStateId(cockStateRaw)
    ? cockStateRaw
    : "hard";
  const cockSizeRaw = String(form.get("cockSize") || "average");
  const cockSize: CockSizeId = isCockSizeId(cockSizeRaw)
    ? cockSizeRaw
    : "average";
  const identity = Math.min(
    1,
    Math.max(0.35, Number(form.get("identity") || 0.9) || 0.9),
  );

  if (!adultsConfirmed) {
    return NextResponse.json(
      { error: "Adult confirmation required." },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      {
        error:
          mode === "faceswap"
            ? "Source photo required (body/scene to receive the face)."
            : "Photo required.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo too large (max 12MB)." },
      { status: 400 },
    );
  }

  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  if (mode === "faceswap" && !faceFile) {
    return NextResponse.json(
      {
        error:
          "Face photo required — the face you want swapped onto the source.",
      },
      { status: 400 },
    );
  }

  if (faceFile && faceFile.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Face photo too large (max 12MB)." },
      { status: 400 },
    );
  }

  if (mode === "custom" && !promptOverride) {
    return NextResponse.json(
      { error: "Custom mode needs a prompt describing the photo." },
      { status: 400 },
    );
  }

  const photoTemplateId: PhotoTemplateId = isPhotoTemplateId(templateRaw)
    ? templateRaw
    : "blowjob";
  const videoTemplateId: VideoTemplateId = isVideoTemplateId(templateRaw)
    ? templateRaw
    : "natural";
  const sceneTpl = mode === "scene" ? getPhotoTemplate(photoTemplateId) : null;
  const tpl = mode === "video" ? getVideoTemplate(videoTemplateId) : null;
  if (mode === "video" && tpl?.needsSpeech && !speech) {
    return NextResponse.json(
      { error: "Say template needs the line you want spoken." },
      { status: 400 },
    );
  }

  if (!isComfyConfigured()) {
    return NextResponse.json(
      {
        error:
          "COMFYUI_BASE_URL is not set. Point it at the Runpod ComfyUI proxy.",
      },
      { status: 503 },
    );
  }

  try {
    const originalBytes = new Uint8Array(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\-]+/g, "_") || "upload.png";
    const uploaded = await uploadImage(
      new Blob([Buffer.from(originalBytes)], { type: file.type || "image/jpeg" }),
      safeName,
    );

    let faceUploadedName: string | null = null;
    if (mode === "faceswap" && faceFile) {
      const faceSafe =
        faceFile.name.replace(/[^\w.\-]+/g, "_") || "face.png";
      const faceUploaded = await uploadImage(faceFile, `face_${faceSafe}`);
      faceUploadedName = faceUploaded.filename;
    }

    // NA-75: prefer InstantID (SDXL RealVis) for undress/scene identity.
    const sdxlCkpt = await resolveCheckpoint(
      IDENTITY_SDXL_CKPTS,
      "__missing_sdxl__",
    );
    const hasSdxl = sdxlCkpt !== "__missing_sdxl__";
    const sd15Ckpt = await resolveCheckpoint(
      IDENTITY_SD15_CKPTS,
      "v1-5-pruned-emaonly-fp16.safetensors",
    );
    const identityEngine: IdentityEngine = hasSdxl ? "instantid" : "faceid";
    const identityCkpt = hasSdxl ? sdxlCkpt : sd15Ckpt;

    const realismCkpt =
      mode === "faceswap"
        ? null
        : mode === "undress" || mode === "scene"
          ? identityCkpt
          : await resolveCheckpoint(
              REALISM_CKPTS,
              "v1-5-pruned-emaonly-fp16.safetensors",
            );
    const undressCkpt = mode === "undress" ? realismCkpt : null;

    const graph =
      mode === "faceswap" && faceUploadedName
        ? buildFaceSwapPrompt(uploaded.filename, faceUploadedName, {
            restoreVisibility: Math.min(1, Math.max(0.5, identity)),
            facedetection: "retinaface_resnet50",
          })
        : mode === "undress"
          ? buildUndressPrompt(uploaded.filename, {
              promptOverride,
              identity: Math.max(identity, 0.88),
              bodyType,
              cockState,
              cockSize,
              checkpoint: undressCkpt || undefined,
              faceLock: true,
              identityEngine,
            })
          : mode === "video"
            ? buildVideoPrompt(uploaded.filename, {
                template: videoTemplateId,
                speech,
                identity,
                seconds: 5,
                fps: 8,
                checkpoint: realismCkpt || undefined,
              })
            : mode === "scene" && sceneTpl
              ? buildScenePrompt(uploaded.filename, {
                  promptOverride: [
                    sceneTpl.stillPrompt,
                    promptOverride,
                  ]
                    .filter(Boolean)
                    .join(", "),
                  identity: Math.max(identity, 0.85),
                  denoise: sceneDenoise(sceneTpl.stillDenoise, identity),
                  // Facial needs the generated face effect — don't ReActor it away.
                  faceLock: sceneTpl.id !== "facial",
                  prefix: `narcissus_scene_${sceneTpl.id}`,
                  checkpoint: realismCkpt || undefined,
                  identityEngine:
                    sceneTpl.id === "facial" ? "reactor" : identityEngine,
                })
              : buildImg2ImgPrompt(mode, uploaded.filename, {
                  promptOverride,
                  identity,
                  denoise: denoiseForIdentity(
                    mode === "custom" ? "custom" : "faceswap",
                    identity,
                  ),
                  checkpoint: realismCkpt || undefined,
                });

    let faceLockFallback = false;
    let result;
    try {
      result = await runPromptToImages(graph, {
        timeoutMs: mode === "video" ? 360_000 : 240_000,
      });
    } catch (err) {
      // NA-81: InstantID hard-fails with "Reference Image: No face detected."
      // when InsightFace misses — previously bubbled as generic job error.
      // Retry undress/scene on FaceID (SD1.5) so Studio stays usable.
      const msg = err instanceof Error ? err.message : String(err);
      const noFace =
        /no face detected/i.test(msg) || /Reference Image/i.test(msg);
      if (
        !noFace ||
        identityEngine !== "instantid" ||
        (mode !== "undress" && mode !== "scene") ||
        (mode === "scene" && sceneTpl?.id === "facial")
      ) {
        throw err;
      }
      faceLockFallback = true;
      if (mode === "undress") {
        result = await runPromptToImages(
          buildUndressPrompt(uploaded.filename, {
            promptOverride,
            identity: Math.max(identity, 0.88),
            bodyType,
            cockState,
            cockSize,
            checkpoint: sd15Ckpt || undefined,
            faceLock: true,
            identityEngine: "faceid",
            denoise: 0.58,
          }),
          { timeoutMs: 240_000 },
        );
      } else {
        result = await runPromptToImages(
          buildScenePrompt(uploaded.filename, {
            promptOverride: [sceneTpl!.stillPrompt, promptOverride]
              .filter(Boolean)
              .join(", "),
            identity: Math.max(identity, 0.85),
            denoise: sceneDenoise(sceneTpl!.stillDenoise, identity),
            faceLock: true,
            prefix: `narcissus_scene_${sceneTpl!.id}`,
            checkpoint: sd15Ckpt || undefined,
            identityEngine: "faceid",
          }),
          { timeoutMs: 240_000 },
        );
      }
    }

    // ReActor can emit a pure-black frame when the undress pass wiped the face
    // (or NSFW filter tripped). Detect and retry InstantID→FaceID→no-lock.
    if (mode === "undress" && result.images[0]) {
      try {
        const bytes = await fetchImageBytes(result.images[0]);
        if (await isNearlyBlankImageAsync(bytes)) {
          faceLockFallback = true;
          const fallbackEngine: IdentityEngine =
            identityEngine === "instantid" ? "faceid" : "reactor";
          result = await runPromptToImages(
            buildUndressPrompt(uploaded.filename, {
              promptOverride,
              identity: Math.max(identity, 0.88),
              bodyType,
              cockState,
              cockSize,
              checkpoint:
                (fallbackEngine === "faceid" ? sd15Ckpt : undressCkpt) ||
                undefined,
              faceLock: fallbackEngine !== "reactor",
              identityEngine: fallbackEngine,
              denoise: 0.58,
            }),
            { timeoutMs: 240_000 },
          );
        }
      } catch {
        // If we can't inspect the image, still return the first result URL.
      }
    }

    // Face swap: blank frame = detector/model miss. Retry with YOLO, then fail loudly.
    if (mode === "faceswap" && faceUploadedName && result.images[0]) {
      let swapBytes = await fetchImageBytes(result.images[0]);
      if (await isNearlyBlankImageAsync(swapBytes)) {
        result = await runPromptToImages(
          buildFaceSwapPrompt(uploaded.filename, faceUploadedName, {
            restoreVisibility: Math.min(1, Math.max(0.5, identity)),
            facedetection: "YOLOv5l",
            faceRestore: "GFPGANv1.4.pth",
          }),
          { timeoutMs: 180_000 },
        );
        swapBytes = await fetchImageBytes(result.images[0]!);
      }
      if (await isNearlyBlankImageAsync(swapBytes)) {
        result = await runPromptToImages(
          buildFaceSwapPrompt(uploaded.filename, faceUploadedName, {
            restoreVisibility: 0.75,
            facedetection: "retinaface_mobile0.25",
            faceRestore: "none",
          }),
          { timeoutMs: 180_000 },
        );
        swapBytes = await fetchImageBytes(result.images[0]!);
      }
      if (await isNearlyBlankImageAsync(swapBytes)) {
        return NextResponse.json(
          {
            error:
              "Face swap came back blank. Use two clear face photos (front-ish, well lit). Also ensure the Comfy pod has onnxruntime + models/insightface/inswapper_128.onnx installed.",
            promptId: result.promptId,
            blank: true,
          },
          { status: 502 },
        );
      }
      const localName = await saveLocalResult(
        `${result.promptId}_faceswap.png`,
        swapBytes,
      );
      result = {
        ...result,
        viewUrls: [localResultUrl(localName)],
      };
    }

    // NA-75: InstantID/FaceID + ReActor already condition identity during
    // generation. Skip oval head-paste for those paths — paste inflates cosine
    // (~0.96) but looks like a sticker; commercial path is generated likeness.
    let resultUrl = result.viewUrls[0] ?? null;
    let identityLocked = false;
    const skipHeadPaste =
      (mode === "scene" && sceneTpl?.id === "facial") ||
      ((mode === "undress" || mode === "scene") &&
        (identityEngine === "instantid" || identityEngine === "faceid"));
    if (
      !skipHeadPaste &&
      (mode === "undress" || mode === "custom" || mode === "scene") &&
      result.images[0] &&
      result.mediaKind === "image"
    ) {
      try {
        const editedBytes = await fetchImageBytes(result.images[0]);
        if (!(await isNearlyBlankImageAsync(editedBytes))) {
          const id = Math.min(1, Math.max(0.35, identity));
          const locked = await lockHeadAndHair(editedBytes, originalBytes, {
            shape: "oval",
            faceCenterY: mode === "undress" ? 0.14 : 0.15,
            faceRx: 0.3 + id * 0.03,
            faceRy:
              mode === "undress" ? 0.24 + id * 0.025 : 0.25 + id * 0.03,
            feather: 0.35,
            globalPull: 0,
          });
          const localName = await saveLocalResult(
            `${result.promptId}_locked.png`,
            locked,
          );
          resultUrl = localResultUrl(localName);
          identityLocked = true;
        }
      } catch {
        // Fall back to Comfy URL if lock fails.
      }
    }

    const bodyMeta = getBodyType(bodyType);
    const bodyLabel = bodyMeta.label;
    const cockNote =
      bodyMeta.needsCock
        ? ` · ${getCockState(cockState).label} ${getCockSize(cockSize).label}`
        : "";

    const sayVoice = getSayVoice(voice);

    return NextResponse.json({
      id: result.promptId,
      status: "completed",
      mode,
      template:
        mode === "video"
          ? videoTemplateId
          : mode === "scene"
            ? photoTemplateId
            : null,
      bodyType: mode === "undress" ? bodyType : null,
      cockState: mode === "undress" && bodyMeta.needsCock ? cockState : null,
      cockSize: mode === "undress" && bodyMeta.needsCock ? cockSize : null,
      speech: speech || null,
      voice: mode === "video" && tpl?.needsSpeech ? voice : null,
      identity,
      identityLocked,
      filename: file.name,
      faceFilename: faceFile?.name ?? null,
      bytes: file.size,
      prompt: promptOverride || sceneTpl?.stillPrompt || null,
      checkpoint: realismCkpt,
      faceLockFallback,
      message:
        mode === "faceswap"
          ? "Face swap finished — donor face applied onto the source photo."
          : mode === "undress"
            ? faceLockFallback
              ? `Clothing removed with ${bodyLabel}${cockNote} anatomy (face-lock skipped — previous frame was blank).`
              : `Clothing removed with ${bodyLabel}${cockNote}. Original face & hair locked onto the body.`
            : mode === "scene"
              ? identityLocked
                ? `${sceneTpl?.label || "Scene"} ready — original face & hair locked.`
                : `${sceneTpl?.label || "Scene"} photo finished.`
              : mode === "video"
                ? tpl?.id === "say"
                  ? `5s talking clip ready (${sayVoice.label}). Line queued: “${speech}”. Full lip-sync TTS hooks in next.`
                  : `5s ${tpl?.label || "video"} template ready.`
                : identityLocked
                  ? "Photo edit done — original face & hair preserved on top of the edit."
                  : "Photo job finished with high identity lock.",
      comfyConfigured: true,
      promptId: result.promptId,
      mediaKind: result.mediaKind,
      images: result.images,
      resultUrl,
      resultUrls: resultUrl ? [resultUrl] : result.viewUrls,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ComfyUI job failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "narcissus-jobs",
    modes: MODES,
    faceswap: {
      requires: ["photo", "face"],
      engine: "ReActorFaceSwap + inswapper_128 + GFPGAN",
    },
    undress: {
      bodyTypes: ["female", "male", "tranny", "cross_dresser"],
      cockStates: ["hard", "soft"],
      cockSizes: ["small", "average", "large", "huge"],
      engine: "img2img undress + cock options + ReActor face/hair boost",
    },
    photoTemplates: [
      "blowjob",
      "double_blowjob",
      "cumshot",
      "facial",
      "lingerie",
      "bikini",
      "lbd",
      "wet_silk",
    ],
    videoTemplates: ["natural", "blowjob", "say"],
    sayVoices: [
      "en-US-JennyNeural",
      "en-US-AriaNeural",
      "en-US-SaraNeural",
      "en-GB-SoniaNeural",
      "en-US-GuyNeural",
      "en-US-DavisNeural",
    ],
    comfyConfigured: isComfyConfigured(),
    engine: "comfyui-reactor+undress-bodytypes+svd+scenes",
  });
}
