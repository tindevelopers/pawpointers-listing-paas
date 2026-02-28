import { isPlatformAdmin } from "@/app/actions/organization-admins";
import { isStaffAuthEnabled, requireSystemAdmin } from "@/app/actions/staff-auth";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminControlPlaneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If Staff Supabase is configured, treat this area as System Admin-only.
  if (isStaffAuthEnabled()) {
    try {
      await requireSystemAdmin();
      return <>{children}</>;
    } catch {
      redirect("/signin");
    }
  }

  let authorized = false;
  try {
    authorized = await isPlatformAdmin();
  } catch {
    redirect("/signin");
  }

  if (!authorized) {
    redirect("/signin");
  }

  return <>{children}</>;
}

