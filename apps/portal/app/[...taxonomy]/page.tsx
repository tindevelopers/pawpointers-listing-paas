import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamicImport from 'next/dynamic';
import { getBuilderContent } from '@/lib/builder';
import { builderConfig } from '@/builder.config';

// Dynamically import BuilderComponent to prevent build-time errors
const BuilderComponent = dynamicImport(
  () => import('@/components/builder/BuilderComponent').then(mod => ({ default: mod.BuilderComponent }))
);
import { Header, Footer } from "@/components/layout";
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
 * Combined Catch-All Route
 * 
 * Handles both Builder.io pages and taxonomy-based URLs:
 * 
 * Route priority:
 * 1. Builder.io content (if exists and API key configured)
 * 2. Taxonomy routes (existing functionality)
 * 
 * Taxonomy URLs:
 * - Industry: /{profession}/{slug} (e.g., /lawyers/john-doe-law)
 * - Location: /{country}/{region}/{city}/{slug} (e.g., /usa/california/sf/property-123)
 * - Hybrid: /{category}/{location}/{slug} (e.g., /water-sports/miami/jet-ski-rental)
 */

interface TaxonomyPageProps {
  params: Promise<{ taxonomy: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Force dynamic rendering to prevent build-time errors with Builder.io
export const dynamic = 'force-dynamic';
// ISR Configuration - revalidate every 60 seconds (only applies if dynamic is not force-dynamic)
// export const revalidate = 60;

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
  searchParams,
}: TaxonomyPageProps): Promise<Metadata> {
  const { taxonomy } = await params;
  const resolvedSearchParams = await searchParams;
  const path = '/' + taxonomy.join('/');

  // Check Builder.io first if API key is configured
  // Skip during build to prevent errors with Builder.io React dependencies
  if (builderConfig.apiKey && !process.env.VERCEL) {
    try {
      const builderContent = await getBuilderContent(path, {
        preview: builderConfig.preview || resolvedSearchParams.preview === 'true',
      });

      if (builderContent) {
        return {
          title: builderContent.data?.title || 'Builder.io Page',
          description: builderContent.data?.description || '',
        };
      }
    } catch (error) {
      // Fall through to taxonomy metadata if Builder.io fails
      console.warn('Builder.io metadata fetch failed:', error);
    }
  }

  // Fall back to taxonomy metadata
  const config = await getTaxonomyConfig();
  const parsedPath = parseTaxonomyPath(taxonomy, config);
  
  // Check if this is a listing or a category page
  const listing = await getListingByTaxonomyPath(parsedPath);
  
  if (listing) {
    // It's a listing - generate listing metadata
    return generateSEOMetadata(listing as unknown as Record<string, unknown>, config, parsedPath);
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
 * Disabled when dynamic = 'force-dynamic' to prevent build-time errors
 */
// export async function generateStaticParams() {
//   try {
//     const paths = await getPopularTaxonomyPaths(1000);
//     return paths.map((path) => ({ taxonomy: path }));
//   } catch (error) {
//     console.error("Error generating static params:", error);
//     return [];
//   }
// }

export default async function TaxonomyPage({ params, searchParams }: TaxonomyPageProps) {
  const { taxonomy } = await params;
  const resolvedSearchParams = await searchParams;
  const path = '/' + taxonomy.join('/');

  // Priority 1: Check Builder.io first (if API key is configured)
  if (builderConfig.apiKey) {
    try {
      const builderContent = await getBuilderContent(path, {
        preview: builderConfig.preview || resolvedSearchParams.preview === 'true',
      });

      if (builderContent) {
        // Render Builder.io page
        return (
          <BuilderComponent
            content={builderContent}
            options={{
              preview: builderConfig.preview || resolvedSearchParams.preview === 'true',
            }}
          />
        );
      }
    } catch (error) {
      // Fall through to taxonomy routing if Builder.io fails
      console.warn('Builder.io content fetch failed:', error);
    }
  }

  // Priority 2: Fall back to taxonomy routing
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
