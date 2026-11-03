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
  isNearlyBlankImage,
  resolveCheckpoint,
  runPromptToImages,
  uploadImage,
} from "@/lib/comfy";
import { getVideoTemplate, type VideoTemplateId } from "@/lib/templates";
import {
  buildFaceSwapPrompt,
  buildImg2ImgPrompt,
  buildUndressPrompt,
  buildVideoPrompt,
  type JobMode,
} from "@/lib/workflows";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 12 * 1024 * 1024;
const MODES: JobMode[] = ["faceswap", "undress", "custom", "video"];

const UNDRESS_CKPTS = [
  "epicrealism_naturalSinRC1VAE.safetensors",
  "realisticVisionV60B1_v51VAE.safetensors",
  "dreamshaper_8.safetensors",
  "v1-5-pruned-emaonly-fp16.safetensors",
];

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
  const template = String(form.get("template") || "natural") as VideoTemplateId;
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

  const tpl = mode === "video" ? getVideoTemplate(template) : null;
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
    const safeName = file.name.replace(/[^\w.\-]+/g, "_") || "upload.png";
    const uploaded = await uploadImage(file, safeName);

    let faceUploadedName: string | null = null;
    if (mode === "faceswap" && faceFile) {
      const faceSafe =
        faceFile.name.replace(/[^\w.\-]+/g, "_") || "face.png";
      const faceUploaded = await uploadImage(faceFile, `face_${faceSafe}`);
      faceUploadedName = faceUploaded.filename;
    }

    const undressCkpt =
      mode === "undress"
        ? await resolveCheckpoint(
            UNDRESS_CKPTS,
            "v1-5-pruned-emaonly-fp16.safetensors",
          )
        : null;

    const graph =
      mode === "faceswap" && faceUploadedName
        ? buildFaceSwapPrompt(uploaded.filename, faceUploadedName, {
            restoreVisibility: Math.min(1, Math.max(0.5, identity)),
          })
        : mode === "undress"
          ? buildUndressPrompt(uploaded.filename, {
              promptOverride,
              identity: Math.max(identity, 0.82),
              bodyType,
              cockState,
              cockSize,
              checkpoint: undressCkpt || undefined,
              faceLock: true,
            })
          : mode === "video"
            ? buildVideoPrompt(uploaded.filename, {
                template,
                speech,
                identity,
                seconds: 5,
                fps: 8,
              })
            : buildImg2ImgPrompt(mode, uploaded.filename, {
                promptOverride,
                identity,
              });

    let result = await runPromptToImages(graph, {
      timeoutMs: mode === "video" ? 360_000 : 180_000,
    });

    // ReActor can emit a pure-black frame when the undress pass wiped the face.
    // Detect that and immediately retry without the face-lock node.
    let faceLockFallback = false;
    if (mode === "undress" && result.images[0]) {
      try {
        const bytes = await fetchImageBytes(result.images[0]);
        if (isNearlyBlankImage(bytes)) {
          faceLockFallback = true;
          result = await runPromptToImages(
            buildUndressPrompt(uploaded.filename, {
              promptOverride,
              identity: Math.max(identity, 0.82),
              bodyType,
              cockState,
              cockSize,
              checkpoint: undressCkpt || undefined,
              faceLock: false,
              denoise: 0.52,
            }),
            { timeoutMs: 180_000 },
          );
        }
      } catch {
        // If we can't inspect the image, still return the first result URL.
      }
    }

    const bodyMeta = getBodyType(bodyType);
    const bodyLabel = bodyMeta.label;
    const cockNote =
      bodyMeta.needsCock
        ? ` · ${getCockState(cockState).label} ${getCockSize(cockSize).label}`
        : "";

    return NextResponse.json({
      id: result.promptId,
      status: "completed",
      mode,
      template: mode === "video" ? template : null,
      bodyType: mode === "undress" ? bodyType : null,
      cockState: mode === "undress" && bodyMeta.needsCock ? cockState : null,
      cockSize: mode === "undress" && bodyMeta.needsCock ? cockSize : null,
      speech: speech || null,
      identity,
      filename: file.name,
      faceFilename: faceFile?.name ?? null,
      bytes: file.size,
      prompt: promptOverride || null,
      checkpoint: undressCkpt,
      faceLockFallback,
      message:
        mode === "faceswap"
          ? "Face swap finished — donor face applied onto the source photo."
          : mode === "undress"
            ? faceLockFallback
              ? `Clothing removed with ${bodyLabel}${cockNote} anatomy (face-lock skipped — previous frame was blank).`
              : `Clothing removed with ${bodyLabel}${cockNote} anatomy. Face + hair locked via ReActor boost.`
            : mode === "video"
              ? tpl?.id === "say"
                ? `5s talking clip ready. Line queued: “${speech}”. Full lip-sync TTS hooks in next.`
                : `5s ${tpl?.label || "video"} template ready.`
              : "Photo job finished with high identity lock.",
      comfyConfigured: true,
      promptId: result.promptId,
      mediaKind: result.mediaKind,
      images: result.images,
      resultUrl: result.viewUrls[0] ?? null,
      resultUrls: result.viewUrls,
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
    videoTemplates: ["natural", "blowjob", "say"],
    comfyConfigured: isComfyConfigured(),
    engine: "comfyui-reactor+undress-bodytypes+svd",
  });
}
