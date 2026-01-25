import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import { notFound } from "next/navigation";

type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  category?: string | null;
  tags?: string[] | null;
  source_type: string;
  metadata?: Record<string, unknown> | null;
  view_count?: number;
  helpful_count?: number;
  created_at?: string;
  updated_at?: string;
};

async function getDocument(id: string): Promise<KnowledgeDocument | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3031";
  const res = await fetch(`${baseUrl}/api/knowledge-base/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return body?.data ?? null;
}

export default async function KnowledgeBaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const doc = await getDocument(params.id);
  if (!doc) {
    return notFound();
  }

  const metadata = doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const sourceFileName =
    metadata && typeof metadata === "object" && "source_file_name" in metadata
      ? String((metadata as Record<string, unknown>).source_file_name)
      : null;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Knowledge Base" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            {doc.title}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Detailed document view
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/saas/support/knowledge-base">
            <Button variant="outline">Back to list</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Metadata
          </h3>
          <div className="mt-3 space-y-2 text-sm text-gray-800 dark:text-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Source</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {doc.source_type}
              </span>
            </div>
            {sourceFileName && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">File</span>
                <span className="truncate text-right text-gray-800 dark:text-gray-200">
                  {sourceFileName}
                </span>
              </div>
            )}
            {doc.category && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Category</span>
                <span className="text-gray-800 dark:text-gray-200">{doc.category}</span>
              </div>
            )}
            {doc.tags && doc.tags.length > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Tags</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Views</span>
              <span className="text-gray-800 dark:text-gray-200">
                {(doc.view_count ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Helpful</span>
              <span className="text-gray-800 dark:text-gray-200">
                {(doc.helpful_count ?? 0).toLocaleString()}
              </span>
            </div>
            {doc.updated_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Updated</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {new Date(doc.updated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Content</h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
            {doc.content}
          </div>
        </div>
      </div>
    </div>
  );
}


