-- Auth tables (Better Auth) + rename owner_key → user_id for per-account Art of X data.

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "adults_confirmed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Partners / scenes / chats: migrate owner_key → user_id when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'owner_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "partners" RENAME COLUMN "owner_key" TO "user_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'owner_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "scenes" RENAME COLUMN "owner_key" TO "user_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'owner_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "chat_messages" RENAME COLUMN "owner_key" TO "user_id";
  END IF;
END $$;

-- Fresh installs: ensure Art of X tables exist with user_id.
CREATE TABLE IF NOT EXISTS "partners" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "type" text DEFAULT 'Real' NOT NULL,
  "gender" text DEFAULT 'woman' NOT NULL,
  "looks" text DEFAULT '' NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "history" text DEFAULT '' NOT NULL,
  "dynamics" text DEFAULT '' NOT NULL,
  "dyn_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "kinks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "done_acts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "main_photo_index" integer DEFAULT 0 NOT NULL,
  "favorite" boolean DEFAULT false NOT NULL,
  "is_couple" boolean DEFAULT false NOT NULL,
  "partner_a" text DEFAULT '' NOT NULL,
  "partner_b" text DEFAULT '' NOT NULL,
  "locations" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scenes" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "when" text DEFAULT '' NOT NULL,
  "text" text DEFAULT '' NOT NULL,
  "partner_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "location_id" text DEFAULT '' NOT NULL,
  "kinks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "intensity" integer DEFAULT 5 NOT NULL,
  "length" text DEFAULT 'medium' NOT NULL,
  "image_prompt" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "partner_id" integer NOT NULL,
  "who" text NOT NULL,
  "text" text NOT NULL,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS partners_user_id_idx ON "partners" ("user_id");
CREATE INDEX IF NOT EXISTS scenes_user_id_idx ON "scenes" ("user_id");
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON "chat_messages" ("user_id");
CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account" ("user_id");
