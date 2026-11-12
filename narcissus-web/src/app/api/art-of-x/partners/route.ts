import { NextRequest, NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { requireUserId } from "@/lib/session";
import {
  PG_INT4_MAX,
  normalizePairedWith,
  type PartnerRecord,
} from "@/lib/artOfX";
import { normalizeMemories } from "@/lib/museChatMemory";
import { normalizeSexRibbons } from "@/lib/sexRibbons";

export const runtime = "nodejs";

/** Accept only ids that fit Postgres int4. */
function safePartnerId(id: unknown): number | undefined {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isInteger(n) || n <= 0 || n > PG_INT4_MAX) return undefined;
  return n;
}

/**
 * Partner `id` is a global primary key (not per-user). Preserve the client's
 * id when free + in-range; otherwise allocate max(existing)+1.
 */
function allocatePartnerIds(
  list: PartnerRecord[],
  taken: Set<number>,
): number[] {
  let next = 1;
  for (const id of taken) {
    if (id >= next) next = id + 1;
  }
  const out: number[] = [];
  for (const p of list) {
    let id = safePartnerId(p.id);
    if (id == null || taken.has(id)) {
      while (taken.has(next) && next <= PG_INT4_MAX) next += 1;
      if (next > PG_INT4_MAX) {
        throw new Error("No free Muse ids left in range");
      }
      id = next;
      next += 1;
    }
    taken.add(id);
    out.push(id);
  }
  return out;
}

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
    pairedWith: normalizePairedWith(row.pairedWith, row.id),
    memories: normalizeMemories(row.memories),
    tryNewThings: Boolean(row.tryNewThings),
    sexRibbons: normalizeSexRibbons(row.sexRibbons),
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

  let list: PartnerRecord[] = Array.isArray(body.partners)
    ? body.partners.map((p) => ({
        ...p,
        photos: Array.isArray(p?.photos) ? [...p.photos] : [],
      }))
    : [];
  const db = getDb();
  const userId = auth.userId;
  const now = new Date();

  // Soft photo budget before delete-all (avoids wiping Muses on 413).
  // Prefer trimming non-main extras over hard-failing "add Muse" for heavy ledgers.
  const PHOTO_CHAR_BUDGET = 3_200_000;
  const PHOTO_COUNT_BUDGET = 80;

  function measurePhotos(rows: PartnerRecord[]) {
    let photoChars = 0;
    let photoCount = 0;
    for (const p of rows) {
      const photos = Array.isArray(p?.photos) ? p.photos : [];
      photoCount += photos.length;
      for (const src of photos) {
        if (typeof src === "string") photoChars += src.length;
      }
    }
    return { photoChars, photoCount };
  }

  let trimmedExtras = 0;
  let { photoChars, photoCount } = measurePhotos(list);
  if (photoChars > PHOTO_CHAR_BUDGET || photoCount > PHOTO_COUNT_BUDGET) {
    // Drop largest non-main photos until under budget.
    while (photoChars > PHOTO_CHAR_BUDGET || photoCount > PHOTO_COUNT_BUDGET) {
      let bestPartner = -1;
      let bestPhoto = -1;
      let bestLen = -1;
      for (let i = 0; i < list.length; i++) {
        const p = list[i]!;
        const photos = Array.isArray(p.photos) ? p.photos : [];
        if (photos.length <= 1) continue;
        const main = Math.min(
          Math.max(0, p.mainPhotoIndex ?? 0),
          photos.length - 1,
        );
        for (let j = 0; j < photos.length; j++) {
          if (j === main) continue;
          const len = typeof photos[j] === "string" ? photos[j]!.length : 0;
          if (len > bestLen) {
            bestLen = len;
            bestPartner = i;
            bestPhoto = j;
          }
        }
      }
      if (bestPartner < 0 || bestPhoto < 0) break;
      const p = list[bestPartner]!;
      const photos = [...(p.photos || [])];
      const main = Math.min(
        Math.max(0, p.mainPhotoIndex ?? 0),
        photos.length - 1,
      );
      photos.splice(bestPhoto, 1);
      list[bestPartner] = {
        ...p,
        photos,
        mainPhotoIndex: photos.length
          ? bestPhoto < main
            ? Math.max(0, main - 1)
            : Math.min(main, photos.length - 1)
          : 0,
      };
      trimmedExtras += 1;
      ({ photoChars, photoCount } = measurePhotos(list));
    }
  }

  if (photoChars > PHOTO_CHAR_BUDGET || photoCount > PHOTO_COUNT_BUDGET) {
    return NextResponse.json(
      {
        error: "payload_too_large",
        message:
          "Too many or too-large Muse photos for one save. Remove some photos and try again.",
        photoCount,
        photoChars,
      },
      { status: 413 },
    );
  }

  try {
    // Ids already held by other accounts (global PK) — must not reuse.
    const otherRows = await db
      .select({ id: schema.partners.id })
      .from(schema.partners)
      .where(ne(schema.partners.userId, userId));
    const taken = new Set(otherRows.map((r) => r.id));
    const ids = allocatePartnerIds(list, taken);

    // Replace-all for this user (simple sync model for MVP).
    // neon-http has no interactive transactions — size-guard above runs before delete.
    await db.delete(schema.partners).where(eq(schema.partners.userId, userId));

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      await db.insert(schema.partners).values({
        id: ids[i],
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
        pairedWith: normalizePairedWith(p.pairedWith, ids[i]),
        memories: normalizeMemories(p.memories),
        tryNewThings: Boolean(p.tryNewThings),
        sexRibbons: normalizeSexRibbons(p.sexRibbons),
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
      trimmedExtras: trimmedExtras || undefined,
      notice: trimmedExtras
        ? `Removed ${trimmedExtras} extra Muse photo${
            trimmedExtras === 1 ? "" : "s"
          } so the save would fit.`
        : undefined,
    });
  } catch (err) {
    console.error("partners PUT failed", err);
    const cause =
      err && typeof err === "object" && "cause" in err
        ? (err as { cause?: { message?: string } }).cause
        : undefined;
    return NextResponse.json(
      {
        error: "save_failed",
        message:
          cause?.message ||
          (err instanceof Error ? err.message : "Failed to save partners"),
      },
      { status: 500 },
    );
  }
}
