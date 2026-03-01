-- Fix migration history table for Supabase CLI
-- Run this in Supabase Dashboard → SQL Editor if db push fails with
-- "relation supabase_migrations.schema_migrations does not exist" or similar.
--
-- Creates the schema and table the CLI expects for tracking applied migrations.

CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text NOT NULL,
  statements text[],
  name text
);

-- Add primary key only if table was just created (avoid duplicate constraint errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'schema_migrations_pkey'
      AND conrelid = 'supabase_migrations.schema_migrations'::regclass
  ) THEN
    ALTER TABLE ONLY supabase_migrations.schema_migrations
      ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);
  END IF;
END $$;
