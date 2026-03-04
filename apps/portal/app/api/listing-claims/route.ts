import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { withRateLimit } from "@/middleware/api-rate-limit";

export const dynamic = "force-dynamic";

function getAdminClientOrNull(): ReturnType<typeof createAdminClient> | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function handler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const listingId = typeof body?.listingId === "string" ? body.listingId : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const website = typeof body?.website === "string" ? body.website.trim() : "";
    const googleBusinessUrl =
      typeof body?.googleBusinessUrl === "string" ? body.googleBusinessUrl.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    const inviteToken = typeof body?.inviteToken === "string" ? body.inviteToken.trim() : "";

    if (!listingId || !email || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "listingId, email, and phone are required" },
        },
        { status: 400 }
      );
    }

    const adminClient = getAdminClientOrNull();
    if (!adminClient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message: "Claims are not configured in this environment",
          },
        },
        { status: 503 }
      );
    }

    const { data: listing } = await adminClient
      .from("listings")
      .select("id, owner_id, title")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } },
        { status: 404 }
      );
    }

    if ((listing as { owner_id?: string | null }).owner_id === user.id) {
      return NextResponse.json({
        success: true,
        data: {
          alreadyOwned: true,
          message: "You already own this listing",
        },
      });
    }

    const [{ data: activeClaim }, { data: existingMembership }] = await Promise.all([
      adminClient
        .from("listing_claims")
        .select("id, status")
        .eq("listing_id", listingId)
        .eq("claimant_user_id", user.id)
        .in("status", ["draft", "submitted", "provisional"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("listing_members")
        .select("id")
        .eq("listing_id", listingId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    if (existingMembership) {
      return NextResponse.json({
        success: true,
        data: {
          alreadyMember: true,
          message: "You already have access to this listing",
        },
      });
    }

    if (activeClaim) {
      return NextResponse.json({
        success: true,
        data: {
          claimId: (activeClaim as { id: string }).id,
          status: (activeClaim as { status: string }).status,
          message: "An active claim already exists",
        },
      });
    }

    let inviteId: string | null = null;
    if (inviteToken) {
      const tokenHash = createHash("sha256").update(inviteToken).digest("hex");
      const { data: invite } = await (adminClient.from("listing_claim_invites" as any) as any)
        .select("id, email")
        .eq("listing_id", listingId)
        .eq("token_hash", tokenHash)
        .eq("status", "sent")
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!invite) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVITE_INVALID", message: "Claim invite is invalid or expired" },
          },
          { status: 400 }
        );
      }

      if (
        (invite as { email?: string | null }).email &&
        String((invite as { email: string }).email).toLowerCase() !== email.toLowerCase()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVITE_EMAIL_MISMATCH",
              message: "Use the same email address that received this invite",
            },
          },
          { status: 400 }
        );
      }

      inviteId = (invite as { id: string }).id;
    }

    const nowIso = new Date().toISOString();
    const verification = {
      contact: {
        email,
        phone,
        website: website || null,
        googleBusinessUrl: googleBusinessUrl || null,
      },
      checks: {
        emailOtpVerified: false,
        phoneOtpVerified: false,
        businessMatchPending: true,
      },
      submittedAt: nowIso,
    };

    const { data: claim, error: claimError } = await (adminClient
      .from("listing_claims" as any) as any)
      .insert({
        listing_id: listingId,
        claimant_user_id: user.id,
        status: "provisional",
        verification,
        evidence: [],
        review_notes: notes || null,
        submitted_at: nowIso,
      })
      .select("id, status")
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLAIM_CREATE_FAILED",
            message: claimError?.message || "Failed to create listing claim",
          },
        },
        { status: 500 }
      );
    }

    const { error: membershipError } = await (adminClient
      .from("listing_members" as any) as any)
      .upsert(
        {
          listing_id: listingId,
          user_id: user.id,
          role: "admin",
          permissions: ["listings.write", "bookings.read", "bookings.write", "reviews.write"],
          status: "active",
        },
        { onConflict: "listing_id,user_id" }
      );

    if (membershipError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROVISIONAL_ACCESS_FAILED",
            message: membershipError.message,
          },
        },
        { status: 500 }
      );
    }

    if (inviteId) {
      await (adminClient.from("listing_claim_invites" as any) as any)
        .update({
          status: "used",
          used_at: nowIso,
          used_by_user_id: user.id,
        })
        .eq("id", inviteId);
    }

    return NextResponse.json({
      success: true,
      data: {
        claimId: (claim as { id: string }).id,
        status: (claim as { status: string }).status,
        listingTitle: (listing as { title?: string }).title || "Listing",
      },
    });
  } catch (error) {
    console.error("[POST /api/listing-claims] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to submit listing claim" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, "/api/listing-claims");
