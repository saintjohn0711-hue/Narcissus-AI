import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { and, asc, count, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import {
  CIRCLE_MAX_PHOTO_BYTES,
  CIRCLE_MAX_PHOTOS,
  newId,
} from "@/lib/circle";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
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
  const photos = await db
    .select()
    .from(schema.circlePhotos)
    .where(eq(schema.circlePhotos.userId, auth.userId))
    .orderBy(asc(schema.circlePhotos.sortOrder));

  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      hidden: p.hidden,
      sortOrder: p.sortOrder,
    })),
    max: CIRCLE_MAX_PHOTOS,
    blob: blobConfigured(),
  });
}

/** POST multipart: file + optional caption */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  if (!blobConfigured()) {
    return NextResponse.json(
      {
        error: "blob_not_configured",
        message:
          "Circle photo uploads need BLOB_READ_WRITE_TOKEN on Vercel. Add the token, then retry.",
      },
      { status: 503 },
    );
  }

  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const [{ value: n }] = await db
    .select({ value: count() })
    .from(schema.circlePhotos)
    .where(eq(schema.circlePhotos.userId, auth.userId));

  if (Number(n) >= CIRCLE_MAX_PHOTOS) {
    return NextResponse.json(
      { error: "photo_limit", max: CIRCLE_MAX_PHOTOS },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "image_only" }, { status: 400 });
  }
  if (file.size > CIRCLE_MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: CIRCLE_MAX_PHOTO_BYTES },
      { status: 400 },
    );
  }

  const caption = String(form.get("caption") || "").slice(0, 120);
  const id = newId("cph");
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const pathname = `circle/${auth.userId}/${id}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  await db.insert(schema.circlePhotos).values({
    id,
    userId: auth.userId,
    url: blob.url,
    caption,
    sortOrder: Number(n),
    hidden: false,
  });

  // Ensure a profile row exists so discovery can attach a face later
  const profile = await db
    .select({ userId: schema.circleProfiles.userId })
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.userId, auth.userId))
    .limit(1);
  if (!profile[0]) {
    const u = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, auth.userId))
      .limit(1);
    await db.insert(schema.circleProfiles).values({
      userId: auth.userId,
      displayName: u[0]?.name || "",
      discoverable: false,
    });
  }

  return NextResponse.json({
    photo: { id, url: blob.url, caption, hidden: false, sortOrder: Number(n) },
  });
}

/** DELETE ?id= — remove own photo (and Blob object when possible). */
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
    .from(schema.circlePhotos)
    .where(
      and(
        eq(schema.circlePhotos.id, id),
        eq(schema.circlePhotos.userId, auth.userId),
      ),
    )
    .limit(1);
  const photo = rows[0];
  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (blobConfigured() && photo.url.includes("blob.vercel-storage.com")) {
    try {
      await del(photo.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // Non-fatal — row still deleted
    }
  }

  await db.delete(schema.circlePhotos).where(eq(schema.circlePhotos.id, id));
  return NextResponse.json({ ok: true });
}
