import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import type { CircleLinkRow } from "@/lib/circle";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

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
    .from(schema.circleLinks)
    .where(
      or(
        eq(schema.circleLinks.ownerUserId, auth.userId),
        eq(schema.circleLinks.viewerUserId, auth.userId),
      ),
    );

  const links: CircleLinkRow[] = [];
  for (const row of rows) {
    const otherId =
      row.ownerUserId === auth.userId ? row.viewerUserId : row.ownerUserId;
    const role: "owner" | "viewer" =
      row.ownerUserId === auth.userId ? "owner" : "viewer";

    const profile = await db
      .select({
        displayName: schema.circleProfiles.displayName,
      })
      .from(schema.circleProfiles)
      .where(eq(schema.circleProfiles.userId, otherId))
      .limit(1);

    let displayName = profile[0]?.displayName || "";
    if (!displayName) {
      const u = await db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, otherId))
        .limit(1);
      displayName = u[0]?.name || "Linked member";
    }

    const photo = await db
      .select({ url: schema.circlePhotos.url })
      .from(schema.circlePhotos)
      .where(
        and(
          eq(schema.circlePhotos.userId, otherId),
          eq(schema.circlePhotos.hidden, false),
        ),
      )
      .limit(1);

    links.push({
      id: row.id,
      otherUserId: otherId,
      displayName,
      role,
      createdAt: row.createdAt.toISOString(),
      photoUrl: photo[0]?.url ?? null,
    });
  }

  links.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ links });
}

/** DELETE ?id= — remove a link (either party may unlink). */
export async function DELETE(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id_required" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.circleLinks)
    .where(eq(schema.circleLinks.id, id))
    .limit(1);
  const link = rows[0];
  if (!link) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (
    link.ownerUserId !== auth.userId &&
    link.viewerUserId !== auth.userId
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.delete(schema.circleLinks).where(eq(schema.circleLinks.id, id));
  return NextResponse.json({ ok: true });
}
