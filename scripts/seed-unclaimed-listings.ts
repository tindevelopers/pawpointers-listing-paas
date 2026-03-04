/**
 * Seed unclaimed listings for testing the claim flow.
 * Run: npx tsx scripts/seed-unclaimed-listings.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).");
  console.error("Ensure .env.local exists at project root with these values.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SAMPLE_LISTINGS = [
  { title: "Elite Dog Training Academy", slug: "elite-dog-training-academy", category: "Pet Services" },
  { title: "Happy Paws Grooming", slug: "happy-paws-grooming", category: "Pet Grooming" },
  { title: "City Veterinary Clinic", slug: "city-veterinary-clinic", category: "Veterinary" },
  { title: "Paws & Claws Pet Store", slug: "paws-claws-pet-store", category: "Pet Retail" },
  { title: "Bark & Play Daycare", slug: "bark-play-daycare", category: "Pet Care Services" },
  { title: "Furry Friends Boarding", slug: "furry-friends-boarding", category: "Pet Care Services" },
  { title: "Wellness Pet Spa", slug: "wellness-pet-spa", category: "Pet Grooming" },
  { title: "Rescue Haven Adoption Center", slug: "rescue-haven-adoption", category: "Rescue & Community" },
  { title: "Puppy Prep Academy", slug: "puppy-prep-academy", category: "Pet Services" },
  { title: "Natural Pet Nutrition Co", slug: "natural-pet-nutrition-co", category: "Pet Retail" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function main() {
  console.log("Checking for unclaimed listings...\n");

  const { data: existing, error: listError } = await supabase
    .from("listings")
    .select("id, title, slug, owner_id, status")
    .is("owner_id", null)
    .eq("status", "published");

  if (listError) {
    console.error("Error querying listings:", listError.message);
    process.exit(1);
  }

  const unclaimed = (existing || []).filter((r) => !(r as { owner_id?: string }).owner_id);
  console.log(`Found ${unclaimed.length} unclaimed published listings.`);

  if (unclaimed.length >= 10) {
    console.log("\nAlready have enough unclaimed listings. No insert needed.");
    unclaimed.slice(0, 5).forEach((l, i) => console.log(`  ${i + 1}. ${(l as { title: string }).title} (/${(l as { slug: string }).slug})`));
    return;
  }

  const { data: tenants } = await supabase.from("tenants").select("id").limit(1);
  const tenantId = tenants?.[0]?.id || null;
  if (!tenantId) {
    console.error("No tenant found. Create a tenant first (e.g. run create-tenant script).");
    process.exit(1);
  }

  const toInsert = 10 - unclaimed.length;
  console.log(`\nInserting ${toInsert} unclaimed listings...`);

  const now = new Date().toISOString();
  const inserted: { title: string; slug: string }[] = [];

  for (const sample of SAMPLE_LISTINGS) {
    if (inserted.length >= toInsert) break;

    const slug = slugify(sample.slug || sample.title);
    const { data: conflict } = await supabase
      .from("listings")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .maybeSingle();

    if (conflict) continue;

    const { data: row, error } = await supabase
      .from("listings")
      .insert({
        tenant_id: tenantId,
        owner_id: null,
        title: sample.title,
        slug,
        description: `${sample.title} provides quality pet services. Claim this listing to manage your business profile.`,
        status: "published",
        published_at: now,
        custom_fields: {
          category: sample.category,
          email: `contact@${slug.replace(/-/g, "")}.local`,
          phone: "(555) 123-4567",
          website: `${slug}.example.com`,
        },
        address: {
          street: "123 Main St",
          city: "San Francisco",
          region: "CA",
          country: "US",
        },
      })
      .select("id, title, slug")
      .single();

    if (error) {
      console.error(`Failed to insert ${sample.title}:`, error.message);
      continue;
    }
    inserted.push({ title: (row as { title: string }).title, slug: (row as { slug: string }).slug });
    console.log(`  + ${(row as { title: string }).title} -> /listings/${(row as { slug: string }).slug}`);
  }

  console.log(`\nDone. Inserted ${inserted.length} unclaimed listings.`);
  console.log("\nVisit the Portal (e.g. http://localhost:3030), sign in, and open any listing above to see 'Claim this business'.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
