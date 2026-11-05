import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { canViewCircleProfile } from "@/lib/circleAccess";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "userId_required" }, { status: 400 });
  }

  const access = await canViewCircleProfile(auth.userId, userId);
  if (!access.ok) {
    return NextResponse.json({ error: "not_found_or_private" }, { status: 404 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.userId, userId))
    .limit(1);

  if (!rows[0] && !access.isSelf) {
    return NextResponse.json({ error: "not_found_or_private" }, { status: 404 });
  }

  const p = rows[0];
  const photoQuery = db
    .select()
    .from(schema.circlePhotos)
    .where(
      access.isSelf
        ? eq(schema.circlePhotos.userId, userId)
        : and(
            eq(schema.circlePhotos.userId, userId),
            eq(schema.circlePhotos.hidden, false),
          ),
    )
    .orderBy(asc(schema.circlePhotos.sortOrder));

  const photos = await photoQuery;

  let displayName = p?.displayName || "";
  if (!displayName) {
    const u = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    displayName = u[0]?.name || "Circle member";
  }

  return NextResponse.json({
    profile: {
      userId,
      displayName,
      bio: p?.bio || "",
      lookingFor: p?.lookingFor || [],
      vibe: p?.vibe || "single",
      discoverable: p?.discoverable ?? false,
      photos: photos.map((ph) => ({
        id: ph.id,
        url: ph.url,
        caption: ph.caption,
        ...(access.isSelf ? { hidden: ph.hidden } : {}),
      })),
      linked: access.linked,
      isSelf: access.isSelf,
      updatedAt: p?.updatedAt?.toISOString(),
    },
  });
}
