import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, notInArray, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { requireUserId, requireUserSession } from "@/lib/session";
import {
  PG_INT4_MAX,
  museMembersOf,
  normalizeDoneActs,
  normalizeMembers,
  normalizeMuseKind,
  normalizePairedWith,
  reconcileWantActs,
  type PartnerRecord,
} from "@/lib/artOfX";
import {
  clampPartnerPhotos,
  musePhotoLimitsForAccount,
} from "@/lib/musePhotoLimits";
import { normalizeMemories } from "@/lib/museChatMemory";
import {
  normalizeVoiceGender,
  normalizeVoicePreset,
} from "@/lib/museVoice";
import { normalizeSexRibbons } from "@/lib/sexRibbons";

export const runtime = "nodejs";

/**
 * Ensure #93 columns exist before any partners read/write.
 * Missing muse_kind previously broke GET and let PUT delete-then-fail wipe rows.
 */
async function ensurePartnersKindColumns(
  db: ReturnType<typeof getDb>,
): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "muse_kind" text DEFAULT 'solo' NOT NULL
  `);
  await db.execute(sql`
    ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "members" jsonb DEFAULT '[]'::jsonb NOT NULL
  `);
  await db.execute(sql`
    ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "want_acts" jsonb DEFAULT '[]'::jsonb NOT NULL
  `);
}

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
  const museKind = normalizeMuseKind(row.museKind, {
    isCouple: row.isCouple,
    gender: row.gender,
    members: row.members,
    partnerA: row.partnerA,
    partnerB: row.partnerB,
  });
  const members = museMembersOf({
    museKind,
    members: row.members,
    isCouple: row.isCouple,
    gender: row.gender,
    partnerA: row.partnerA,
    partnerB: row.partnerB,
  });
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
    doneActs: normalizeDoneActs(row.doneActs),
    wantActs: reconcileWantActs(row.doneActs, row.wantActs),
    photos: row.photos || [],
    mainPhotoIndex: row.mainPhotoIndex ?? 0,
    favorite: row.favorite,
    museKind,
    members,
    isCouple: museKind === "couple" || row.isCouple,
    partnerA: row.partnerA || members[0]?.name || "",
    partnerB: row.partnerB || members[1]?.name || "",
    locations: row.locations,
    pairedWith: normalizePairedWith(row.pairedWith, row.id),
    memories: normalizeMemories(row.memories),
    tryNewThings: Boolean(row.tryNewThings),
    sexRibbons: normalizeSexRibbons(row.sexRibbons),
    voiceGender: normalizeVoiceGender(row.voiceGender, row.gender),
    voicePreset: normalizeVoicePreset(
      row.voicePreset,
      normalizeVoiceGender(row.voiceGender, row.gender),
    ),
    voiceId: typeof row.voiceId === "string" ? row.voiceId : "",
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
  try {
    await ensurePartnersKindColumns(db);
    const rows = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.userId, auth.userId));
    return NextResponse.json({
      partners: rows.map(rowToPartner).sort((a, b) => b.id - a.id),
    });
  } catch (err) {
    console.error("partners GET failed", err);
    const cause =
      err && typeof err === "object" && "cause" in err
        ? (err as { cause?: { message?: string } }).cause
        : undefined;
    return NextResponse.json(
      {
        error: "load_failed",
        message:
          cause?.message ||
          (err instanceof Error ? err.message : "Failed to load partners"),
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { partners?: PartnerRecord[] };
  try {
    body = (await req.json()) as { partners?: PartnerRecord[] };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const photoLimits = musePhotoLimitsForAccount({
    email: auth.email,
    signedIn: true,
  });

  let list: PartnerRecord[] = Array.isArray(body.partners)
    ? body.partners.map((p) => {
        const clamped = clampPartnerPhotos(
          p?.photos,
          p?.mainPhotoIndex,
          photoLimits.perPartner,
        );
        return {
          ...p,
          photos: clamped.photos,
          mainPhotoIndex: clamped.mainPhotoIndex,
        };
      })
    : [];
  const db = getDb();
  const userId = auth.userId;
  const now = new Date();

  // Soft photo budget before delete-all (avoids wiping Muses on 413).
  // Prefer trimming non-main extras over hard-failing "add Muse" for heavy ledgers.
  const PHOTO_CHAR_BUDGET = photoLimits.charBudget;
  const PHOTO_COUNT_BUDGET = photoLimits.accountTotal;

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
    // Fail closed on missing #93 columns before any delete/upsert.
    await ensurePartnersKindColumns(db);

    // Ids already held by other accounts (global PK) — must not reuse.
    const otherRows = await db
      .select({ id: schema.partners.id })
      .from(schema.partners)
      .where(ne(schema.partners.userId, userId));
    const taken = new Set(otherRows.map((r) => r.id));
    const ids = allocatePartnerIds(list, taken);

    // Upsert-first replace-all (neon-http has no interactive transactions).
    // Never delete before inserts succeed — a failed insert used to wipe the roster.
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const id = ids[i]!;
      const museKind = normalizeMuseKind(p.museKind, p);
      const members = normalizeMembers(
        p.members?.length ? p.members : museMembersOf(p),
      );
      const voiceGender = normalizeVoiceGender(p.voiceGender, p.gender);
      const row = {
        id,
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
        doneActs: normalizeDoneActs(p.doneActs),
        wantActs: reconcileWantActs(p.doneActs, p.wantActs),
        photos: p.photos || [],
        mainPhotoIndex: p.mainPhotoIndex ?? 0,
        favorite: Boolean(p.favorite),
        museKind,
        members,
        isCouple: museKind === "couple" || Boolean(p.isCouple),
        partnerA: p.partnerA || members[0]?.name || "",
        partnerB: p.partnerB || members[1]?.name || "",
        locations: p.locations || "",
        pairedWith: normalizePairedWith(p.pairedWith, id),
        memories: normalizeMemories(p.memories),
        tryNewThings: Boolean(p.tryNewThings),
        sexRibbons: normalizeSexRibbons(p.sexRibbons),
        voiceGender,
        voicePreset: normalizeVoicePreset(p.voicePreset, voiceGender),
        voiceId:
          typeof p.voiceId === "string" ? p.voiceId.trim().slice(0, 200) : "",
        createdAt: p.createdAt ? new Date(p.createdAt) : now,
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : now,
      };
      await db
        .insert(schema.partners)
        .values(row)
        .onConflictDoUpdate({
          target: schema.partners.id,
          set: {
            userId: row.userId,
            name: row.name,
            type: row.type,
            gender: row.gender,
            looks: row.looks,
            notes: row.notes,
            history: row.history,
            dynamics: row.dynamics,
            dynTags: row.dynTags,
            kinks: row.kinks,
            doneActs: row.doneActs,
            wantActs: row.wantActs,
            photos: row.photos,
            mainPhotoIndex: row.mainPhotoIndex,
            favorite: row.favorite,
            museKind: row.museKind,
            members: row.members,
            isCouple: row.isCouple,
            partnerA: row.partnerA,
            partnerB: row.partnerB,
            locations: row.locations,
            pairedWith: row.pairedWith,
            memories: row.memories,
            tryNewThings: row.tryNewThings,
            sexRibbons: row.sexRibbons,
            voiceGender: row.voiceGender,
            voicePreset: row.voicePreset,
            voiceId: row.voiceId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        });
    }

    // Drop orphans only after every upsert succeeded.
    if (ids.length === 0) {
      await db.delete(schema.partners).where(eq(schema.partners.userId, userId));
    } else {
      await db
        .delete(schema.partners)
        .where(
          and(
            eq(schema.partners.userId, userId),
            notInArray(schema.partners.id, ids),
          ),
        );
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
