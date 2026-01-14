import Link from "next/link";
import type { FeaturedAccount } from "@/lib/accounts";

interface AccountCardProps {
  account: FeaturedAccount;
}

export function AccountCard({ account }: AccountCardProps) {
  const planColors: Record<string, string> = {
    starter: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pro: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  const planColor = planColors[account.plan] || planColors.starter;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      {/* Avatar/Logo */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          {account.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
            {account.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            @{account.domain}
          </p>
        </div>
      </div>

      {/* Description */}
      {account.description && (
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {account.description}
        </p>
      )}

      {/* Plan Badge */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planColor}`}
        >
          {account.plan.charAt(0).toUpperCase() + account.plan.slice(1)} Plan
        </span>
        <Link
          href={`/accounts/${account.domain}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

