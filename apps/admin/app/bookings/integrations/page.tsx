"use client";

import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { TrashIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface VideoIntegration {
  id: string;
  provider: "zoom" | "microsoft_teams";
  accountEmail?: string;
  accountName?: string;
  active: boolean;
  createdAt: string;
}

export default function VideoIntegrationsPage() {
  const [integrations, setIntegrations] = useState<VideoIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/integrations/video");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to load integrations");
      }
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error("Error loading integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: "zoom" | "microsoft_teams") => {
    try {
      setConnecting(provider);
      const response = await fetch(`/api/integrations/video/${provider}/oauth`);
      if (!response.ok) throw new Error("Failed to initiate OAuth");

      const data = await response.json();
      // Redirect to OAuth URL
      window.location.href = data.authUrl;
    } catch (error: any) {
      alert(error.message || "Failed to connect");
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) {
      return;
    }

    try {
      const response = await fetch(`/api/integrations/video/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to disconnect");
      await loadIntegrations();
    } catch (error: any) {
      alert(error.message || "Failed to disconnect");
    }
  };

  const hasIntegration = (provider: "zoom" | "microsoft_teams") => {
    return integrations.some(
      (i) => i.provider === provider && i.active
    );
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Video Integrations" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-500">Loading integrations...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Video Integrations" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
            Video Integrations
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Connect your Zoom or Microsoft Teams account to automatically create video meetings for bookings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Zoom Integration */}
          <div className="bg-white rounded-lg shadow dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Zoom
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect your Zoom account
                </p>
              </div>
              {hasIntegration("zoom") ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>

            {hasIntegration("zoom") ? (
              <div className="space-y-4">
                {integrations
                  .filter((i) => i.provider === "zoom" && i.active)
                  .map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {integration.accountEmail || integration.accountName || "Zoom Account"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Connected {new Date(integration.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <Button
                onClick={() => handleConnect("zoom")}
                disabled={connecting === "zoom"}
                className="w-full"
              >
                {connecting === "zoom" ? "Connecting..." : "Connect Zoom"}
              </Button>
            )}
          </div>

          {/* Microsoft Teams Integration */}
          <div className="bg-white rounded-lg shadow dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Microsoft Teams
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect your Microsoft Teams account
                </p>
              </div>
              {hasIntegration("microsoft_teams") ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>

            {hasIntegration("microsoft_teams") ? (
              <div className="space-y-4">
                {integrations
                  .filter((i) => i.provider === "microsoft_teams" && i.active)
                  .map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {integration.accountEmail || integration.accountName || "Teams Account"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Connected {new Date(integration.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <Button
                onClick={() => handleConnect("microsoft_teams")}
                disabled={connecting === "microsoft_teams"}
                className="w-full"
              >
                {connecting === "microsoft_teams"
                  ? "Connecting..."
                  : "Connect Microsoft Teams"}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> After connecting, video meetings will be automatically created
            when bookings are made for event types that have video enabled. Make sure to configure
            your event types to use the video provider you connect.
          </p>
        </div>
      </div>
    </div>
  );
}

