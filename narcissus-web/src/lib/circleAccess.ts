import { and, eq, isNull, or } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** True if viewer may see owner's Circle profile (self, discoverable, or linked either way). */
export async function canViewCircleProfile(
  viewerUserId: string,
  ownerUserId: string,
): Promise<{ ok: boolean; linked: boolean; isSelf: boolean }> {
  if (viewerUserId === ownerUserId) {
    return { ok: true, linked: false, isSelf: true };
  }

  const db = getDb();
  const links = await db
    .select({ id: schema.circleLinks.id })
    .from(schema.circleLinks)
    .where(
      or(
        and(
          eq(schema.circleLinks.ownerUserId, ownerUserId),
          eq(schema.circleLinks.viewerUserId, viewerUserId),
        ),
        and(
          eq(schema.circleLinks.ownerUserId, viewerUserId),
          eq(schema.circleLinks.viewerUserId, ownerUserId),
        ),
      ),
    )
    .limit(1);

  if (links.length > 0) {
    return { ok: true, linked: true, isSelf: false };
  }

  const profile = await db
    .select({ discoverable: schema.circleProfiles.discoverable })
    .from(schema.circleProfiles)
    .where(eq(schema.circleProfiles.userId, ownerUserId))
    .limit(1);

  if (profile[0]?.discoverable) {
    return { ok: true, linked: false, isSelf: false };
  }

  return { ok: false, linked: false, isSelf: false };
}

export async function getActiveShareCode(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.circleShareCodes)
    .where(
      and(
        eq(schema.circleShareCodes.userId, userId),
        isNull(schema.circleShareCodes.revokedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
