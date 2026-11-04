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
 * Art of X persistence — Neon Postgres.
 * ownerKey is a stand-in until real auth (Clerk / etc.).
 */

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("default"),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scenes = pgTable("scenes", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("default"),
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
  ownerKey: text("owner_key").notNull().default("default"),
  partnerId: integer("partner_id").notNull(),
  who: text("who").notNull(),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
