import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { requireUserId } from "@/lib/session";
import type { SavedScene } from "@/lib/artOfX";

export const runtime = "nodejs";

function rowToScene(row: typeof schema.scenes.$inferSelect): SavedScene {
  return {
    id: row.id,
    title: row.title,
    when: row.when,
    text: row.text,
    partnerIds: row.partnerIds || [],
    locationId: row.locationId,
    kinks: row.kinks || [],
    intensity: row.intensity,
    length: row.length as SavedScene["length"],
    imagePrompt: row.imagePrompt || undefined,
  };
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.userId, auth.userId));
  return NextResponse.json({ scenes: rows.map(rowToScene) });
}

export async function PUT(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { scenes?: SavedScene[] };
  try {
    body = (await req.json()) as { scenes?: SavedScene[] };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const list = Array.isArray(body.scenes) ? body.scenes : [];
  const db = getDb();
  const userId = auth.userId;

  await db.delete(schema.scenes).where(eq(schema.scenes.userId, userId));

  for (const s of list.slice(0, 40)) {
    await db.insert(schema.scenes).values({
      id: s.id,
      userId,
      title: s.title || "",
      when: s.when || "",
      text: s.text || "",
      partnerIds: s.partnerIds || [],
      locationId: s.locationId || "",
      kinks: s.kinks || [],
      intensity: s.intensity ?? 5,
      length: s.length || "medium",
      imagePrompt: s.imagePrompt || null,
    });
  }

  const rows = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.userId, userId));

  return NextResponse.json({ scenes: rows.map(rowToScene) });
}
