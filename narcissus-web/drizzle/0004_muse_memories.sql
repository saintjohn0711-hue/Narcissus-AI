ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "memories" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "try_new_things" boolean DEFAULT false NOT NULL;
