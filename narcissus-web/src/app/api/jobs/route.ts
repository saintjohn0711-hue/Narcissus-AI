import { NextRequest, NextResponse } from "next/server";
import {
  isComfyConfigured,
  runPromptToImages,
  uploadImage,
} from "@/lib/comfy";
import { buildImg2ImgPrompt, type JobMode } from "@/lib/workflows";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("photo");
  const mode = String(form.get("mode") || "") as JobMode;
  const adultsConfirmed = form.get("adultsConfirmed") === "true";
  const promptOverride = String(form.get("prompt") || "").trim() || undefined;

  if (!adultsConfirmed) {
    return NextResponse.json(
      { error: "Adult confirmation required." },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Photo required." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo too large (max 12MB)." },
      { status: 400 },
    );
  }

  if (mode !== "faceswap" && mode !== "undress") {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
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
    const prompt = buildImg2ImgPrompt(mode, uploaded.filename, {
      promptOverride,
    });
    const result = await runPromptToImages(prompt);

    return NextResponse.json({
      id: result.promptId,
      status: "completed",
      mode,
      filename: file.name,
      bytes: file.size,
      message: "ComfyUI job finished.",
      comfyConfigured: true,
      promptId: result.promptId,
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
    modes: ["faceswap", "undress"],
    comfyConfigured: isComfyConfigured(),
    engine: "comfyui-img2img",
  });
}
