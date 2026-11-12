import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Better Auth tables + Art of X persistence (Neon Postgres).
 * Art of X rows are scoped by userId (signed-in account).
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Adults-only gate — required at signup */
  adultsConfirmed: boolean("adults_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("Real"),
  gender: text("gender").notNull().default("woman"),
  looks: text("looks").notNull().default(""),
  notes: text("notes").notNull().default(""),
  history: text("history").notNull().default(""),
  dynamics: text("dynamics").notNull().default(""),
  dynTags: jsonb("dyn_tags").$type<string[]>().notNull().default([]),
  kinks: jsonb("kinks")
    .$type<
      Array<{
        tag: string;
        role: string;
        status: string;
        intensity: number;
      }>
    >()
    .notNull()
    .default([]),
  doneActs: jsonb("done_acts").$type<string[]>().notNull().default([]),
  /** Photo URLs or data-URLs (Blob URLs preferred later) */
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  mainPhotoIndex: integer("main_photo_index").notNull().default(0),
  favorite: boolean("favorite").notNull().default(false),
  isCouple: boolean("is_couple").notNull().default(false),
  partnerA: text("partner_a").notNull().default(""),
  partnerB: text("partner_b").notNull().default(""),
  locations: text("locations").notNull().default(""),
  /** Muse ids this Muse has played with (joint chat cast). */
  pairedWith: jsonb("paired_with").$type<number[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scenes = pgTable("scenes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default(""),
  when: text("when").notNull().default(""),
  text: text("text").notNull().default(""),
  partnerIds: jsonb("partner_ids").$type<number[]>().notNull().default([]),
  locationId: text("location_id").notNull().default(""),
  kinks: jsonb("kinks").$type<string[]>().notNull().default([]),
  intensity: integer("intensity").notNull().default(5),
  length: text("length").notNull().default("medium"),
  imagePrompt: text("image_prompt"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  partnerId: integer("partner_id").notNull(),
  who: text("who").notNull(),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Circle — swingers-style discovery + share codes.
 * Share codes grant linked-viewer connections (view Circle profile + mutual
 * connection). They are NOT password sharing.
 */

export const circleShareCodes = pgTable("circle_share_codes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Short human-enterable code (uppercase). Unique while active. */
  code: text("code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Null = active. Set when rotated or revoked. */
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/** Linked viewers: redeeming a Circle code creates a directed link. */
export const circleLinks = pgTable("circle_links", {
  id: text("id").primaryKey(),
  /** Account that owned the share code */
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Account that redeemed the code */
  viewerUserId: text("viewer_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const circleProfiles = pgTable("circle_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  lookingFor: jsonb("looking_for").$type<string[]>().notNull().default([]),
  /** single | couple | thruple | open */
  vibe: text("vibe").notNull().default("single"),
  /** Opt-in to appear in Circle discovery browse */
  discoverable: boolean("discoverable").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const circlePhotos = pgTable("circle_photos", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
