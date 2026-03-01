"use client";

import { useSidebar } from "@/context/SidebarContext";
import UserDropdown from "@/components/UserDropdown";
import Link from "next/link";
import React from "react";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-b border-gray-200 z-[9999]">
      <div className="flex items-center justify-between w-full gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            className={`flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 ${
              isMobileOpen ? "bg-gray-100" : ""
            }`}
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.22 7.28a.75.75 0 011.06-1.06L12 10.94l4.72-4.72a.75.75 0 111.06 1.06L13.06 12l4.72 4.72a.75.75 0 11-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 01-1.06-1.06L10.94 12 6.22 7.28z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583 1a.75.75 0 01.75-.75h14.334a.75.75 0 010 1.5H1.333a.75.75 0 01-.75-.75zm0 5a.75.75 0 01.75-.75h14.334a.75.75 0 010 1.5H1.333a.75.75 0 01-.75-.75zm0 5a.75.75 0 01.75-.75h7.334a.75.75 0 010 1.5H1.333a.75.75 0 01-.75-.75z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
          <Link
            href="/dashboard"
            className="xl:hidden text-lg font-semibold text-gray-900"
          >
            Pawpointers Dashboard
          </Link>
        </div>
        <UserDropdown />
      </div>
    </header>
  );
};

export default AppHeader;
