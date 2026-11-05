import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { newId, normalizeShareCode } from "@/lib/circle";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

/**
 * POST { code } — redeem a Circle share code.
 * Creates a linked-viewer relationship: viewer may see the owner's Circle
 * profile and both show up in connections. Does not share vault passwords
 * or Art of X private partner data.
 */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw = "";
  try {
    const body = (await req.json()) as { code?: string };
    raw = body.code || "";
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const code = normalizeShareCode(raw);
  if (code.length < 6 || code.length > 16) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.circleShareCodes)
    .where(
      and(
        eq(schema.circleShareCodes.code, code),
        isNull(schema.circleShareCodes.revokedAt),
      ),
    )
    .limit(1);

  const share = rows[0];
  if (!share) {
    return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  }
  if (share.userId === auth.userId) {
    return NextResponse.json({ error: "cannot_link_self" }, { status: 400 });
  }

  const existing = await db
    .select({ id: schema.circleLinks.id })
    .from(schema.circleLinks)
    .where(
      and(
        eq(schema.circleLinks.ownerUserId, share.userId),
        eq(schema.circleLinks.viewerUserId, auth.userId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return NextResponse.json({
      ok: true,
      alreadyLinked: true,
      ownerUserId: share.userId,
      linkId: existing[0].id,
    });
  }

  const id = newId("clink");
  await db.insert(schema.circleLinks).values({
    id,
    ownerUserId: share.userId,
    viewerUserId: auth.userId,
  });

  // Ensure owner has at least a stub profile so the link is useful
  const profile = await db
    .select({ userId: schema.circleProfiles.userId })
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.userId, share.userId))
    .limit(1);
  if (!profile[0]) {
    const owner = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, share.userId))
      .limit(1);
    await db.insert(schema.circleProfiles).values({
      userId: share.userId,
      displayName: owner[0]?.name || "Circle member",
      discoverable: false,
    });
  }

  return NextResponse.json({
    ok: true,
    ownerUserId: share.userId,
    linkId: id,
    access: "linked_viewer",
    note: "You can view their Circle profile and appear in each other's connections. Art of X vault data stays private.",
  });
}
