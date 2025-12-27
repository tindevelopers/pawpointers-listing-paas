"use client";

import Link from "next/link";
import type { TaxonomyConfig, TaxonomyPath } from "@listing-platform/config";

interface TaxonomyBreadcrumbProps {
  path: TaxonomyPath;
  config: TaxonomyConfig;
  currentTitle?: string;
}

/**
 * Dynamic breadcrumb component that adapts to taxonomy configuration
 */
export function TaxonomyBreadcrumb({
  path,
  config: _config,
  currentTitle,
}: TaxonomyBreadcrumbProps) {
  const segments = (path._segments as unknown as string[]) || [];
  
  // Build breadcrumb items from segments
  const breadcrumbs: Array<{ label: string; href: string; active?: boolean }> = [
    { label: "Home", href: "/" },
  ];
  
  let currentPath = "";
  
  // Add taxonomy segments (all except the last one if there's a currentTitle)
  const taxonomySegments = currentTitle ? segments.slice(0, -1) : segments;
  
  for (let i = 0; i < taxonomySegments.length; i++) {
    const segment = taxonomySegments[i];
    currentPath += `/${segment}`;
    
    breadcrumbs.push({
      label: formatSegmentLabel(segment),
      href: currentPath,
      active: !currentTitle && i === taxonomySegments.length - 1,
    });
  }
  
  // Add current page title if provided
  if (currentTitle) {
    breadcrumbs.push({
      label: currentTitle,
      href: `/${segments.join("/")}`,
      active: true,
    });
  }
  
  return (
    <nav className="mb-6 text-sm" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-2 text-gray-500 dark:text-gray-400">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronIcon className="w-4 h-4 mx-2 text-gray-400 dark:text-gray-500" />
            )}
            {crumb.active ? (
              <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function formatSegmentLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default TaxonomyBreadcrumb;

