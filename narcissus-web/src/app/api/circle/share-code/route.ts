import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { generateShareCode, newId } from "@/lib/circle";
import { getActiveShareCode } from "@/lib/circleAccess";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

/** GET — reveal active Circle share code (create one if missing). */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let row = await getActiveShareCode(auth.userId);
  if (!row) {
    const db = getDb();
    const code = generateShareCode();
    const id = newId("csc");
    await db.insert(schema.circleShareCodes).values({
      id,
      userId: auth.userId,
      code,
    });
    row = (await getActiveShareCode(auth.userId))!;
  }

  return NextResponse.json({
    code: row.code,
    createdAt: row.createdAt.toISOString(),
    note: "Share this Circle code so another signed-in adult can link as a viewer of your Circle profile. It is not your password.",
  });
}

/**
 * POST — rotate: revoke current code, issue a new one.
 * Body optional: { action: "rotate" | "revoke" }
 */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const auth = await requireUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let action: "rotate" | "revoke" = "rotate";
  try {
    const body = (await req.json()) as { action?: string };
    if (body.action === "revoke") action = "revoke";
  } catch {
    // empty body → rotate
  }

  const db = getDb();
  const now = new Date();
  await db
    .update(schema.circleShareCodes)
    .set({ revokedAt: now })
    .where(
      and(
        eq(schema.circleShareCodes.userId, auth.userId),
        isNull(schema.circleShareCodes.revokedAt),
      ),
    );

  if (action === "revoke") {
    return NextResponse.json({ code: null, revoked: true });
  }

  const code = generateShareCode();
  await db.insert(schema.circleShareCodes).values({
    id: newId("csc"),
    userId: auth.userId,
    code,
  });

  return NextResponse.json({
    code,
    createdAt: now.toISOString(),
    rotated: true,
  });
}
