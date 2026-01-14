/**
 * Script to check if listings exist in Supabase
 * Run with: npx tsx apps/portal/scripts/check-listings.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkListings() {
  console.log('🔍 Checking Supabase connection and listings...\n');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Anon Key:', SUPABASE_ANON_KEY!.substring(0, 20) + '...\n');

  try {
    // 1. Check if listings table exists and has data
    console.log('1️⃣ Checking listings table...');
    const { data: listingsData, error: listingsError, count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (listingsError) {
      console.error('❌ Error querying listings table:', listingsError.message);
      console.error('   Code:', listingsError.code);
      console.error('   Details:', listingsError.details);
    } else {
      console.log(`✅ Listings table accessible. Total count: ${count || 0}`);
      if (listingsData && listingsData.length > 0) {
        console.log(`   Found ${listingsData.length} listings (showing first 5):`);
        listingsData.forEach((listing, i) => {
          console.log(`   ${i + 1}. ID: ${listing.id}, Title: ${listing.title || 'N/A'}, Status: ${listing.status || 'N/A'}`);
        });
      } else {
        console.log('   ⚠️  No listings found in the table');
      }
    }

    // 2. Check published listings specifically
    console.log('\n2️⃣ Checking published listings...');
    const { data: publishedData, error: publishedError, count: publishedCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .limit(5);

    if (publishedError) {
      console.error('❌ Error querying published listings:', publishedError.message);
    } else {
      console.log(`✅ Published listings count: ${publishedCount || 0}`);
      if (publishedData && publishedData.length > 0) {
        console.log(`   Found ${publishedData.length} published listings:`);
        publishedData.forEach((listing, i) => {
          console.log(`   ${i + 1}. ${listing.title || 'N/A'} (slug: ${listing.slug || 'N/A'})`);
        });
      } else {
        console.log('   ⚠️  No published listings found');
      }
    }

    // 3. Check public_listings_view
    console.log('\n3️⃣ Checking public_listings_view...');
    const { data: viewData, error: viewError, count: viewCount } = await supabase
      .from('public_listings_view')
      .select('*', { count: 'exact' })
      .limit(5);

    if (viewError) {
      console.error('❌ Error querying public_listings_view:', viewError.message);
      console.error('   Code:', viewError.code);
      console.error('   Details:', viewError.details);
      console.error('   Hint: The view might not exist. Check if migration 20250110000000_create_public_listings_view.sql was run.');
    } else {
      console.log(`✅ public_listings_view accessible. Total count: ${viewCount || 0}`);
      if (viewData && viewData.length > 0) {
        console.log(`   Found ${viewData.length} listings in view:`);
        viewData.forEach((listing, i) => {
          console.log(`   ${i + 1}. ${listing.title || 'N/A'} (status: ${listing.status || 'N/A'})`);
        });
      } else {
        console.log('   ⚠️  No listings found in view');
      }
    }

    // 4. Check all listing statuses
    console.log('\n4️⃣ Checking listing statuses...');
    const { data: statusData, error: statusError } = await supabase
      .from('listings')
      .select('status')
      .limit(100);

    if (!statusError && statusData) {
      const statusCounts: Record<string, number> = {};
      statusData.forEach((item) => {
        const status = item.status || 'null';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('   Status distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - Total listings: ${count || 0}`);
    console.log(`   - Published listings: ${publishedCount || 0}`);
    console.log(`   - Listings in view: ${viewCount || 0}`);
    
    if ((viewCount || 0) === 0) {
      console.log('\n⚠️  No listings found in public_listings_view.');
      console.log('   This could mean:');
      console.log('   1. No listings exist in the database');
      console.log('   2. No listings have status = "published"');
      console.log('   3. The public_listings_view was not created');
      console.log('   4. RLS policies are blocking access');
    } else {
      console.log('\n✅ Listings are available!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

checkListings().catch(console.error);

