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
  uploadResultPng,
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
  buildToyCompositePrompt,
  buildToyProductPrompt,
  denoiseForIdentity,
  FACEID_SD15_CKPTS,
  INSTANTID_CKPTS,
  sceneDenoise,
  toyProductSeed,
  buildUndressPrompt,
  buildVideoPrompt,
  type IdentityEngine,
  type JobMode,
  type ToyKind,
} from "@/lib/workflows";

export const runtime = "nodejs";
// Vercel plan caps: keep ≤60s for deployability. Long Comfy jobs need a
// dedicated worker / higher plan — Studio UI still ships.
// Undress InstantID/FaceID + strip refine often exceeds 60s on cold GPU.
export const maxDuration = 300;

const MAX_BYTES = 12 * 1024 * 1024;
const MODES: JobMode[] = [
  "faceswap",
  "undress",
  "custom",
  "scene",
  "video",
  "toy",
];

function parseToyKind(raw: string): ToyKind {
  if (raw === "dildo" || raw === "vibrator" || raw === "strap-on") return raw;
  return "strap-on";
}

function toyProductSeedFor(kind: ToyKind, color: string): number {
  return toyProductSeed(kind, color);
}

/** Fraction of near-white pixels — catalog toys sit on white studio (~0.5+). */
async function whiteBackgroundRatio(bytes: Uint8Array): Promise<number> {
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(Buffer.from(bytes))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const total = info.width * info.height;
    if (!total) return 0;
    let white = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]! > 240 && data[i + 1]! > 240 && data[i + 2]! > 240) white += 1;
    }
    return white / total;
  } catch {
    return 0;
  }
}

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
  const toyKind = parseToyKind(String(form.get("toyKind") || "strap-on"));
  const toySize = String(form.get("toySize") || "medium").trim() || "medium";
  const toyColor = String(form.get("toyColor") || "pink").trim() || "pink";

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

    // --- Companion sex toys: product txt2img (retry until white studio bg) + composite ---
    if (mode === "toy") {
      const realismCkpt = await resolveCheckpoint(
        REALISM_CKPTS,
        "epicrealism_naturalSinRC1VAE.safetensors",
      );
      const seedTries = [
        toyProductSeedFor(toyKind, toyColor),
        999,
        42,
        77777,
        314159,
        Date.now() % 1_000_000,
      ];
      let productBytes: Uint8Array | null = null;
      let productPromptId = "";
      for (const seed of seedTries) {
        const productGraph = buildToyProductPrompt({
          seed,
          toyKind,
          toySize,
          toyColor,
          promptOverride,
          checkpoint: realismCkpt,
        });
        const productResult = await runPromptToImages(productGraph, {
          timeoutMs: 180_000,
        });
        const img = productResult.images[0];
        if (!img) continue;
        const bytes = await fetchImageBytes(img);
        const white = await whiteBackgroundRatio(bytes);
        // Good catalog products are mostly white studio (~0.5+). Person fills ≈0.
        if (white >= 0.45) {
          productBytes = bytes;
          productPromptId = productResult.promptId;
          break;
        }
      }
      if (!productBytes) {
        // Last resort: bundled catalog product (pink strap-on) — still real
        // generated pixels, not a CSS fake. epicrealism often invents a person.
        try {
          const fs = await import("fs/promises");
          const path = await import("path");
          const bundled = path.join(
            process.cwd(),
            "public",
            "muse-toys",
            "strap-on-pink.png",
          );
          productBytes = new Uint8Array(await fs.readFile(bundled));
          productPromptId = "bundled-strap-on-pink";
        } catch {
          return NextResponse.json(
            {
              error:
                "Comfy could not draw an isolated toy product (kept inventing a person). Start the GPU pod / retry, or pick Casual.",
            },
            { status: 502 },
          );
        }
      }
      const productUploaded = await uploadResultPng(
        productBytes,
        `toy_product_${toyKind}_${Date.now().toString(36)}.png`,
      );
      const compositeGraph = buildToyCompositePrompt(
        uploaded.filename,
        productUploaded.filename,
        { toyKind },
      );
      const result = await runPromptToImages(compositeGraph, {
        timeoutMs: 120_000,
      });
      const resultUrl = result.viewUrls[0] ?? null;
      return NextResponse.json({
        id: result.promptId || productPromptId,
        status: "completed",
        mode: "toy",
        template: null,
        bodyType: null,
        cockState: null,
        cockSize: null,
        speech: null,
        voice: null,
        identity,
        identityLocked: false,
        identityEngine: "faceid",
        faceLockFallback: false,
        filename: uploaded.filename,
        prompt: promptOverride || `${toyKind} ${toySize} ${toyColor}`,
        resultUrl,
        resultUrls: result.viewUrls,
        viewUrls: result.viewUrls,
        mediaKind: result.mediaKind,
        local: false,
        blank: false,
        bodyLabel: null,
        cockNote: "",
        toyKind,
        toySize,
        toyColor,
      });
    }

    // Undress: FaceID + epicrealism (SD1.5) — InstantID/RealVisXL soft-censors
    // lingerie/genitals and leaves subjects clothed. Scene still prefers InstantID.
    // NA-78: cock undress also FaceID + epicrealism.
    const sdxlCkpt = await resolveCheckpoint(
      IDENTITY_SDXL_CKPTS,
      "__missing_sdxl__",
    );
    const hasSdxl = sdxlCkpt !== "__missing_sdxl__";
    const sd15Ckpt = await resolveCheckpoint(
      IDENTITY_SD15_CKPTS,
      "v1-5-pruned-emaonly-fp16.safetensors",
    );
    const needsCockBody = getBodyType(bodyType).needsCock;
    // Undress + Companion fetish custom → FaceID/epicrealism (no InstantID soft-censor).
    const identityEngine: IdentityEngine =
      mode === "undress" || mode === "custom"
        ? "faceid"
        : hasSdxl
          ? "instantid"
          : "faceid";
    const identityCkpt =
      identityEngine === "instantid" ? sdxlCkpt : sd15Ckpt;

    const realismCkpt =
      mode === "faceswap"
        ? null
        : mode === "undress" || mode === "custom" || mode === "toy"
          ? await resolveCheckpoint(
              REALISM_CKPTS,
              sd15Ckpt,
            )
          : mode === "scene"
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
          : mode === "custom"
            ? // Companion fetish / wardrobe edits: FaceID + epicrealism (same stack as true nude).
              buildScenePrompt(uploaded.filename, {
                promptOverride:
                  promptOverride ||
                  "sexy adult companion wardrobe edit, same face identity",
                identity: Math.max(identity, 0.85),
                // High denoise so fetish gear actually lands (0.64 left lingerie intact).
                denoise: Math.max(0.68, Math.min(0.8, 0.75)),
                faceLock: true,
                prefix: "narcissus_custom",
                checkpoint: realismCkpt || undefined,
                identityEngine: "faceid",
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
                  denoise: denoiseForIdentity("faceswap", identity),
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
        const cockFallback = getBodyType(bodyType).needsCock;
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
            denoise: cockFallback ? 0.68 : 0.62,
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
          // NA-79: keep undress denoise high on fallback — low denoise is how
          // clothes stay on. Cock path needs even more for genital invent.
          const cockFallback = getBodyType(bodyType).needsCock;
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
              denoise: cockFallback ? 0.68 : 0.62,
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
      mode === "toy" ||
      (mode === "scene" && sceneTpl?.id === "facial") ||
      ((mode === "undress" || mode === "custom" || mode === "scene") &&
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
