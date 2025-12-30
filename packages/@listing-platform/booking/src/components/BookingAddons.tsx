"use client";

import React, { useState, useEffect } from "react";
import { AddonService, type AddonWithSelection } from "../services/AddonService";
import { cn } from "../utils/cn";

export interface BookingAddonsProps {
  listingId: string;
  bookingId?: string;
  supabaseUrl: string;
  supabaseKey: string;
  onAddonsChange?: (addons: AddonWithSelection[], total: number) => void;
  className?: string;
}

export function BookingAddons({
  listingId,
  bookingId,
  supabaseUrl,
  supabaseKey,
  onAddonsChange,
  className,
}: BookingAddonsProps) {
  const [addons, setAddons] = useState<AddonWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addonService = new AddonService(supabaseUrl, supabaseKey);

  useEffect(() => {
    loadAddons();
  }, [listingId, bookingId]);

  const loadAddons = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = bookingId
        ? await addonService.getAddonsForBooking(listingId, bookingId)
        : await addonService.getAddonsForListing(listingId);

      if (result.success && result.addons) {
        setAddons(result.addons);
        calculateTotal(result.addons);
      } else {
        setError(result.error || "Failed to load add-ons");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (addonsList: AddonWithSelection[]) => {
    const total = addonsList.reduce((sum, addon) => {
      if (addon.selected && addon.quantity) {
        return sum + addon.price * addon.quantity;
      }
      return sum;
    }, 0);
    onAddonsChange?.(addonsList, total);
  };

  const handleToggleAddon = async (addon: AddonWithSelection) => {
    if (!bookingId) {
      // If no booking ID, just update local state
      const updatedAddons = addons.map((a) =>
        a.id === addon.id
          ? { ...a, selected: !a.selected, quantity: !a.selected ? 1 : 0 }
          : a
      );
      setAddons(updatedAddons);
      calculateTotal(updatedAddons);
      return;
    }

    try {
      if (addon.selected) {
        // Remove addon
        const result = await addonService.removeAddonFromBooking(bookingId, addon.id);
        if (result.success) {
          const updatedAddons = addons.map((a) =>
            a.id === addon.id ? { ...a, selected: false, quantity: 0 } : a
          );
          setAddons(updatedAddons);
          calculateTotal(updatedAddons);
        } else {
          setError(result.error || "Failed to remove addon");
        }
      } else {
        // Add addon
        const result = await addonService.addAddonToBooking(bookingId, addon.id, 1);
        if (result.success && result.selection) {
          const updatedAddons = addons.map((a) =>
            a.id === addon.id
              ? {
                  ...a,
                  selected: true,
                  quantity: result.selection!.quantity,
                  selection_id: result.selection!.id,
                }
              : a
          );
          setAddons(updatedAddons);
          calculateTotal(updatedAddons);
        } else {
          setError(result.error || "Failed to add addon");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update addon");
    }
  };

  const handleQuantityChange = async (addon: AddonWithSelection, quantity: number) => {
    if (!bookingId) {
      // If no booking ID, just update local state
      const updatedAddons = addons.map((a) =>
        a.id === addon.id
          ? { ...a, quantity, selected: quantity > 0 }
          : a
      );
      setAddons(updatedAddons);
      calculateTotal(updatedAddons);
      return;
    }

    try {
      const result = await addonService.updateAddonQuantity(bookingId, addon.id, quantity);
      if (result.success && result.selection) {
        const updatedAddons = addons.map((a) =>
          a.id === addon.id
            ? {
                ...a,
                quantity: result.selection!.quantity,
                selected: result.selection!.quantity > 0,
              }
            : a
        );
        setAddons(updatedAddons);
        calculateTotal(updatedAddons);
      } else {
        setError(result.error || "Failed to update quantity");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
    }
  };

  if (loading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-sm text-gray-500">Loading add-ons...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (addons.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold">Add-ons</h3>
      <div className="space-y-3">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className={cn(
              "border rounded-lg p-4 transition-colors",
              addon.selected
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={addon.selected}
                    onChange={() => handleToggleAddon(addon)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label className="font-medium text-gray-900 cursor-pointer">
                      {addon.name}
                    </label>
                    {addon.description && (
                      <p className="text-sm text-gray-500 mt-1">{addon.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {addon.selected && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(addon, Math.max(1, (addon.quantity || 1) - 1))
                      }
                      className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
                      disabled={!addon.selected || (addon.quantity || 0) <= 1}
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {addon.quantity || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(addon, (addon.quantity || 0) + 1)
                      }
                      className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
                      disabled={!addon.selected}
                    >
                      +
                    </button>
                  </div>
                )}
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ${((addon.price * (addon.quantity || 0)) / 100).toFixed(2)}
                  </div>
                  {addon.quantity && addon.quantity > 1 && (
                    <div className="text-xs text-gray-500">
                      ${(addon.price / 100).toFixed(2)} each
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

