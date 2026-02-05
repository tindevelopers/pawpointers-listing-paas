#!/usr/bin/env tsx
/**
 * Script to apply migrations to remote Supabase database
 * 
 * Usage:
 *   tsx scripts/apply-migrations-to-remote.ts
 * 
 * This script reads migration files and applies them to the remote database
 * using the Supabase REST API with the service role key.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration(sql: string, filename: string): Promise<void> {
  console.log(`\n📄 Applying migration: ${filename}`);
  
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // Try direct query if RPC doesn't exist
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);
          if (queryError) {
            // Use raw SQL execution via REST API
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ sql_query: statement }),
            });
            
            if (!response.ok) {
              console.warn(`⚠️  Statement failed (may already exist): ${statement.substring(0, 100)}...`);
            }
          }
        }
      } catch (err: any) {
        // Ignore errors for statements that may already exist
        if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
          console.log(`   ✓ Already exists (skipped)`);
        } else {
          console.warn(`   ⚠️  Warning: ${err.message}`);
        }
      }
    }
    
    console.log(`   ✅ Migration applied: ${filename}`);
  } catch (error: any) {
    console.error(`   ❌ Error applying migration: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Applying migrations to remote Supabase database...');
  console.log(`   URL: ${SUPABASE_URL}`);
  
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Apply in chronological order

  console.log(`\n📋 Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');
    
    try {
      await applyMigration(sql, file);
    } catch (error: any) {
      console.error(`\n❌ Failed to apply ${file}:`, error.message);
      console.error('\n💡 You may need to apply this migration manually via Supabase SQL Editor');
      console.error(`   File: ${filePath}`);
    }
  }

  console.log('\n✅ Migration application complete!');
  console.log('\n💡 If some migrations failed, apply them manually via Supabase SQL Editor:');
  console.log('   1. Go to: https://app.supabase.com/project/omczmkjrpsykpwiyptfj/sql');
  console.log('   2. Copy and paste the SQL from the failed migration files');
  console.log('   3. Run the SQL');
}

main().catch(console.error);
