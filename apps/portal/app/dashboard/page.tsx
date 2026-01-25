import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

async function getUser() {
  const cookieStore = await cookies();

  // Supabase client that respects auth cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // No-op for server component
        },
        remove() {
          // No-op for server component
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Failed to fetch user", error.message);
    return null;
  }
  return data.user;
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Member Dashboard</p>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Welcome back, {user.email}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Quick access to your account, saved items, and activity.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 p-4 shadow-sm">
          <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
            Account
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <li>Email: {user.email}</li>
            {user.user_metadata?.full_name && (
              <li>Name: {user.user_metadata.full_name}</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 p-4 shadow-sm">
          <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
            Shortcuts
          </h2>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li>
              <a href="/listings" className="hover:underline">
                Browse listings
              </a>
            </li>
            <li>
              <a href="/search" className="hover:underline">
                Search
              </a>
            </li>
            <li>
              <a href="/categories" className="hover:underline">
                Categories
              </a>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 p-4 shadow-sm">
          <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
            Coming soon
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Saved items, bookings, and messages will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

