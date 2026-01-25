"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "PawPointers";
const PLATFORM_INITIAL = PLATFORM_NAME.charAt(0).toUpperCase() || "P";

/**
 * Sign Up Selection Page
 * Allows users to choose between consumer signup and service provider signup
 */
export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">{PLATFORM_INITIAL}</span>
            </div>
            <span className="font-bold text-2xl text-gray-900 dark:text-white">
              {PLATFORM_NAME}
            </span>
          </Link>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consumer Signup Card */}
          <div
            onClick={() => router.push("/signup/user")}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                I'm a Customer
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Sign up to book appointments, access knowledge base, and get member benefits
              </p>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                Sign Up as Customer
              </button>
            </div>
          </div>

          {/* Service Provider Signup Card */}
          <div
            onClick={() => router.push("/signup/member")}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                I'm a Service Provider
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Join as a provider to offer services, manage bookings, and grow your business
              </p>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                Sign Up as Provider
              </button>
            </div>
          </div>
        </div>

        {/* Sign In Link */}
        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-blue-600 hover:text-blue-500 font-medium dark:text-blue-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
