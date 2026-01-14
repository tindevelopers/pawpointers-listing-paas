import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { ListingDetail } from "@/components/listings";
import { getListingBySlug, getPopularListingSlugs } from "@/lib/listings";

/**
 * Listing Detail Page
 *
 * CUSTOMIZE: Update metadata generation and add schema.org structured data
 * for SEO optimization specific to your listing vertical.
 */

interface ListingPageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing) {
    return {
      title: "Listing Not Found",
    };
  }

  // CUSTOMIZE: Update meta description format for your vertical
  const description = listing.description?.slice(0, 160) || 
    `View details for ${listing.title}`;

  return {
    title: `${listing.title} | Paw Pointers`,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.images?.[0] ? [listing.images[0]] : [],
      type: "website",
    },
    // CUSTOMIZE: Add structured data for your listing type
    // For real estate: Product schema, RealEstateListing
    // For services: Service schema
    // For directory: LocalBusiness schema
  };
}

/**
 * ISR Configuration
 * Revalidate pages every 60 seconds
 */
export const revalidate = 60;

/**
 * Generate static paths for SSG
 * Pre-generates the top 500 most popular listings at build time
 * Other listings are generated on-demand with ISR
 */
export async function generateStaticParams() {
  try {
    // Fetch popular listings for SSG at build time
    const slugs = await getPopularListingSlugs(500);
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error generating static params:', error);
    // Return empty array - pages will be generated on-demand
    return [];
  }
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <li>
              <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-200">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href="/listings"
                className="hover:text-gray-700 dark:hover:text-gray-200"
              >
                Listings
              </Link>
            </li>
            {listing.category && (
              <>
                <li>/</li>
                <li>
                  <Link
                    href={`/categories/${listing.category}`}
                    className="hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {listing.category}
                  </Link>
                </li>
              </>
            )}
            <li>/</li>
            <li className="text-gray-900 dark:text-white truncate max-w-[200px]">
              {listing.title}
            </li>
          </ol>
        </nav>

        {/* Listing Detail */}
        <ListingDetail listing={listing} />
      </main>

      <Footer />
    </div>
  );
}
