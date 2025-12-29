import Link from "next/link";
import { searchKnowledgeBase } from "@/lib/kb/search";
import TenantBreadcrumbs from "@/components/tenant/TenantBreadcrumbs";

type Props = {
  searchParams?: { q?: string };
};

export default async function KnowledgeBasePage({ searchParams }: Props) {
  const query = searchParams?.q ? String(searchParams.q) : "";
  const results = await searchKnowledgeBase(query, { limit: 12 });

  return (
    <div className="space-y-6">
      <TenantBreadcrumbs
        items={[
          { label: "Knowledge Base", href: "/knowledge-base" },
          { label: "Articles", href: "/knowledge-base" },
        ]}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Knowledge Base
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Search existing articles and external sources. The AI Assistant uses these for grounding.
            </p>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
            Connected to AI
          </div>
        </div>

        <form method="get" className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Search the knowledge base
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search articles, FAQs, playbooks..."
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            No knowledge base entries yet. Add content in your database or S3, then re-run the search.
          </div>
        ) : (
          results.map((item) => (
            <Link
              href={`/knowledge-base/${encodeURIComponent(item.id)}`}
              key={`${item.source}-${item.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700/60"
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <span>{item.source}</span>
                {item.score ? <span className="text-[11px] text-gray-400">score {item.score.toFixed(2)}</span> : null}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
                {item.snippet}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {item.source}
                </span>
                {item.tags?.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

