import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { SearchResults } from "@/components/search";
import { getListingsByCategory, getCategories } from "@/lib/listings";

/**
 * Category Listings Page
 *
 * CUSTOMIZE: Add category-specific layouts, featured listings, or subcategories
 */

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryName = category.replace(/-/g, " ");

  return {
    // CUSTOMIZE: Update title format for your vertical
    title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Listings | Listing Platform`,
    description: `Browse all ${categoryName} listings. Find the best ${categoryName} options available.`,
  };
}

// Generate static paths for common categories
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((cat) => ({ category: cat.slug }));
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { category } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  // Fetch listings for this category
  const { listings, total, totalPages } = await getListingsByCategory(
    category,
    page,
    12
  );

  // Get all categories for sidebar/navigation
  const categories = await getCategories();
  const currentCategory = categories.find((c) => c.slug === category);
  const categoryName = currentCategory?.name || category.replace(/-/g, " ");

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
                href="/categories"
                className="hover:text-gray-700 dark:hover:text-gray-200"
              >
                Categories
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white capitalize">
              {categoryName}
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 capitalize">
            {categoryName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {total} listing{total !== 1 ? "s" : ""} found in this category
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Category List */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                Categories
              </h2>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/listings"
                    className="block px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    All Listings
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/categories/${cat.slug}`}
                      className={`block px-3 py-2 rounded-lg transition-colors ${
                        cat.slug === category
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {cat.name}
                      <span className="text-gray-400 dark:text-gray-500 ml-2">
                        ({cat.count})
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main Content - Listings */}
          <div className="lg:col-span-3">
            <SearchResults
              listings={listings}
              total={total}
              page={page}
              totalPages={totalPages}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
