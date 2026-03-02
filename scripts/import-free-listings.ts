import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

type ImportRow = {
  externalId?: string;
  title: string;
  slug?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  category?: string;
  address?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.replace("--", "");
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    i += 1;
  }
  return result;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  baseSlug: string
) {
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

async function main() {
  const args = parseArgs();
  const tenantId = String(args.tenantId || "");
  const sourceName = String(args.source || "");
  const inputPath = String(args.input || "");
  const dryRun = Boolean(args.dryRun);

  if (!tenantId || !sourceName || !inputPath) {
    console.error(
      "Usage: npx tsx scripts/import-free-listings.ts --tenantId <uuid> --source <sourceName> --input <file.json> [--dryRun]"
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const raw = readFileSync(resolve(process.cwd(), inputPath), "utf-8");
  const rows = JSON.parse(raw) as ImportRow[];

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const nowIso = new Date().toISOString();

  for (const row of rows) {
    if (!row.title?.trim()) {
      skipped += 1;
      continue;
    }

    const externalId = row.externalId?.trim() || row.slug?.trim() || slugify(row.title);
    const { data: existingSource } = await (supabase.from("listing_sources" as any) as any)
      .select("id, listing_id")
      .eq("source_name", sourceName)
      .eq("external_id", externalId)
      .maybeSingle();

    const baseSlug = slugify(row.slug || row.title);
    const customFields = {
      email: row.email || null,
      phone: row.phone || null,
      website: row.website || null,
      source_name: sourceName,
      source_external_id: externalId,
    };

    if (existingSource?.listing_id) {
      if (!dryRun) {
        await (supabase.from("listings") as any)
          .update({
            title: row.title,
            description: row.description || null,
            custom_fields: customFields,
            address: row.address || null,
            updated_at: nowIso,
          })
          .eq("id", existingSource.listing_id);

        await (supabase.from("listing_sources" as any) as any)
          .update({
            metadata: row.metadata || {},
            last_synced_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", existingSource.id);
      }
      updated += 1;
      continue;
    }

    const slug = await ensureUniqueSlug(supabase, tenantId, baseSlug || `listing-${Date.now()}`);
    if (!dryRun) {
      const { data: listing, error: listingError } = await (supabase.from("listings") as any)
        .insert({
          tenant_id: tenantId,
          owner_id: null,
          title: row.title,
          slug,
          description: row.description || null,
          status: "published",
          published_at: nowIso,
          custom_fields: customFields,
          address: row.address || null,
        })
        .select("id")
        .single();

      if (listingError || !listing) {
        console.error(`Failed to insert listing "${row.title}":`, listingError?.message);
        skipped += 1;
        continue;
      }

      await (supabase.from("listing_sources" as any) as any).insert({
        listing_id: listing.id,
        tenant_id: tenantId,
        source_name: sourceName,
        external_id: externalId,
        metadata: row.metadata || {},
        first_seen_at: nowIso,
        last_synced_at: nowIso,
      });
    }

    inserted += 1;
  }

  console.log("Import complete.");
  console.log(`Source: ${sourceName}`);
  console.log(`Tenant: ${tenantId}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
