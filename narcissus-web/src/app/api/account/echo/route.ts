import { NextResponse } from "next/server";
import { count, eq, or } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Echo account highlights for the signed-in user.
 * Counts are scoped to this account only.
 */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const userId = auth.userId;

  const [userRow] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      createdAt: schema.user.createdAt,
      adultsConfirmed: schema.user.adultsConfirmed,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (!userRow) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const [[{ value: partnerCount }], [{ value: sceneCount }], [{ value: linkCount }]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(schema.partners)
        .where(eq(schema.partners.userId, userId)),
      db
        .select({ value: count() })
        .from(schema.scenes)
        .where(eq(schema.scenes.userId, userId)),
      db
        .select({ value: count() })
        .from(schema.circleLinks)
        .where(
          or(
            eq(schema.circleLinks.ownerUserId, userId),
            eq(schema.circleLinks.viewerUserId, userId),
          ),
        ),
    ]);

  const [circleProfile] = await db
    .select({
      displayName: schema.circleProfiles.displayName,
      discoverable: schema.circleProfiles.discoverable,
    })
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.userId, userId))
    .limit(1);

  return NextResponse.json({
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      image: userRow.image,
      createdAt: userRow.createdAt.toISOString(),
      adultsConfirmed: userRow.adultsConfirmed,
    },
    highlights: {
      partners: Number(partnerCount) || 0,
      scenes: Number(sceneCount) || 0,
      circleConnections: Number(linkCount) || 0,
      cloudSave: true,
      memberSince: userRow.createdAt.toISOString(),
    },
    circle: {
      displayName: circleProfile?.displayName || null,
      discoverable: circleProfile?.discoverable ?? false,
    },
  });
}
