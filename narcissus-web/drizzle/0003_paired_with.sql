ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "paired_with" jsonb DEFAULT '[]'::jsonb NOT NULL;
