import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import {
  CIRCLE_BIO_MAX,
  CIRCLE_LOOKING_FOR,
  CIRCLE_NAME_MAX,
  CIRCLE_VIBES,
  type CircleProfilePublic,
} from "@/lib/circle";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

async function loadOwnProfile(userId: string): Promise<CircleProfilePublic> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.userId, userId))
    .limit(1);

  const photos = await db
    .select()
    .from(schema.circlePhotos)
    .where(eq(schema.circlePhotos.userId, userId))
    .orderBy(asc(schema.circlePhotos.sortOrder));

  if (!rows[0]) {
    const u = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    return {
      userId,
      displayName: u[0]?.name || "",
      bio: "",
      lookingFor: [],
      vibe: "single",
      discoverable: false,
      photos: [],
      isSelf: true,
    };
  }

  const p = rows[0];
  return {
    userId,
    displayName: p.displayName,
    bio: p.bio,
    lookingFor: p.lookingFor || [],
    vibe: p.vibe,
    discoverable: p.discoverable,
    photos: photos.map((ph) => ({
      id: ph.id,
      url: ph.url,
      caption: ph.caption,
      hidden: ph.hidden,
    })),
    isSelf: true,
    updatedAt: p.updatedAt.toISOString(),
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

  const profile = await loadOwnProfile(auth.userId);
  // Include hidden flag for owner
  const db = getDb();
  const photos = await db
    .select()
    .from(schema.circlePhotos)
    .where(eq(schema.circlePhotos.userId, auth.userId))
    .orderBy(asc(schema.circlePhotos.sortOrder));

  return NextResponse.json({
    profile: {
      ...profile,
      photos: photos.map((ph) => ({
        id: ph.id,
        url: ph.url,
        caption: ph.caption,
        hidden: ph.hidden,
      })),
    },
  });
}

export async function PUT(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    displayName?: string;
    bio?: string;
    lookingFor?: string[];
    vibe?: string;
    discoverable?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const displayName = String(body.displayName ?? "")
    .trim()
    .slice(0, CIRCLE_NAME_MAX);
  const bio = String(body.bio ?? "").trim().slice(0, CIRCLE_BIO_MAX);
  const allowed = new Set<string>(CIRCLE_LOOKING_FOR);
  const lookingFor = (Array.isArray(body.lookingFor) ? body.lookingFor : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => allowed.has(t))
    .slice(0, 12);
  const vibe = CIRCLE_VIBES.includes(body.vibe as (typeof CIRCLE_VIBES)[number])
    ? (body.vibe as string)
    : "single";
  const discoverable = Boolean(body.discoverable);

  if (discoverable && !displayName) {
    return NextResponse.json(
      { error: "display_name_required_for_discovery" },
      { status: 400 },
    );
  }

  const db = getDb();
  const now = new Date();
  const existing = await db
    .select({ userId: schema.circleProfiles.userId })
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.userId, auth.userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.circleProfiles)
      .set({
        displayName,
        bio,
        lookingFor,
        vibe,
        discoverable,
        updatedAt: now,
      })
      .where(eq(schema.circleProfiles.userId, auth.userId));
  } else {
    await db.insert(schema.circleProfiles).values({
      userId: auth.userId,
      displayName,
      bio,
      lookingFor,
      vibe,
      discoverable,
      createdAt: now,
      updatedAt: now,
    });
  }

  const profile = await loadOwnProfile(auth.userId);
  return NextResponse.json({ profile });
}

/** PATCH photo visibility — { photoId, hidden } */
export async function PATCH(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { photoId?: string; hidden?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.photoId || typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "photoId_and_hidden_required" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.circlePhotos)
    .where(
      and(
        eq(schema.circlePhotos.id, body.photoId),
        eq(schema.circlePhotos.userId, auth.userId),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db
    .update(schema.circlePhotos)
    .set({ hidden: body.hidden })
    .where(eq(schema.circlePhotos.id, body.photoId));

  return NextResponse.json({ ok: true, photoId: body.photoId, hidden: body.hidden });
}
