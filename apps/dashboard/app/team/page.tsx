import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: current } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const tenantId = (current as any)?.tenant_id ?? null;

  const membersResult =
    tenantId === null
      ? { data: [] }
      : await supabase
          .from("users")
          .select("id, email, full_name, role_id, roles:role_id(name)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true });

  const members = membersResult.data || [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Team</h1>
        <p className="text-sm text-gray-600">
          View team members for your tenant. Contact platform support to add or change roles.
        </p>
      </header>

      {tenantId === null ? (
        <p className="text-sm text-gray-600">
          Your account is not linked to a tenant. Contact support to be assigned.
        </p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-600">No team members found.</p>
      ) : (
        <div className="grid gap-3">
          {(members as any[]).map((member: any) => (
            <div
              key={member.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {member.full_name || member.email}
                  </p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {(member.roles as any)?.name || "Member"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

