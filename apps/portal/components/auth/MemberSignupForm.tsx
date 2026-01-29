"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpMember } from "@/app/actions/auth";

const DEFAULT_PROFESSIONS = [
  "Doctor",
  "Dentist",
  "Veterinarian",
  "Groomer",
  "Dog Walker",
  "Therapist",
  "Consultant",
  "Trainer",
  "Nutritionist",
  "Other",
];

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3031";

export default function MemberSignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profession, setProfession] = useState(DEFAULT_PROFESSIONS[0]);
  const [customProfession, setCustomProfession] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const finalProfession = profession === "Other" ? customProfession : profession;
    if (!finalProfession || finalProfession.trim().length < 2) {
      setError("Please select or enter your profession");
      return;
    }

    if (!agree) {
      setError("Please agree to the Terms and Conditions");
      return;
    }

    startTransition(async () => {
      try {
        await signUpMember({
          email,
          password,
          fullName,
          profession: finalProfession,
          businessName: businessName || undefined,
          phoneNumber: phoneNumber || undefined,
        });
        router.push(`${ADMIN_URL}/saas/dashboard`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to sign up";
        setError(message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div suppressHydrationWarning>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          required
          minLength={2}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
          suppressHydrationWarning
        />
      </div>

      <div suppressHydrationWarning>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="you@example.com"
          suppressHydrationWarning
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            suppressHydrationWarning
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Must be at least 8 characters
          </p>
        </div>
        <div suppressHydrationWarning>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            suppressHydrationWarning
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="profession"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Profession/Specialty <span className="text-red-500">*</span>
        </label>
        <select
          id="profession"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DEFAULT_PROFESSIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {profession === "Other" && (
          <input
            type="text"
            value={customProfession}
            onChange={(e) => setCustomProfession(e.target.value)}
            placeholder="Enter your profession"
            className="mt-2 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        )}
      </div>

      <div>
        <label
          htmlFor="businessName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Business Name <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your Business Name"
        />
      </div>

      <div>
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Phone Number <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <input
          id="phoneNumber"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+1 (555) 123-4567"
          suppressHydrationWarning
        />
      </div>

      <div className="flex items-start space-x-3">
        <input
          id="terms"
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          required
        />
        <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300">
          I agree to the{" "}
          <Link href="/terms" className="text-blue-600 hover:underline dark:text-blue-400">
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">
            Privacy Policy
          </Link>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        {isPending ? "Creating account..." : "Create Provider Account"}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link href="/signin" className="text-blue-600 hover:text-blue-500 font-medium dark:text-blue-400">
          Sign in
        </Link>
      </p>
    </form>
  );
}

