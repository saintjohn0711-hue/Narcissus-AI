-- Circle: share codes, linked viewers, discovery profiles + photos.

CREATE TABLE IF NOT EXISTS "circle_share_codes" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS circle_share_codes_active_code_uidx
  ON "circle_share_codes" ("code")
  WHERE "revoked_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS circle_share_codes_one_active_per_user_uidx
  ON "circle_share_codes" ("user_id")
  WHERE "revoked_at" IS NULL;

CREATE INDEX IF NOT EXISTS circle_share_codes_user_id_idx
  ON "circle_share_codes" ("user_id");

CREATE TABLE IF NOT EXISTS "circle_links" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "viewer_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS circle_links_owner_viewer_uidx
  ON "circle_links" ("owner_user_id", "viewer_user_id");

CREATE INDEX IF NOT EXISTS circle_links_viewer_idx
  ON "circle_links" ("viewer_user_id");

CREATE INDEX IF NOT EXISTS circle_links_owner_idx
  ON "circle_links" ("owner_user_id");

CREATE TABLE IF NOT EXISTS "circle_profiles" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "display_name" text DEFAULT '' NOT NULL,
  "bio" text DEFAULT '' NOT NULL,
  "looking_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "vibe" text DEFAULT 'single' NOT NULL,
  "discoverable" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS circle_profiles_discoverable_idx
  ON "circle_profiles" ("discoverable")
  WHERE "discoverable" = true;

CREATE TABLE IF NOT EXISTS "circle_photos" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "caption" text DEFAULT '' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "hidden" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS circle_photos_user_id_idx
  ON "circle_photos" ("user_id");
