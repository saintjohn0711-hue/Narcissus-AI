ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "muse_kind" text DEFAULT 'solo' NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "members" jsonb DEFAULT '[]'::jsonb NOT NULL;
