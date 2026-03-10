import { createAdminClient } from "@/core/database/admin-client";

const DEFAULT_CALCOM_API_BASE = "https://api.cal.com";
const CALCOM_TEAM_EVENTTYPE_API_VERSION = "2024-06-14";
const VALID_TENANT_PLANS = ["starter", "professional", "enterprise", "custom"] as const;
type TenantPlan = (typeof VALID_TENANT_PLANS)[number];

type CalComTeam = {
  id: number;
  slug?: string;
  name?: string;
};

type EnsureCalComIntegrationResult = {
  integrationId?: string;
  provisioned: boolean;
  skipped: boolean;
  reason?: string;
};

function normalizeCalComBaseUrl(baseUrl?: string): string {
  const base = (baseUrl || DEFAULT_CALCOM_API_BASE).replace(/\/+$/, "");
  return base.endsWith("/v2") ? base : `${base}/v2`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);
}

function extractNumericId(payload: unknown): number | null {
  const candidates = [
    payload,
    (payload as { data?: unknown } | null)?.data,
    (payload as { team?: unknown } | null)?.team,
    (payload as { eventType?: unknown } | null)?.eventType,
    (payload as { data?: { team?: unknown } } | null)?.data?.team,
    (payload as { data?: { eventType?: unknown } } | null)?.data?.eventType,
  ];

  for (const candidate of candidates) {
    const id = (candidate as { id?: unknown } | null)?.id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string") {
      const parsed = parseInt(id, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

async function calComRequest<T>(
  method: string,
  path: string,
  apiKey: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${normalizeCalComBaseUrl(process.env.CALCOM_PLATFORM_API_BASE_URL)}${
    path.startsWith("/") ? path : `/${path}`
  }`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "cal-api-version": CALCOM_TEAM_EVENTTYPE_API_VERSION,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cal.com API error (${res.status}): ${text || "Unknown error"}`);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function createCalComTeam(apiKey: string, teamName: string, teamSlug: string): Promise<CalComTeam> {
  const payload = {
    name: teamName,
    slug: teamSlug,
  };
  const response = await calComRequest<Record<string, unknown>>("POST", "/teams", apiKey, payload);
  const teamId = extractNumericId(response);
  if (!teamId) {
    throw new Error("Cal.com create team response missing team id");
  }

  return {
    id: teamId,
    slug:
      (response as { slug?: string; team?: { slug?: string }; data?: { slug?: string; team?: { slug?: string } } })
        ?.slug ||
      (response as { team?: { slug?: string } })?.team?.slug ||
      (response as { data?: { slug?: string; team?: { slug?: string } } })?.data?.slug ||
      (response as { data?: { team?: { slug?: string } } })?.data?.team?.slug ||
      teamSlug,
    name: teamName,
  };
}

async function createDefaultEventType(
  apiKey: string,
  teamId: number,
  title: string,
  slug: string
): Promise<number> {
  const basePayload = {
    title,
    slug,
    lengthInMinutes: 30,
  };

  const attempts: Array<Record<string, unknown>> = [
    { ...basePayload, teamId },
    { ...basePayload, team: { id: teamId } },
    { ...basePayload, teamIds: [teamId] },
  ];

  let lastError: unknown;
  for (const payload of attempts) {
    try {
      const response = await calComRequest<Record<string, unknown>>(
        "POST",
        "/event-types",
        apiKey,
        payload
      );
      const eventTypeId = extractNumericId(response);
      if (eventTypeId) return eventTypeId;
      lastError = new Error("Cal.com create event type response missing event type id");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to create default Cal.com event type");
}

export function deriveTenantPlanFromBillingPlan(planName?: string | null): TenantPlan | null {
  const normalized = String(planName || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;

  if ((VALID_TENANT_PLANS as readonly string[]).includes(normalized)) {
    return normalized as TenantPlan;
  }

  if (/\bcustom\b/.test(normalized)) return "custom";
  if (/\benterprise\b|\bpremium\b/.test(normalized)) return "enterprise";
  if (/\bprofessional\b|\bpro\b/.test(normalized)) return "professional";
  if (/\bstarter\b|\bbase\b|\bbasic\b|\bfree\b/.test(normalized)) return "starter";

  return null;
}

export function planGrantsBookingsFeature(planName?: string | null): boolean {
  const normalizedPlan = deriveTenantPlanFromBillingPlan(planName);
  return (
    normalizedPlan === "professional" ||
    normalizedPlan === "enterprise" ||
    normalizedPlan === "custom"
  );
}

export async function syncTenantPlanFromBillingPlan(
  tenantId: string,
  billingPlanName?: string | null
): Promise<void> {
  const normalizedPlan = deriveTenantPlanFromBillingPlan(billingPlanName);
  if (!normalizedPlan) {
    return;
  }

  const adminClient = createAdminClient();
  await (adminClient.from("tenants") as any)
    .update({ plan: normalizedPlan })
    .eq("id", tenantId);
}

export async function ensureCalComIntegrationForTenant(
  tenantId: string,
  tenantName?: string
): Promise<EnsureCalComIntegrationResult> {
  const apiKey = process.env.CALCOM_PLATFORM_API_KEY?.trim();
  if (!apiKey) {
    return { provisioned: false, skipped: true, reason: "CALCOM_PLATFORM_API_KEY not configured" };
  }

  const adminClient = createAdminClient();
  const { data: existing } = await (adminClient
    .from("booking_provider_integrations") as any)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", "calcom")
    .eq("active", true)
    .is("listing_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const existingId = (existing || [])[0] as { id?: string } | undefined;
  if (existingId?.id) {
    return { integrationId: existingId.id, provisioned: false, skipped: true, reason: "already_exists" };
  }

  let resolvedTenantName = tenantName;
  if (!resolvedTenantName) {
    const { data: tenantRow } = await adminClient
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();
    resolvedTenantName = (tenantRow as { name?: string } | null)?.name || undefined;
  }

  const safeTenantName = resolvedTenantName?.trim() || `Tenant ${tenantId.slice(0, 8)}`;
  const baseSlug = slugify(safeTenantName) || "tenant";
  const suffix = tenantId.replace(/-/g, "").slice(0, 6).toLowerCase();
  const teamSlug = slugify(`${baseSlug}-${suffix}`) || `tenant-${suffix}`;
  const defaultEventTitle = `${safeTenantName} Booking`;
  const defaultEventSlug = slugify(`${baseSlug}-booking`) || `booking-${suffix}`;

  const team = await createCalComTeam(apiKey, safeTenantName, teamSlug);
  const eventTypeId = await createDefaultEventType(
    apiKey,
    team.id,
    defaultEventTitle,
    defaultEventSlug
  );

  const { data: inserted, error: insertError } = await (adminClient
    .from("booking_provider_integrations") as any)
    .insert({
      tenant_id: tenantId,
      user_id: null,
      listing_id: null,
      provider: "calcom",
      credentials: { apiKey },
      settings: {
        calTeamId: String(team.id),
        calTeamSlug: team.slug || teamSlug,
        calEventTypeId: String(eventTypeId),
      },
      active: true,
      metadata: {
        source: "subscription-upgrade",
        createdBy: "system",
      },
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to save Cal.com integration: ${insertError.message}`);
  }

  return {
    integrationId: (inserted as { id: string }).id,
    provisioned: true,
    skipped: false,
  };
}
