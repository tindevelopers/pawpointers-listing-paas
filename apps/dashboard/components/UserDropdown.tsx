"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/core/database/client";
import { UserCircleIcon } from "@heroicons/react/24/outline";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            email: authUser.email ?? undefined,
            full_name: authUser.user_metadata?.full_name ?? authUser.email ?? undefined,
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await signOut();
      router.push("/signin");
      router.refresh();
    } catch {
      router.push("/signin");
      router.refresh();
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
      >
        <UserCircleIcon className="w-8 h-8 text-orange-500" />
        <span className="hidden sm:block text-sm font-medium">
          {loading ? "..." : user?.full_name || user?.email || "Account"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {loading ? "..." : user?.full_name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {loading ? "" : user?.email || ""}
            </p>
          </div>
          <Link
            href="/profile?tab=profile"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700"
          >
            Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
