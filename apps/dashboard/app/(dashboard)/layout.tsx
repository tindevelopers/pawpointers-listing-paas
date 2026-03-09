"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { Suspense } from "react";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "xl:ml-[290px]"
      : "xl:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <Backdrop />
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <div className="px-4 pt-3 pb-6 mx-auto max-w-7xl md:px-6 md:pt-4 md:pb-6">{children}</div>
      </div>
    </div>
  );
}
