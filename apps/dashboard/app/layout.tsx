import "@/app/globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ListingScopeProvider } from "@/context/ListingScopeContext";
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
            <ListingScopeProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </ListingScopeProvider>
          </WhiteLabelProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
