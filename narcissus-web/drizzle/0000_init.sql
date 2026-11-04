CREATE TABLE IF NOT EXISTS "partners" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_key" text DEFAULT 'default' NOT NULL,
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
  "owner_key" text DEFAULT 'default' NOT NULL,
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
  "owner_key" text DEFAULT 'default' NOT NULL,
  "partner_id" integer NOT NULL,
  "who" text NOT NULL,
  "text" text NOT NULL,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);
