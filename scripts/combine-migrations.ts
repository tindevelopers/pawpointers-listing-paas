#!/usr/bin/env tsx
/**
 * Script to combine all migrations into a single SQL file
 * Run with: npx tsx scripts/combine-migrations.ts
 */

import * as fs from "fs";
import * as path from "path";

const migrationsDir = path.join(__dirname, "../supabase/migrations");
const outputFile = path.join(__dirname, "../supabase/all_migrations_combined.sql");

// Get all migration files sorted by name (which includes timestamp)
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`\n📋 Combining ${migrationFiles.length} migration files...\n`);

let combinedSQL = `-- Combined Migration Script for Remote Supabase Database
-- Generated: ${new Date().toISOString()}
-- Project: gakuwocsamrqcplrxvmh
--
-- Instructions:
-- 1. Go to Supabase Dashboard SQL Editor:
--    https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute all migrations
--
-- Note: Some migrations may have conflicts if tables already exist.
-- The scripts use "CREATE TABLE IF NOT EXISTS" and "ON CONFLICT" to handle this.
--

`;

migrationFiles.forEach((file, index) => {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  
  combinedSQL += `-- ============================================================================\n`;
  combinedSQL += `-- Migration ${index + 1}/${migrationFiles.length}: ${file}\n`;
  combinedSQL += `-- ============================================================================\n\n`;
  combinedSQL += content;
  combinedSQL += `\n\n`;
  
  console.log(`  ✅ Added: ${file}`);
});

fs.writeFileSync(outputFile, combinedSQL);

console.log(`\n✅ Combined migrations written to: ${outputFile}\n`);
console.log(`📝 Next steps:`);
console.log(`   1. Go to: https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql`);
console.log(`   2. Copy the contents of: supabase/all_migrations_combined.sql`);
console.log(`   3. Paste and run in SQL Editor\n`);

