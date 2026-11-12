ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "sex_ribbons" jsonb DEFAULT '[]'::jsonb NOT NULL;
