"use client";

import Link from "next/link";
import { Navbar } from "./Navbar";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";
const PLATFORM_INITIAL = PLATFORM_NAME.charAt(0).toUpperCase() || "P";

/**
 * Header - Main site header component
 *
 * CUSTOMIZE: Update logo, navigation, and branding for your platform
 */

// CUSTOMIZE: Import brand config when available
// import { brandConfig } from '@/config/brand.config';

interface HeaderProps {
  className?: string;
}

export function Header({ className = "" }: HeaderProps) {
  return (
    <header
      className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${className}`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {/* CUSTOMIZE: Update logo */}
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">{PLATFORM_INITIAL}</span>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">
              {/* CUSTOMIZE: Platform name from config */}
              {PLATFORM_NAME}
            </span>
          </Link>

          {/* Navigation */}
          <Navbar />

          {/* Auth / User Actions */}
          <div className="flex items-center gap-4">
            {/* CUSTOMIZE: Add user authentication state */}
            <Link
              href="/signin"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
