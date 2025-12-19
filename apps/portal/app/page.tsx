import type { Metadata } from "next";
import ConsumerLayout from "@/layout/ConsumerLayout";

export const metadata: Metadata = {
  title: "SaaS Platform - Welcome",
  description: "Welcome to our SaaS platform",
};

export default function HomePage() {
  return (
    <ConsumerLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          Welcome to SaaS Platform
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          This is the consumer-facing portal. Content optimized for SEO and user experience.
        </p>
      </div>
    </ConsumerLayout>
  );
}

