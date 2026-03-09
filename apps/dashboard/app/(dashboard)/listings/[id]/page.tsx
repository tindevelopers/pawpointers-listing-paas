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
      "id, title, slug, description, excerpt, status, price, currency, price_type, featured_image, video_url, address, custom_fields"
    )
    .eq("id", id)
    .single();

  if (error || !listing) {
    notFound();
  }

  return (
    <div className="bg-[#f8fafc]">
      <ListingEditorForm listing={listing as ListingRow} />
    </div>
  );
}
