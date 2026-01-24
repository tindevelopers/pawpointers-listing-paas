"use client";

import Link from "next/link";
import MemberSignupForm from "@/components/auth/MemberSignupForm";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";
const PLATFORM_INITIAL = PLATFORM_NAME.charAt(0).toUpperCase() || "P";

export default function MemberSignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
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

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Join as a Service Provider
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            Offer your services through {PLATFORM_NAME}
          </p>

          <MemberSignupForm />

          {/* Switch to User Signup */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Looking to book services?{" "}
              <Link
                href="/signup/user"
                className="text-blue-600 hover:text-blue-500 font-medium dark:text-blue-400"
              >
                Sign up as a customer
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

