/**
 * @deprecated Prefer requireUserId() from @/lib/session.
 * Kept as a no-op helper name for status diagnostics only.
 */
export function ownerKey(): string {
  return process.env.ARTOFX_OWNER_KEY?.trim() || "default";
}
