export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <header className="pb-4 border-b border-gray-200/90">
        <div className="skeleton-shimmer h-4 w-16 rounded" />
        <div className="skeleton-shimmer mt-3 h-8 w-64 rounded" />
        <div className="skeleton-shimmer mt-2 h-4 max-w-md rounded" />
      </header>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-shimmer h-[88px] p-4 rounded-[14px]">
            <div className="h-4 w-20 rounded bg-gray-300/60" />
            <div className="mt-3 h-9 w-12 rounded bg-gray-300/60" />
          </div>
        ))}
      </div>

      {/* Quick start skeleton */}
      <section className="rounded-[14px] border border-gray-200 bg-gray-50/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="skeleton-shimmer h-5 w-24 rounded" />
            <div className="skeleton-shimmer mt-2 h-4 max-w-sm rounded" />
          </div>
          <div className="skeleton-shimmer h-10 w-28 rounded-[14px]" />
        </div>
        <ol className="mt-5 space-y-2.5 pl-5">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-gray-400">{i}.</span>
              <div className="skeleton-shimmer h-4 flex-1 max-w-xs rounded" />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
