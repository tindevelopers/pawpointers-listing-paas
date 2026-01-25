"use client";

import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { SparklesIcon, KeyIcon, ServerIcon } from "@heroicons/react/24/outline";

type AIProvider = "gateway" | "openai" | "abacus";

interface AIConfig {
  provider: AIProvider;
  gateway?: {
    url: string;
    apiKey: string;
  };
  openai?: {
    apiKey: string;
    model?: string;
  };
  abacus?: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
}

export default function AIIntegrationPage() {
  const [config, setConfig] = useState<AIConfig>({
    provider: "gateway",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai-config");
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Failed to load AI config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "AI integration settings saved successfully!" });
        // Reset cache on the server
        await fetch("/api/admin/ai-config/reset-cache", { method: "POST" });
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.message || "Failed to save settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    setConfig((prev) => ({
      ...prev,
      provider,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="AI Integration" />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            AI Integration Settings
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Configure your AI provider and credentials. Choose between AI Gateway, Direct OpenAI, or Abacus AI.
          </p>
        </div>

        {/* Provider Selection */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Select AI Provider
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            {/* AI Gateway Option */}
            <div
              onClick={() => handleProviderChange("gateway")}
              className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all ${
                config.provider === "gateway"
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    config.provider === "gateway"
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <ServerIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      AI Gateway
                    </h3>
                    {config.provider === "gateway" && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use Vercel AI Gateway for unified AI access and rate limiting
                  </p>
                </div>
                <input
                  type="radio"
                  name="provider"
                  value="gateway"
                  checked={config.provider === "gateway"}
                  onChange={() => handleProviderChange("gateway")}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Direct OpenAI Option */}
            <div
              onClick={() => handleProviderChange("openai")}
              className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all ${
                config.provider === "openai"
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    config.provider === "openai"
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <KeyIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Direct OpenAI
                    </h3>
                    {config.provider === "openai" && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Connect directly to OpenAI API with your API key
                  </p>
                </div>
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  checked={config.provider === "openai"}
                  onChange={() => handleProviderChange("openai")}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Abacus AI Option */}
            <div
              onClick={() => handleProviderChange("abacus")}
              className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all ${
                config.provider === "abacus"
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    config.provider === "abacus"
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Abacus AI
                    </h3>
                    {config.provider === "abacus" && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use Abacus AI for advanced AI capabilities
                  </p>
                </div>
                <input
                  type="radio"
                  name="provider"
                  value="abacus"
                  checked={config.provider === "abacus"}
                  onChange={() => handleProviderChange("abacus")}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Forms */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Configuration
          </h2>

          {/* AI Gateway Configuration */}
          {config.provider === "gateway" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="gateway-url">Gateway URL</Label>
                <Input
                  id="gateway-url"
                  type="url"
                  placeholder="https://gateway.vercel.app"
                  value={config.gateway?.url || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      gateway: { ...config.gateway, url: e.target.value, apiKey: config.gateway?.apiKey || "" },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="gateway-key">API Key</Label>
                <Input
                  id="gateway-key"
                  type="password"
                  placeholder="Enter your AI Gateway API key"
                  value={config.gateway?.apiKey || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      gateway: { ...config.gateway, url: config.gateway?.url || "", apiKey: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Direct OpenAI Configuration */}
          {config.provider === "openai" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={config.openai?.apiKey || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      openai: { ...config.openai, apiKey: e.target.value, model: config.openai?.model },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="openai-model">Model (Optional)</Label>
                <Input
                  id="openai-model"
                  type="text"
                  placeholder="gpt-4-turbo-preview"
                  value={config.openai?.model || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      openai: { ...config.openai, apiKey: config.openai?.apiKey || "", model: e.target.value },
                    })
                  }
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Default: gpt-4-turbo-preview
                </p>
              </div>
            </div>
          )}

          {/* Abacus AI Configuration */}
          {config.provider === "abacus" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="abacus-key">Abacus AI API Key</Label>
                <Input
                  id="abacus-key"
                  type="password"
                  placeholder="Enter your Abacus AI API key"
                  value={config.abacus?.apiKey || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      abacus: {
                        ...config.abacus,
                        apiKey: e.target.value,
                        baseUrl: config.abacus?.baseUrl,
                        model: config.abacus?.model,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="abacus-url">Base URL (Optional)</Label>
                <Input
                  id="abacus-url"
                  type="url"
                  placeholder="https://api.abacus.ai"
                  value={config.abacus?.baseUrl || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      abacus: {
                        ...config.abacus,
                        apiKey: config.abacus?.apiKey || "",
                        baseUrl: e.target.value,
                        model: config.abacus?.model,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="abacus-model">Model (Optional)</Label>
                <Input
                  id="abacus-model"
                  type="text"
                  placeholder="abacus-model-name"
                  value={config.abacus?.model || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      abacus: {
                        ...config.abacus,
                        apiKey: config.abacus?.apiKey || "",
                        baseUrl: config.abacus?.baseUrl,
                        model: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div
              className={`mt-4 rounded-lg p-3 ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

