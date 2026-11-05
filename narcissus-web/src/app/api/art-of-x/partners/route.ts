import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { requireUserId } from "@/lib/session";
import type { PartnerRecord } from "@/lib/artOfX";

export const runtime = "nodejs";

function rowToPartner(
  row: typeof schema.partners.$inferSelect,
): PartnerRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type as PartnerRecord["type"],
    gender: row.gender as PartnerRecord["gender"],
    looks: row.looks,
    notes: row.notes,
    history: row.history,
    dynamics: row.dynamics,
    dynTags: row.dynTags || [],
    kinks: (row.kinks || []) as PartnerRecord["kinks"],
    doneActs: row.doneActs || [],
    photos: row.photos || [],
    mainPhotoIndex: row.mainPhotoIndex ?? 0,
    favorite: row.favorite,
    isCouple: row.isCouple,
    partnerA: row.partnerA,
    partnerB: row.partnerB,
    locations: row.locations,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
    .from(schema.partners)
    .where(eq(schema.partners.userId, auth.userId));
  return NextResponse.json({
    partners: rows.map(rowToPartner).sort((a, b) => b.id - a.id),
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

  let body: { partners?: PartnerRecord[] };
  try {
    body = (await req.json()) as { partners?: PartnerRecord[] };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const list = Array.isArray(body.partners) ? body.partners : [];
  const db = getDb();
  const userId = auth.userId;
  const now = new Date();

  // Replace-all for this user (simple sync model for MVP)
  await db.delete(schema.partners).where(eq(schema.partners.userId, userId));

  for (const p of list) {
    await db.insert(schema.partners).values({
      id: Number.isFinite(p.id) ? p.id : undefined,
      userId,
      name: p.name || "",
      type: p.type || "Real",
      gender: p.gender || "woman",
      looks: p.looks || "",
      notes: p.notes || "",
      history: p.history || "",
      dynamics: p.dynamics || "",
      dynTags: p.dynTags || [],
      kinks: p.kinks || [],
      doneActs: p.doneActs || [],
      photos: p.photos || [],
      mainPhotoIndex: p.mainPhotoIndex ?? 0,
      favorite: Boolean(p.favorite),
      isCouple: Boolean(p.isCouple),
      partnerA: p.partnerA || "",
      partnerB: p.partnerB || "",
      locations: p.locations || "",
      createdAt: p.createdAt ? new Date(p.createdAt) : now,
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : now,
    });
  }

  const rows = await db
    .select()
    .from(schema.partners)
    .where(eq(schema.partners.userId, userId));

  return NextResponse.json({
    partners: rows.map(rowToPartner).sort((a, b) => b.id - a.id),
  });
}
