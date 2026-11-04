/** Temporary single-tenant key until auth exists. */
export function ownerKey(): string {
  return process.env.ARTOFX_OWNER_KEY?.trim() || "default";
}
