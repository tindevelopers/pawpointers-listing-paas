import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import {
  getKnowledgeDocuments,
  getKnowledgeCategories,
  type KnowledgeDocument,
} from "@/lib/knowledge-base";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Knowledge Base - Help & Support",
  description: "Browse our knowledge base for answers to common questions and helpful guides.",
};

interface KnowledgeBasePageProps {
  searchParams: {
    search?: string;
    category?: string;
    tag?: string;
    page?: string;
  };
}

export default async function KnowledgeBasePage({
  searchParams,
}: KnowledgeBasePageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const { documents, total, totalPages } = await getKnowledgeDocuments({
    page,
    limit: 20,
    search: searchParams.search,
    category: searchParams.category,
    tag: searchParams.tag,
    sortBy: "updated_at",
    sortOrder: "desc",
  });

  const categories = await getKnowledgeCategories();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl lg:text-5xl font-bold mb-4">
                Knowledge Base
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Find answers to common questions and helpful guides
              </p>

              {/* Search Bar */}
              <form
                action="/knowledge-base"
                method="get"
                className="max-w-2xl mx-auto"
              >
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="search"
                    defaultValue={searchParams.search}
                    placeholder="Search articles..."
                    className="w-full h-12 pl-12 pr-4 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </form>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-4">
                {/* Categories */}
                {categories.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Categories
                    </h2>
                    <ul className="space-y-2">
                      <li>
                        <Link
                          href="/knowledge-base"
                          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            !searchParams.category
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          All ({total})
                        </Link>
                      </li>
                      {categories.map((cat) => (
                        <li key={cat.name}>
                          <Link
                            href={`/knowledge-base?category=${encodeURIComponent(cat.name)}`}
                            className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                              searchParams.category === cat.name
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                          >
                            {cat.name} ({cat.count})
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {documents.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No articles found. Try adjusting your search or filters.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-8">
                    {documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/knowledge-base/${doc.id}`}
                        className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                              {doc.title}
                            </h3>
                            {doc.excerpt && (
                              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                {doc.excerpt}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              {doc.category && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                                  {doc.category}
                                </span>
                              )}
                              <span>{doc.view_count} views</span>
                              {doc.helpful_count > 0 && (
                                <span>{doc.helpful_count} helpful</span>
                              )}
                              <span>
                                {new Date(doc.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      {page > 1 && (
                        <Link
                          href={`/knowledge-base?page=${page - 1}${
                            searchParams.search
                              ? `&search=${encodeURIComponent(searchParams.search)}`
                              : ""
                          }${
                            searchParams.category
                              ? `&category=${encodeURIComponent(searchParams.category)}`
                              : ""
                          }`}
                          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Previous
                        </Link>
                      )}
                      <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                        Page {page} of {totalPages}
                      </span>
                      {page < totalPages && (
                        <Link
                          href={`/knowledge-base?page=${page + 1}${
                            searchParams.search
                              ? `&search=${encodeURIComponent(searchParams.search)}`
                              : ""
                          }${
                            searchParams.category
                              ? `&category=${encodeURIComponent(searchParams.category)}`
                              : ""
                          }`}
                          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Next
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

