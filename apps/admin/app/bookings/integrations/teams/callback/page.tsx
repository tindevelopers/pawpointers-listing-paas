"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function TeamsCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Authorization was denied or failed.");
      setTimeout(() => router.push("/bookings/integrations"), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received.");
      setTimeout(() => router.push("/bookings/integrations"), 3000);
      return;
    }

    // Exchange code for tokens
    const handleCallback = async () => {
      try {
        const response = await fetch("/api/integrations/video/teams/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to connect Microsoft Teams");
        }

        setStatus("success");
        setMessage("Microsoft Teams account connected successfully!");
        setTimeout(() => router.push("/bookings/integrations"), 2000);
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "Failed to connect Microsoft Teams account");
        setTimeout(() => router.push("/bookings/integrations"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Connecting Microsoft Teams" />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Connecting your Microsoft Teams account...
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <p className="text-green-600 dark:text-green-400 font-semibold">
                {message}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecting to integrations page...
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="text-red-500 text-5xl mb-4">✗</div>
              <p className="text-red-600 dark:text-red-400 font-semibold">
                {message}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecting to integrations page...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


