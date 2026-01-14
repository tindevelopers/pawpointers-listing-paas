import { redirect } from "next/navigation";
import { createClient } from "@/core/database/server";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: tenantRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const tenantId = (tenantRow as any)?.tenant_id ?? null;

  const subscriptionsResult =
    tenantId === null
      ? { data: [] }
      : await supabase
          .from("stripe_subscriptions")
          .select("id, status, stripe_price_id, created_at, cancel_at_period_end")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

  const invoicesResult =
    tenantId === null
      ? { data: [] }
      : await supabase
          .from("stripe_invoices")
          .select("id, total, status, hosted_invoice_url, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(10);

  const subscriptions = subscriptionsResult.data || [];
  const invoices = invoicesResult.data || [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-600">
          View subscription status and recent invoices for your tenant.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No subscriptions found.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {(subscriptions as any[]).map((sub: any) => (
              <div
                key={sub.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {sub.stripe_price_id || "Plan"}
                </p>
                <p className="text-xs text-gray-500">
                  Status: {sub.status} · Created:{" "}
                  {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "—"}
                </p>
                {sub.cancel_at_period_end ? (
                  <p className="mt-1 text-xs text-amber-600">Cancels at period end</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No invoices found.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {(invoices as any[]).map((inv: any) => (
              <div
                key={inv.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="text-sm font-semibold text-gray-900">
                  Total: {inv.total ? `$${(inv.total / 100).toFixed(2)}` : "—"}
                </p>
                <p className="text-xs text-gray-500">
                  Status: {inv.status} · Date:{" "}
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                </p>
                {inv.hosted_invoice_url ? (
                  <a
                    href={inv.hosted_invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    View invoice
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

