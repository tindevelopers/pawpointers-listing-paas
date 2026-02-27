import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

async function getTenantOrFirst(): Promise<string | null> {
  const tenantId = await getCurrentTenant();
  if (tenantId) return tenantId;

  const adminClient = createAdminClient();
  const { data: tenants } = await adminClient
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  return (tenants?.[0] as { id: string } | undefined)?.id ?? null;
}

export async function GET(req: NextRequest) {
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

    const tenantId = await getTenantOrFirst();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No tenant found." } },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const requestedListingId = req.nextUrl.searchParams.get("listingId");

    const { data: integrations } = await adminClient
      .from("booking_provider_integrations")
      .select("id, listing_id, settings")
      .eq("tenant_id", tenantId)
      .eq("provider", "calcom")
      .eq("active", true)
      .order("created_at", { ascending: false });

    const integration =
      (integrations || []).find(
        (i: { listing_id?: string | null }) =>
          !!requestedListingId && i.listing_id === requestedListingId
      ) ??
      (integrations || []).find((i: { listing_id?: string | null }) => i.listing_id == null) ??
      (integrations || [])[0];

    if (!integration?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "No active Cal.com integration found. Connect Cal.com first.",
          },
        },
        { status: 400 }
      );
    }

    const { data: listings, error: listingsError } = await adminClient
      .from("listings")
      .select("id, title")
      .eq("tenant_id", tenantId)
      .order("title", { ascending: true });

    if (listingsError) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: listingsError.message } },
        { status: 500 }
      );
    }

    const selectedListingId =
      requestedListingId ||
      (integration.listing_id as string | null) ||
      (listings?.[0] as { id: string } | undefined)?.id ||
      null;

    if (!selectedListingId) {
      return NextResponse.json({
        success: true,
        data: {
          tenantId,
          integrationId: integration.id,
          listingId: null,
          listings: listings || [],
          eventTypes: [],
          teamMembers: [],
          mappings: [],
        },
      });
    }

    const { data: eventTypes, error: eventTypesError } = await adminClient
      .from("event_types")
      .select("id, name, slug, active")
      .eq("tenant_id", tenantId)
      .eq("listing_id", selectedListingId)
      .order("name", { ascending: true });

    if (eventTypesError) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: eventTypesError.message } },
        { status: 500 }
      );
    }

    const { data: teamMembers, error: teamError } = await adminClient
      .from("team_members")
      .select("id, user_id, event_type_ids, round_robin_enabled, calcom_user_id, calcom_username, calcom_calendar_connected, active")
      .eq("tenant_id", tenantId)
      .eq("listing_id", selectedListingId)
      .order("created_at", { ascending: true });

    if (teamError) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: teamError.message } },
        { status: 500 }
      );
    }

    const { data: mappings, error: mappingError } = await adminClient
      .from("service_booking_provider_mappings")
      .select("id, event_type_id, external_event_type_id, round_robin_enabled, active")
      .eq("tenant_id", tenantId)
      .eq("listing_id", selectedListingId)
      .eq("booking_provider_integration_id", integration.id);

    if (mappingError) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: mappingError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        integrationId: integration.id,
        listingId: selectedListingId,
        integrationSettings: integration.settings || {},
        listings: listings || [],
        eventTypes: eventTypes || [],
        teamMembers: teamMembers || [],
        mappings: mappings || [],
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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

    const tenantId = await getTenantOrFirst();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No tenant found." } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const listingId = body?.listingId as string | undefined;
    const integrationId = body?.integrationId as string | undefined;
    const teamMembers = (body?.teamMembers as Array<Record<string, unknown>> | undefined) || [];
    const mappings = (body?.mappings as Array<Record<string, unknown>> | undefined) || [];

    if (!listingId || !integrationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "listingId and integrationId are required.",
          },
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    for (const row of teamMembers) {
      const id = row.id as string | undefined;
      if (!id) continue;

      const eventTypeIds = Array.isArray(row.eventTypeIds)
        ? (row.eventTypeIds as string[])
        : [];

      const { error } = await adminClient
        .from("team_members")
        .update({
          event_type_ids: eventTypeIds,
          round_robin_enabled: !!row.roundRobinEnabled,
          calcom_user_id: (row.calcomUserId as string | undefined) || null,
          calcom_username: (row.calcomUsername as string | undefined) || null,
          calcom_calendar_connected: !!row.calcomCalendarConnected,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .eq("listing_id", listingId);

      if (error) {
        return NextResponse.json(
          { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
          { status: 500 }
        );
      }
    }

    const mappingRows = mappings
      .map((m) => ({
        tenant_id: tenantId,
        listing_id: listingId,
        booking_provider_integration_id: integrationId,
        event_type_id: (m.eventTypeId as string | undefined) || null,
        external_event_type_id: ((m.externalEventTypeId as string | undefined) || "").trim(),
        round_robin_enabled: (m.roundRobinEnabled as boolean | undefined) ?? true,
        active: (m.active as boolean | undefined) ?? true,
      }))
      .filter((m) => !!m.event_type_id && !!m.external_event_type_id);

    if (mappingRows.length > 0) {
      const { error } = await adminClient
        .from("service_booking_provider_mappings")
        .upsert(mappingRows, {
          onConflict: "booking_provider_integration_id,event_type_id",
        });
      if (error) {
        return NextResponse.json(
          { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
