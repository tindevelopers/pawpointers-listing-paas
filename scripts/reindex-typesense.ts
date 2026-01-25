#!/usr/bin/env tsx
/**
 * Bulk Reindex Script for Typesense
 * 
 * Reindexes all listings from Supabase to Typesense.
 * 
 * Usage:
 *   pnpm tsx scripts/reindex-typesense.ts
 * 
 * Environment variables required:
 *   - TYPESENSE_API_KEY
 *   - TYPESENSE_HOST
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient } from '@tinadmin/core/database/admin-client';
import { syncListings, initializeCollection } from '@listing-platform/search';

async function main() {
  console.log('Starting Typesense reindex...');

  // Check environment variables
  if (!process.env.TYPESENSE_API_KEY || !process.env.TYPESENSE_HOST) {
    console.error('Error: TYPESENSE_API_KEY and TYPESENSE_HOST must be set');
    process.exit(1);
  }

  try {
    // Initialize collection
    console.log('Initializing Typesense collection...');
    await initializeCollection();
    console.log('Collection initialized');

    // Fetch all active/published listings
    console.log('Fetching listings from Supabase...');
    const supabase = createAdminClient();
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .in('status', ['active', 'published']);

    if (error) {
      throw new Error(`Failed to fetch listings: ${error.message}`);
    }

    if (!listings || listings.length === 0) {
      console.log('No listings to index');
      return;
    }

    console.log(`Found ${listings.length} listings to index`);

    // Sync in batches
    const BATCH_SIZE = 100;
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      console.log(`Syncing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} listings)...`);
      
      const result = await syncListings(batch);
      totalSuccess += result.success;
      totalFailed += result.failed;
      
      console.log(`Batch complete: ${result.success} succeeded, ${result.failed} failed`);
    }

    console.log(`\nReindex complete!`);
    console.log(`Total: ${totalSuccess} succeeded, ${totalFailed} failed`);
  } catch (error) {
    console.error('Reindex failed:', error);
    process.exit(1);
  }
}

main();


