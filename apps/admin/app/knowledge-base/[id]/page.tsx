import { notFound } from "next/navigation";
import Link from "next/link";
import { getKnowledgeBaseItem } from "@/lib/kb/search";
import TenantBreadcrumbs from "@/components/tenant/TenantBreadcrumbs";

type Props = {
  params: { id: string };
};

export default async function KnowledgeBaseDetail({ params }: Props) {
  const article = await getKnowledgeBaseItem(decodeURIComponent(params.id));

  if (!article) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <TenantBreadcrumbs
        items={[
          { label: "Knowledge Base", href: "/knowledge-base" },
          { label: article.title, href: `/knowledge-base/${article.id}` },
        ]}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {article.source}
          </p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            {article.title}
          </h1>
        </div>
        {article.url ? (
          <Link
            href={article.url}
            target="_blank"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Open source
          </Link>
        ) : null}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <article className="prose max-w-none text-gray-800 dark:prose-invert dark:text-gray-100">
          <p className="whitespace-pre-wrap">{article.content}</p>
        </article>
      </div>

      {article.metadata ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
          <p className="font-semibold text-gray-800 dark:text-white">
            Metadata
          </p>
          <pre className="mt-2 overflow-x-auto text-xs text-gray-700 dark:text-gray-200">
            {JSON.stringify(article.metadata, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}


