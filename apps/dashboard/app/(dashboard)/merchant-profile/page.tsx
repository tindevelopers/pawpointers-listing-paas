import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, tenant: null };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const tenantId = (userRow as any)?.tenant_id ?? null;
  let tenant = null;

  if (tenantId) {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenantId)
      .maybeSingle();
    tenant = tenantRow;
  }

  return { user, tenant };
}

export default async function MerchantProfilePage() {
  const { user, tenant } = await getContext();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Merchant Profile</h1>
        <p className="text-sm text-gray-600">
          Manage your business profile and contact information.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
        <p className="mt-2 text-sm text-gray-600">
          {tenant ? (
            <>Tenant: {(tenant as any).name || (tenant as any).slug || "—"}</>
          ) : (
            "Your account is not linked to a tenant. Contact support to set up your merchant profile."
          )}
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Full merchant profile editing (business name, description, contact details) will be available in a future update.
        </p>
      </div>
    </div>
  );
}
