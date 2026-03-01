import "@/app/globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { WhiteLabelProvider } from "@/context/WhiteLabelContext";
import { TenantProvider } from "@tinadmin/core/multi-tenancy";
import React from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <TenantProvider>
          <WhiteLabelProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </WhiteLabelProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
