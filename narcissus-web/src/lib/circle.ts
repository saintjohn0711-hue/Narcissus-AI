/**
 * Circle — swingers-style discovery network + share codes.
 * Adults (18+) only. Share codes create linked-viewer connections;
 * they never share login passwords.
 */

export const CIRCLE_LOOKING_FOR = [
  "couples",
  "singles",
  "women",
  "men",
  "trans",
  "soft swap",
  "full swap",
  "same room",
  "separate room",
  "parties",
  "voyeur",
  "exhibition",
  "friends first",
] as const;

export type CircleLookingFor = (typeof CIRCLE_LOOKING_FOR)[number];

export const CIRCLE_VIBES = ["single", "couple", "open", "curious"] as const;
export type CircleVibe = (typeof CIRCLE_VIBES)[number];

export const CIRCLE_MAX_PHOTOS = 8;
export const CIRCLE_MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB
export const CIRCLE_BIO_MAX = 600;
export const CIRCLE_NAME_MAX = 48;

export type CirclePhotoPublic = {
  id: string;
  url: string;
  caption: string;
  hidden?: boolean;
};

export type CircleProfilePublic = {
  userId: string;
  displayName: string;
  bio: string;
  lookingFor: string[];
  vibe: string;
  discoverable: boolean;
  photos: CirclePhotoPublic[];
  linked?: boolean;
  isSelf?: boolean;
  updatedAt?: string;
};

export type CircleLinkRow = {
  id: string;
  otherUserId: string;
  displayName: string;
  role: "owner" | "viewer";
  createdAt: string;
  photoUrl?: string | null;
};

/** Ambiguity-safe alphabet for share codes (no 0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShareCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeShareCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function vibeLabel(v: string): string {
  switch (v) {
    case "single":
      return "Single";
    case "couple":
      return "Couple";
    case "open":
      return "Open";
    case "curious":
      return "Curious";
    default:
      return v;
  }
}
