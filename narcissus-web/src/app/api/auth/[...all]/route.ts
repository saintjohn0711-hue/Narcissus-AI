import { toNextJsHandler } from "better-auth/next-js";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function dispatch(method: "GET" | "POST", req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  const handlers = toNextJsHandler(getAuth());
  return handlers[method](req);
}

export async function GET(req: NextRequest) {
  return dispatch("GET", req);
}

export async function POST(req: NextRequest) {
  return dispatch("POST", req);
}
