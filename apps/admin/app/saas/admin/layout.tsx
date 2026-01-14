"use server";

import { isPlatformAdmin } from "@/app/actions/organization-admins";
import { redirect } from "next/navigation";
import React from "react";

export default async function AdminControlPlaneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorized = await isPlatformAdmin();

  if (!authorized) {
    redirect("/signin");
  }

  return <>{children}</>;
}

