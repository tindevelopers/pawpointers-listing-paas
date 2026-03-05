"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import MemberSignupForm from "@/components/auth/MemberSignupForm";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Paw Pointers";

function MemberSignUpContent() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const userSignupHref = `/signup/user${query ? `?${query}` : ""}`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Become a Service Provider
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Join {PLATFORM_NAME} and start offering your services to customers
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
            <MemberSignupForm />
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Looking to book services?{" "}
                <Link
                  href={userSignupHref}
                  className="text-blue-600 hover:text-blue-500 font-medium dark:text-blue-400"
                >
                  Sign up as a customer
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function MemberSignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
        <Footer />
      </div>
    }>
      <MemberSignUpContent />
    </Suspense>
  );
}
