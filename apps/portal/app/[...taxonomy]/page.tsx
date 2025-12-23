import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { ListingDetail } from "@/components/listings";
import { TaxonomyBreadcrumb } from "@/components/taxonomy/TaxonomyBreadcrumb";
import { TaxonomyListing } from "@/components/taxonomy/TaxonomyListing";
import { CategoryPage } from "@/components/taxonomy/CategoryPage";
import { 
  getListingByTaxonomyPath, 
  getTaxonomyTerm,
  getListingsByTaxonomyTerm,
  getPopularTaxonomyPaths 
} from "@/lib/taxonomy";
import { getTaxonomyConfig, parseTaxonomyPath, generateSEOMetadata } from "@/lib/taxonomy-config";

/**
 * Dynamic Taxonomy Routing
 * 
 * Handles all taxonomy-based URLs:
 * - Industry: /{profession}/{slug} (e.g., /lawyers/john-doe-law)
 * - Location: /{country}/{region}/{city}/{slug} (e.g., /usa/california/sf/property-123)
 * - Hybrid: /{category}/{location}/{slug} (e.g., /water-sports/miami/jet-ski-rental)
 * 
 * This page determines whether to render:
 * 1. A category/taxonomy term page (list of listings)
 * 2. A single listing detail page
 */

interface TaxonomyPageProps {
  params: Promise<{ taxonomy: string[] }>;
}

// ISR Configuration - revalidate every 60 seconds
export const revalidate = 60;

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: TaxonomyPageProps): Promise<Metadata> {
  const { taxonomy } = await params;
  const config = await getTaxonomyConfig();
  const parsedPath = parseTaxonomyPath(taxonomy, config);
  
  // Check if this is a listing or a category page
  const listing = await getListingByTaxonomyPath(parsedPath);
  
  if (listing) {
    // It's a listing - generate listing metadata
    return generateSEOMetadata(listing, config, parsedPath);
  }
  
  // It's a category/taxonomy term page
  const term = await getTaxonomyTerm(parsedPath);
  
  if (term) {
    return {
      title: `${term.name} | ${config.name}`,
      description: term.description || `Browse ${term.name} listings`,
      openGraph: {
        title: term.name,
        description: term.description || `Browse ${term.name} listings`,
        type: "website",
      },
    };
  }
  
  return {
    title: "Not Found",
    description: "The requested page could not be found.",
  };
}

/**
 * Generate static paths for SSG
 * Pre-generates popular listings and taxonomy terms at build time
 */
export async function generateStaticParams() {
  try {
    const paths = await getPopularTaxonomyPaths(1000);
    return paths.map((path) => ({ taxonomy: path }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default async function TaxonomyPage({ params }: TaxonomyPageProps) {
  const { taxonomy } = await params;
  const config = await getTaxonomyConfig();
  const parsedPath = parseTaxonomyPath(taxonomy, config);
  
  // First, try to find a listing with this exact path
  const listing = await getListingByTaxonomyPath(parsedPath);
  
  if (listing) {
    // Render listing detail page
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <TaxonomyBreadcrumb
            path={parsedPath}
            config={config}
            currentTitle={listing.title}
          />
          <TaxonomyListing listing={listing} config={config} />
        </main>
        <Footer />
      </div>
    );
  }
  
  // Check if this is a taxonomy term (category) page
  const term = await getTaxonomyTerm(parsedPath);
  
  if (term) {
    // Get listings for this taxonomy term
    const { listings, total, page, totalPages } = await getListingsByTaxonomyTerm(
      parsedPath,
      { page: 1, limit: 12 }
    );
    
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <TaxonomyBreadcrumb path={parsedPath} config={config} />
          <CategoryPage
            term={term}
            listings={listings}
            config={config}
            pagination={{ total, page, totalPages }}
          />
        </main>
        <Footer />
      </div>
    );
  }
  
  // Nothing found - 404
  notFound();
}

