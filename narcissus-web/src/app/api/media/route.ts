import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { isComfyConfigured } from "@/lib/comfy";
import { localResultPath } from "@/lib/localResults";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Serve result media:
 * - local=1 → identity-locked PNG from .data/results
 * - else proxy ComfyUI /view (avoids Runpod 403s looking blank in-browser)
 */
export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  if (req.nextUrl.searchParams.get("local") === "1") {
    try {
      const buf = await readFile(localResultPath(filename));
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, max-age=3600",
          "Content-Length": String(buf.byteLength),
        },
      });
    } catch {
      return NextResponse.json({ error: "Local result not found" }, { status: 404 });
    }
  }

  if (!isComfyConfigured()) {
    return NextResponse.json(
      { error: "COMFYUI_BASE_URL is not set." },
      { status: 503 },
    );
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
