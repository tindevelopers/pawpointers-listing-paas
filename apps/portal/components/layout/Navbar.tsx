"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navbar - Main navigation component
 *
 * CUSTOMIZE: Update navigation items for your platform
 */

interface NavItem {
  href: string;
  label: string;
}

interface NavbarProps {
  className?: string;
}

// CUSTOMIZE: Update navigation items for your vertical
const NAV_ITEMS: NavItem[] = [
  { href: "/listings", label: "Browse" },
  { href: "/search", label: "Search" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  // CUSTOMIZE: Add more navigation items
  // { href: '/agents', label: 'Find Agents' },
  // { href: '/pricing', label: 'Pricing' },
];

export function Navbar({ className = "" }: NavbarProps) {
  const pathname = usePathname();

  return (
    <nav className={`hidden md:flex items-center gap-6 ${className}`}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default Navbar;
