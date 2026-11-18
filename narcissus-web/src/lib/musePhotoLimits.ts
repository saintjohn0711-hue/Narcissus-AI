/**
 * Muse / partner photo save limits by account tier.
 * Free/local stays lean; signed-in Plus matches the prior default;
 * High raises the cap; Owner (Sandlot) is fixed at 40 per Muse.
 */

export type MusePhotoTier = "free" | "plus" | "high" | "owner";

export type MusePhotoLimit = {
  /** Max photos saved on one Muse (partner row). */
  perPartner: number;
  /** Soft total photos across the whole Muse ledger for one account save. */
  accountTotal: number;
  /** Soft payload budget for data-URL photos (chars). */
  charBudget: number;
  label: string;
};

/**
 * Primary owner account — always Owner tier (40 photos / Muse).
 * Match case-insensitively.
 */
export const OWNER_ACCOUNT_EMAILS = [
  "saintjohn0711@gmail.com",
] as const;

export const MUSE_PHOTO_TIER_LIMITS: Record<MusePhotoTier, MusePhotoLimit> = {
  free: {
    perPartner: 4,
    accountTotal: 24,
    charBudget: 800_000,
    label: "Free",
  },
  plus: {
    perPartner: 12,
    accountTotal: 80,
    charBudget: 3_200_000,
    label: "Plus",
  },
  high: {
    perPartner: 30,
    accountTotal: 200,
    charBudget: 6_400_000,
    label: "High",
  },
  owner: {
    perPartner: 40,
    accountTotal: 400,
    charBudget: 10_000_000,
    label: "Owner",
  },
};

export function normalizeAccountEmail(
  email: string | null | undefined,
): string {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function isOwnerAccountEmail(
  email: string | null | undefined,
): boolean {
  const e = normalizeAccountEmail(email);
  return (OWNER_ACCOUNT_EMAILS as readonly string[]).includes(e);
}

/** Comma-separated allowlist for High tier (client + server). */
export function highTierEmailsFromEnv(): string[] {
  const raw =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_MUSE_PHOTO_HIGH_EMAILS ||
        process.env.MUSE_PHOTO_HIGH_EMAILS)) ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve Muse photo tier for an account.
 * Owner email → 40/Muse; High allowlist → 30; signed-in → Plus 12; else Free 4.
 */
export function musePhotoTierForAccount(opts: {
  email?: string | null;
  signedIn?: boolean;
}): MusePhotoTier {
  const email = normalizeAccountEmail(opts.email);
  if (email && isOwnerAccountEmail(email)) return "owner";
  if (email && highTierEmailsFromEnv().includes(email)) return "high";
  if (opts.signedIn || Boolean(email)) return "plus";
  return "free";
}

export function musePhotoLimitsForTier(
  tier: MusePhotoTier,
): MusePhotoLimit {
  return MUSE_PHOTO_TIER_LIMITS[tier];
}

export function musePhotoLimitsForAccount(opts: {
  email?: string | null;
  signedIn?: boolean;
}): MusePhotoLimit & { tier: MusePhotoTier } {
  const tier = musePhotoTierForAccount(opts);
  return { tier, ...musePhotoLimitsForTier(tier) };
}

/** Trim a Muse photo list to the tier per-partner cap (keeps main when possible). */
export function clampPartnerPhotos(
  photos: string[] | undefined,
  mainPhotoIndex: number | undefined,
  perPartner: number,
): { photos: string[]; mainPhotoIndex: number } {
  const list = Array.isArray(photos) ? [...photos] : [];
  if (list.length <= perPartner) {
    return {
      photos: list,
      mainPhotoIndex: list.length
        ? Math.min(Math.max(0, mainPhotoIndex ?? 0), list.length - 1)
        : 0,
    };
  }
  const main = Math.min(
    Math.max(0, mainPhotoIndex ?? 0),
    list.length - 1,
  );
  const mainSrc = list[main];
  const others = list.filter((_, i) => i !== main);
  const kept = [mainSrc!, ...others].filter(Boolean).slice(0, perPartner);
  return { photos: kept, mainPhotoIndex: 0 };
}
