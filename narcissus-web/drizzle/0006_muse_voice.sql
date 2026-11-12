ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "voice_gender" text DEFAULT 'female' NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "voice_preset" text DEFAULT 'auto' NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "voice_id" text DEFAULT '' NOT NULL;
