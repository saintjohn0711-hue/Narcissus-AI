import { NextRequest, NextResponse } from "next/server";
import { isComfyConfigured } from "@/lib/comfy";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Proxy ComfyUI /view through the Next app so the browser never depends on
 * the Runpod proxy (intermittent 403s showed up as blank results).
 */
export async function GET(req: NextRequest) {
  if (!isComfyConfigured()) {
    return NextResponse.json(
      { error: "COMFYUI_BASE_URL is not set." },
      { status: 503 },
    );
  }

  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const subfolder = req.nextUrl.searchParams.get("subfolder") || "";
  const type = req.nextUrl.searchParams.get("type") || "output";
  const base = process.env.COMFYUI_BASE_URL!.replace(/\/$/, "");
  const params = new URLSearchParams({ filename, subfolder, type });
  const upstream = `${base}/view?${params.toString()}`;

  try {
    const res = await fetch(upstream, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream media failed (${res.status})` },
        { status: 502 },
      );
    }
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(buf.byteLength),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Media proxy failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
