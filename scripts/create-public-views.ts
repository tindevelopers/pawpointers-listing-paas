import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", SUPABASE_URL ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createViews() {
  console.log("📝 Creating public views...");

  const migrationSQL = `
-- =============================================================================
-- Create Public Views for Portal
-- =============================================================================

CREATE OR REPLACE VIEW public_listings_view AS
SELECT 
  l.id,
  l.slug,
  l.title,
  l.description,
  l.price,
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(l.gallery)
    ),
    ARRAY[]::text[]
  ) as images,
  COALESCE(
    (SELECT tt.name 
     FROM listing_taxonomies lt
     JOIN taxonomy_terms tt ON lt.taxonomy_term_id = tt.id
     WHERE lt.listing_id = l.id 
       AND lt.is_primary = true
     LIMIT 1),
    l.custom_fields->>'category',
    'Uncategorized'
  ) as category,
  COALESCE(
    CONCAT_WS(', ',
      l.address->>'city',
      l.address->>'region',
      l.address->>'country'
    ),
    ''
  ) as location,
  CASE 
    WHEN l.status = 'published' THEN 'active'
    ELSE l.status
  END as status,
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

COMMENT ON VIEW public_listings_view IS 'Public-facing view of published listings for portal consumption';

CREATE OR REPLACE VIEW categories_view AS
SELECT
  LOWER(REPLACE(REPLACE(REPLACE(TRIM(category), ' ', '-'), '--', '-'), '/', '-')) as slug,
  TRIM(category) as name,
  COUNT(*) as count
FROM public_listings_view
WHERE category IS NOT NULL
  AND category != ''
  AND category != 'Uncategorized'
GROUP BY category
HAVING COUNT(*) > 0
ORDER BY name ASC;

GRANT SELECT ON categories_view TO anon;
GRANT SELECT ON categories_view TO authenticated;

COMMENT ON VIEW categories_view IS 'Public-facing view of categories with listing counts for portal consumption';
  `;

  try {
    // Execute the migration using RPC or direct SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // Try direct query execution
      console.log("⚠️  RPC method failed, trying direct execution...");
      // For Supabase, we need to use the REST API or connect directly
      // Let's use a workaround by executing via a function
      throw new Error(`Failed to execute migration: ${error.message}`);
    }

    console.log("✅ Public views created successfully!");
    return true;
  } catch (error: any) {
    console.error("❌ Error creating views:", error.message);
    
    // Try executing via pg directly
    console.log("📋 Please run this SQL manually in the Supabase Dashboard SQL Editor:");
    console.log("\n" + "=".repeat(80));
    console.log(migrationSQL);
    console.log("=".repeat(80) + "\n");
    
    return false;
  }
}

createViews()
  .then((success) => {
    if (!success) {
      console.log("\n💡 Tip: Copy the SQL above and run it in Supabase Dashboard > SQL Editor");
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

