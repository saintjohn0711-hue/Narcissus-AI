/**
 * Site-wide age agreement (18+). Cookie is the source of truth for middleware;
 * localStorage mirrors for client reads when the cookie is unavailable.
 */

export const AGE_GATE_COOKIE = "narcissus_age_ok";
export const AGE_GATE_STORAGE_KEY = "narcissus.ageGate.v1";
export const AGE_GATE_VALUE = "1";
/** One year — returning visitors skip the gate. */
export const AGE_GATE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export const AGE_GATE_PATH = "/";
export const MENU_PATH = "/menu";

/** Paths that never require age agreement (static, APIs, the gate itself). */
export function isAgeGateExemptPath(pathname: string): boolean {
  if (pathname === AGE_GATE_PATH) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/brand/")) return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|txt|xml|map)$/i.test(pathname)) {
    return true;
  }
  return false;
}

/**
 * Safe in-app redirect target after agreeing (or when already agreed).
 * Rejects protocol-relative and off-site URLs.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback: string = MENU_PATH,
): string {
  if (!raw) return fallback;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/")) return fallback;
  if (decoded.startsWith("//")) return fallback;
  if (decoded.startsWith("/\\")) return fallback;
  if (decoded.includes("://")) return fallback;
  if (decoded === AGE_GATE_PATH) return fallback;
  return decoded;
}

export function ageGateCookieHeader(
  maxAge: number = AGE_GATE_MAX_AGE_SEC,
): string {
  const secure =
    typeof process !== "undefined" && process.env.NODE_ENV === "production"
      ? "; Secure"
      : "";
  return `${AGE_GATE_COOKIE}=${AGE_GATE_VALUE}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function readAgeGateFromDocumentCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${AGE_GATE_COOKIE}=${AGE_GATE_VALUE}`);
}

export function persistAgeGateClient(): void {
  if (typeof document !== "undefined") {
    document.cookie = ageGateCookieHeader();
  }
  try {
    localStorage.setItem(AGE_GATE_STORAGE_KEY, AGE_GATE_VALUE);
  } catch {
    /* private mode / blocked storage */
  }
}

export function readAgeGateFromLocalStorage(): boolean {
  try {
    return localStorage.getItem(AGE_GATE_STORAGE_KEY) === AGE_GATE_VALUE;
  } catch {
    return false;
  }
}
