"use client";

import React, { useState, useEffect } from "react";
"use client";

import React, { useState, useEffect } from "react";
import {
  getAvailableUpgrades,
  previewUpgrade,
  upgradeSubscription,
  type AvailableUpgrade,
  type UpgradePreview,
} from "@tinadmin/core/billing";
import { cn } from "../utils/cn";

export interface UpgradePlanProps {
  onUpgradeComplete?: (subscriptionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function UpgradePlan({
  onUpgradeComplete,
  onError,
  className,
}: UpgradePlanProps) {
  const [upgrades, setUpgrades] = useState<AvailableUpgrade[]>([]);
  const [currentPlan, setCurrentPlan] = useState<AvailableUpgrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUpgrades();
  }, []);

  const loadUpgrades = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAvailableUpgrades();

      if (result.success) {
        setUpgrades(result.upgrades || []);
        setCurrentPlan(result.currentPlan || null);
      } else {
        setError(result.error || "Failed to load upgrade options");
        onError?.(result.error || "Failed to load upgrade options");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load upgrades";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (priceId: string) => {
    try {
      setPreviewing(priceId);
      const result = await previewUpgrade(priceId);

      if (result.success && result.preview) {
        setPreview(result.preview);
      } else {
        setError(result.error || "Failed to preview upgrade");
        onError?.(result.error || "Failed to preview upgrade");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to preview upgrade";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setPreviewing(null);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      setUpgrading(priceId);
      setError(null);

      const result = await upgradeSubscription(priceId);

      if (result.success && result.subscription) {
        onUpgradeComplete?.(result.subscription.id);
        // Reload upgrades to show new current plan
        await loadUpgrades();
        setPreview(null);
      } else {
        const errorMessage = result.error || "Failed to upgrade subscription";
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upgrade";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setUpgrading(null);
    }
  };

  const formatPrice = (priceInCents: number, interval: string) => {
    const price = priceInCents / 100;
    const intervalText = interval === "year" ? "year" : "month";
    return `$${price.toFixed(2)}/${intervalText}`;
  };

  if (loading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="text-center text-gray-500">Loading upgrade options...</div>
      </div>
    );
  }

  if (error && !upgrades.length) {
    return (
      <div className={cn("p-6", className)}>
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
        <p className="mt-2 text-gray-600">
          Choose a plan that better fits your needs. Changes take effect immediately.
        </p>
      </div>

      {currentPlan && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-blue-900">Current Plan</div>
              <div className="text-sm text-blue-700">{currentPlan.name}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-blue-900">
                {formatPrice(currentPlan.price, currentPlan.interval)}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {upgrades.map((upgrade) => {
          const isCurrentPlan = currentPlan?.priceId === upgrade.priceId;
          const isPreviewing = previewing === upgrade.priceId;
          const isUpgrading = upgrading === upgrade.priceId;
          const showPreview = preview?.newPlan.id === upgrade.priceId;

          return (
            <div
              key={upgrade.priceId}
              className={cn(
                "border rounded-lg p-6 transition-all",
                isCurrentPlan
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-md",
                showPreview && "border-green-500 bg-green-50"
              )}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{upgrade.name}</h3>
                  {upgrade.description && (
                    <p className="text-sm text-gray-500 mt-1">{upgrade.description}</p>
                  )}
                </div>

                <div className="text-3xl font-bold text-gray-900">
                  {formatPrice(upgrade.price, upgrade.interval)}
                </div>

                {upgrade.features.length > 0 && (
                  <ul className="space-y-2">
                    {upgrade.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <span className="mr-2 text-green-500">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                {showPreview && preview && (
                  <div className="bg-white rounded p-3 border border-green-200">
                    <div className="text-xs font-semibold text-green-700 mb-2">
                      Upgrade Preview
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Proration:</span>
                        <span className="font-medium">
                          ${(preview.prorationAmount / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Charge Now:</span>
                        <span className="font-medium">
                          ${(preview.immediateCharge / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Next billing:</span>
                        <span>
                          {new Date(preview.nextBillingDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handlePreview(upgrade.priceId)}
                        disabled={isPreviewing || isUpgrading}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPreviewing ? "Loading..." : "Preview Cost"}
                      </button>
                      {showPreview && (
                        <button
                          onClick={() => handleUpgrade(upgrade.priceId)}
                          disabled={isUpgrading}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUpgrading ? "Upgrading..." : "Upgrade Now"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

