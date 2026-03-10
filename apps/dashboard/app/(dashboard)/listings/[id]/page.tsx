import { createClient } from "@/core/database/server";
import { redirect, notFound } from "next/navigation";
import { canManageListing } from "@/lib/listing-access";
import { ListingEditorForm } from "../ListingEditorForm";

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  excerpt: string | null;
  status: string | null;
  price: number | null;
  currency: string | null;
  price_type: string | null;
  featured_image: string | null;
  video_url: string | null;
  address: Record<string, unknown> | null;
  custom_fields: Record<string, unknown> | null;
  booking_provider_id: string | null;
};

export default async function ListingEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const canManage = await canManageListing(user.id, id);
  if (!canManage) {
    notFound();
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      "id, title, slug, description, excerpt, status, price, currency, price_type, featured_image, video_url, address, custom_fields, booking_provider_id, tenant_id"
    )
    .eq("id", id)
    .single();

  if (error || !listing) {
    notFound();
  }

  const tenantId = (listing as { tenant_id?: string }).tenant_id;
  let bookingProviders: Array<{ id: string; provider: string }> = [];
  if (tenantId) {
    try {
      const { createAdminClient } = await import("@/core/database/admin-client");
      const adminClient = createAdminClient();
      const { data: integrations } = await adminClient
        .from("booking_provider_integrations")
        .select("id, provider")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("provider", { ascending: true });
      bookingProviders = (integrations || []) as Array<{ id: string; provider: string }>;
    } catch {
      // Admin client not available (e.g. no SUPABASE_SERVICE_ROLE_KEY)
    }
  }

  return (
    <div className="bg-[#f8fafc]">
      <ListingEditorForm
        listing={listing as ListingRow}
        bookingProviders={bookingProviders}
      />
    </div>
  );
}
