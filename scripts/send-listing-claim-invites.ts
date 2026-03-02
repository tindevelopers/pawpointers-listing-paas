import { config } from "dotenv";
import { resolve } from "path";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

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

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error (${response.status}): ${body}`);
  }
}

async function main() {
  const args = parseArgs();
  const tenantId = String(args.tenantId || "");
  const sourceName = args.source ? String(args.source) : null;
  const limit = Number(args.limit || 200);
  const dryRun = Boolean(args.dryRun);

  if (!tenantId) {
    console.error(
      "Usage: npx tsx scripts/send-listing-claim-invites.ts --tenantId <uuid> [--source <sourceName>] [--limit 200] [--dryRun]"
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const baseClaimUrl = (process.env.CLAIM_BASE_URL || "http://localhost:3030").replace(/\/$/, "");
  const resendApiKey = process.env.RESEND_API_KEY || "";
  const fromEmail = process.env.CLAIM_INVITE_FROM || "";

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let listingQuery = supabase
    .from("listings")
    .select("id, title, slug, custom_fields, owner_id, tenant_id")
    .eq("tenant_id", tenantId)
    .is("owner_id", null)
    .limit(limit)
    .order("created_at", { ascending: false });

  if (sourceName) {
    const { data: sourceRows } = await (supabase.from("listing_sources" as any) as any)
      .select("listing_id")
      .eq("tenant_id", tenantId)
      .eq("source_name", sourceName)
      .limit(limit);
    const listingIds = (sourceRows || []).map((row: { listing_id: string }) => row.listing_id);
    if (listingIds.length === 0) {
      console.log("No listings found for source filter.");
      return;
    }
    listingQuery = listingQuery.in("id", listingIds);
  }

  const { data: listings } = await listingQuery;

  let sent = 0;
  let skipped = 0;
  let errored = 0;

  for (const listing of listings || []) {
    const customFields = ((listing as any).custom_fields || {}) as Record<string, unknown>;
    const email = typeof customFields.email === "string" ? customFields.email.trim() : "";
    if (!email) {
      skipped += 1;
      continue;
    }

    const { data: existingInvite } = await (supabase.from("listing_claim_invites" as any) as any)
      .select("id")
      .eq("listing_id", (listing as any).id)
      .eq("email", email)
      .eq("status", "sent")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      skipped += 1;
      continue;
    }

    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const claimUrl = `${baseClaimUrl}/listings/${(listing as any).slug}?claim=${token}`;

    try {
      if (!dryRun) {
        await (supabase.from("listing_claim_invites" as any) as any).insert({
          listing_id: (listing as any).id,
          email,
          token_hash: tokenHash,
          expires_at: expiresAt,
          status: "sent",
          metadata: { source_name: sourceName || null },
        });

        if (resendApiKey && fromEmail) {
          await sendViaResend({
            apiKey: resendApiKey,
            from: fromEmail,
            to: email,
            subject: `Claim your business listing: ${(listing as any).title}`,
            html: `
              <p>Hello,</p>
              <p>We found your business in PawPointers and created a free listing.</p>
              <p><a href="${claimUrl}">Click here to claim your listing</a>.</p>
              <p>This link expires on ${new Date(expiresAt).toLocaleDateString()}.</p>
            `,
          });
        } else {
          console.log(`[preview only] ${email} -> ${claimUrl}`);
        }
      } else {
        console.log(`[dry-run] ${email} -> ${claimUrl}`);
      }

      sent += 1;
    } catch (error) {
      errored += 1;
      console.error(`Failed invite for ${(listing as any).id} (${email}):`, error);
    }
  }

  console.log("Claim invite run complete.");
  console.log(`Tenant: ${tenantId}`);
  console.log(`Source filter: ${sourceName || "none"}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);
  console.log(`Sent: ${sent}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errored}`);
}

main().catch((error) => {
  console.error("Invite run failed:", error);
  process.exit(1);
});
