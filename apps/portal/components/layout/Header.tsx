"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "./Navbar";
import { createClient } from "@/core/database/client";
import { signOut } from "@/app/actions/auth";
import type { User } from "@supabase/supabase-js";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "PawPointers";
const PLATFORM_INITIAL = PLATFORM_NAME.charAt(0).toUpperCase() || "P";

/**
 * Header - Main site header component
 *
 * CUSTOMIZE: Update logo, navigation, and branding for your platform
 */

interface HeaderProps {
  className?: string;
}

export function Header({ className = "" }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser ?? null);
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    user?.email ||
    "Account";

  return (
    <header
      className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${className}`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">{PLATFORM_INITIAL}</span>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">
              {PLATFORM_NAME}
            </span>
          </Link>

          {/* Navigation */}
          <Navbar />

          {/* Auth / User Actions */}
          <div className="flex items-center gap-4">
            {loading ? (
              <span className="text-sm text-gray-400 dark:text-gray-500">...</span>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
                >
                  {displayName}
                </Link>
                <Link
                  href="/dashboard"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm"
                >
                  Dashboard
                </Link>
                <form action={signOut} className="inline">
                  <button
                    type="submit"
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/pricing"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
