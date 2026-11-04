import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    database: isDatabaseConfigured(),
    ownerKey: process.env.ARTOFX_OWNER_KEY?.trim() || "default",
  });
}
