import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

/** List opted-in Circle profiles for discovery (signed-in adults only). */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const profiles = await db
    .select()
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.discoverable, true))
    .orderBy(desc(schema.circleProfiles.updatedAt))
    .limit(100);

  const items = [];
  for (const p of profiles) {
    if (p.userId === auth.userId) continue;

    const photo = await db
      .select({ url: schema.circlePhotos.url })
      .from(schema.circlePhotos)
      .where(
        and(
          eq(schema.circlePhotos.userId, p.userId),
          eq(schema.circlePhotos.hidden, false),
        ),
      )
      .limit(1);

    items.push({
      userId: p.userId,
      displayName: p.displayName,
      bio: p.bio.slice(0, 160),
      lookingFor: p.lookingFor || [],
      vibe: p.vibe,
      photoUrl: photo[0]?.url ?? null,
      updatedAt: p.updatedAt.toISOString(),
    });
  }

  return NextResponse.json({ profiles: items });
}
