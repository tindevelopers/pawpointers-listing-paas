import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import {
  getKnowledgeDocument,
  getKnowledgeDocuments,
} from "@/lib/knowledge-base";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { HelpfulButton } from "@/components/knowledge-base/HelpfulButton";

interface KnowledgeDocumentPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: KnowledgeDocumentPageProps): Promise<Metadata> {
  const doc = await getKnowledgeDocument(params.id);

  if (!doc) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: `${doc.title} - Knowledge Base`,
    description: doc.excerpt || doc.content.slice(0, 160),
  };
}

export default async function KnowledgeDocumentPage({
  params,
}: KnowledgeDocumentPageProps) {
  const doc = await getKnowledgeDocument(params.id);

  if (!doc) {
    notFound();
  }

  // Get related documents (same category)
  const relatedDocs = doc.category
    ? await getKnowledgeDocuments({
        category: doc.category,
        limit: 5,
        sortBy: "view_count",
        sortOrder: "desc",
      })
    : { documents: [] };

  const related = relatedDocs.documents.filter((d) => d.id !== doc.id).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          {/* Back Button */}
          <Link
            href="/knowledge-base"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-8 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Knowledge Base
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <article className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                {/* Header */}
                <div className="mb-6">
                  {doc.category && (
                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
                      {doc.category}
                    </span>
                  )}
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    {doc.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{doc.view_count.toLocaleString()} views</span>
                    {doc.helpful_count > 0 && (
                      <span>{doc.helpful_count} found this helpful</span>
                    )}
                    <span>
                      Updated {new Date(doc.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {doc.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/knowledge-base?tag=${encodeURIComponent(tag)}`}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div
                  className="prose prose-lg dark:prose-invert max-w-none mb-8"
                  dangerouslySetInnerHTML={{
                    __html: doc.content
                      .split("\n")
                      .map((para) => `<p>${para}</p>`)
                      .join(""),
                  }}
                />

                {/* Helpful Button */}
                <HelpfulButton documentId={doc.id} />
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-4">
                {/* Related Articles */}
                {related.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Related Articles
                    </h2>
                    <ul className="space-y-3">
                      {related.map((relatedDoc) => (
                        <li key={relatedDoc.id}>
                          <Link
                            href={`/knowledge-base/${relatedDoc.id}`}
                            className="block text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {relatedDoc.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

