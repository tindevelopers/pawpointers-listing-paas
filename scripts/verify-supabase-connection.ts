#!/usr/bin/env tsx

/**
 * Script to verify Supabase connection
 * Run with: npx tsx scripts/verify-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvVar(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    log(`❌ ${name} is not set`, 'red');
    return null;
  }
  log(`✅ ${name} is set`, 'green');
  return value;
}

async function verifyConnection() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║     Supabase Connection Verification                   ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝\n', 'blue');

  // Check environment variables
  log('Checking environment variables...\n', 'yellow');
  
  const supabaseUrl = checkEnvVar('NEXT_PUBLIC_SUPABASE_URL') || 
                      checkEnvVar('SUPABASE_URL');
  const anonKey = checkEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
                  checkEnvVar('SUPABASE_ANON_KEY');
  const serviceKey = checkEnvVar('SUPABASE_SERVICE_ROLE_KEY') || 
                     checkEnvVar('SUPABASE_SERVICE_KEY');

  if (!supabaseUrl || !anonKey) {
    log('\n❌ Missing required environment variables', 'red');
    log('\nPlease create .env.local with:', 'yellow');
    log('  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url', 'yellow');
    log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key', 'yellow');
    log('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key', 'yellow');
    process.exit(1);
  }

  // Test connection with anon key
  log('\nTesting connection with anon key...\n', 'yellow');
  try {
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await anonClient.from('users').select('count').limit(1);
    
    if (error) {
      log(`❌ Connection failed: ${error.message}`, 'red');
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        log('\n⚠️  Database tables may not exist. Run migrations first:', 'yellow');
        log('  Local: supabase db reset', 'yellow');
        log('  Cloud: Run migrations from supabase/migrations/', 'yellow');
      }
    } else {
      log('✅ Successfully connected to Supabase', 'green');
      log(`   URL: ${supabaseUrl}`, 'blue');
    }
  } catch (error) {
    log(`❌ Connection error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    process.exit(1);
  }

  // Test admin connection if service key is available
  if (serviceKey) {
    log('\nTesting admin connection with service role key...\n', 'yellow');
    try {
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data, error } = await adminClient.from('users').select('count').limit(1);
      
      if (error) {
        log(`⚠️  Admin connection issue: ${error.message}`, 'yellow');
      } else {
        log('✅ Admin connection successful', 'green');
      }
    } catch (error) {
      log(`⚠️  Admin connection error: ${error instanceof Error ? error.message : String(error)}`, 'yellow');
    }
  } else {
    log('\n⚠️  Service role key not set (admin operations may fail)', 'yellow');
  }

  // Check for common tables
  log('\nChecking database tables...\n', 'yellow');
  const tables = ['users', 'tenants', 'roles'];
  const anonClient = createClient(supabaseUrl, anonKey);
  
  for (const table of tables) {
    try {
      const { error } = await anonClient.from(table).select('id').limit(1);
      if (error) {
        log(`❌ Table '${table}' not found or not accessible`, 'red');
      } else {
        log(`✅ Table '${table}' exists`, 'green');
      }
    } catch (error) {
      log(`❌ Error checking table '${table}': ${error instanceof Error ? error.message : String(error)}`, 'red');
    }
  }

  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║     Verification Complete                              ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝\n', 'blue');
}

verifyConnection().catch((error) => {
  log(`\n❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`, 'red');
  process.exit(1);
});


