import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/core/database/server";
import { Header, Footer } from "@/components/layout";
import {
  UserCircleIcon,
  MapPinIcon,
  CalendarDaysIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  BookOpenIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Failed to fetch user", error.message);
    return null;
  }
  return data.user;
}

function DashboardCard({
  href,
  icon: Icon,
  title,
  description,
  children,
  accent = "warm",
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: "warm" | "cyan";
}) {
  const wrapperClass =
    "group rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900/80 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-orange-200 dark:hover:border-orange-900/50";
  const iconBg =
    accent === "warm"
      ? "bg-[rgb(var(--warm-primary-light))] dark:bg-orange-950/50 text-[rgb(var(--warm-primary))]"
      : "bg-[rgb(var(--accent-secondary-light))] dark:bg-cyan-950/50 text-[rgb(var(--accent-secondary))]";

  const content = (
    <>
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}
      <div className="space-y-2">{children}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${wrapperClass}`}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect("/signin");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-950/80 dark:to-gray-900">
      <Header />

      <main className="flex-1">
        {/* Hero / Welcome */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--warm-primary-light))]/40 via-transparent to-cyan-50/30 dark:from-orange-950/20 dark:to-transparent pointer-events-none" />
          <div className="relative mx-auto max-w-5xl px-6 py-12 sm:py-16">
            <div className="animate-slideInUp space-y-3">
              <p className="text-sm font-medium text-[rgb(var(--warm-primary))] dark:text-orange-400">
                Member Dashboard
              </p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="max-w-xl text-lg text-gray-600 dark:text-gray-300">
                Your space for pet-friendly finds. Quick access to your account,
                saved favorites, and activity.
              </p>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="relative mx-auto max-w-5xl px-6 pb-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="animate-slideInUp">
              <DashboardCard
                icon={UserCircleIcon}
                title="Account"
                description="Your profile and contact info"
                accent="warm"
              >
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <li className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Email</span>
                    <span className="font-medium">{user.email}</span>
                  </li>
                  {user.user_metadata?.full_name && (
                    <li className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Name</span>
                      <span className="font-medium">
                        {user.user_metadata.full_name}
                      </span>
                    </li>
                  )}
                </ul>
              </DashboardCard>
            </div>

            <div className="animate-slideInUp">
              <DashboardCard
                icon={MapPinIcon}
                title="Explore"
                description="Discover pet-friendly spots"
                accent="cyan"
              >
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/listings"
                      className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--accent-secondary))] dark:text-cyan-400 hover:underline"
                    >
                      <Squares2X2Icon className="h-4 w-4" />
                      Browse listings
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/search"
                      className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--accent-secondary))] dark:text-cyan-400 hover:underline"
                    >
                      <MagnifyingGlassIcon className="h-4 w-4" />
                      Search
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/categories"
                      className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--accent-secondary))] dark:text-cyan-400 hover:underline"
                    >
                      <BookOpenIcon className="h-4 w-4" />
                      Categories
                    </Link>
                  </li>
                </ul>
              </DashboardCard>
            </div>

            <div className="animate-slideInUp sm:col-span-2 lg:col-span-1">
              <DashboardCard
                icon={HeartIcon}
                title="Your activity"
                description="Bookings and reviews"
                accent="warm"
              >
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/account/bookings"
                      className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--warm-primary))] dark:text-orange-400 hover:underline"
                    >
                      <CalendarDaysIcon className="h-4 w-4" />
                      My Bookings
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/account/reviews"
                      className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--warm-primary))] dark:text-orange-400 hover:underline"
                    >
                      <StarIcon className="h-4 w-4" />
                      My Reviews
                    </Link>
                  </li>
                </ul>
              </DashboardCard>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
