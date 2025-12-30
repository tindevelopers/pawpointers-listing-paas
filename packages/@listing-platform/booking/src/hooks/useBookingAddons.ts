"use client";

import { useState, useEffect, useCallback } from "react";
import { AddonService, type AddonWithSelection } from "../services/AddonService";

export interface UseBookingAddonsOptions {
  listingId: string;
  bookingId?: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export interface UseBookingAddonsResult {
  addons: AddonWithSelection[];
  loading: boolean;
  error: string | null;
  total: number;
  addAddon: (addonId: string, quantity?: number) => Promise<void>;
  removeAddon: (addonId: string) => Promise<void>;
  updateQuantity: (addonId: string, quantity: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBookingAddons({
  listingId,
  bookingId,
  supabaseUrl,
  supabaseKey,
}: UseBookingAddonsOptions): UseBookingAddonsResult {
  const [addons, setAddons] = useState<AddonWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const addonService = new AddonService(supabaseUrl, supabaseKey);

  const calculateTotal = useCallback((addonsList: AddonWithSelection[]) => {
    const calculatedTotal = addonsList.reduce((sum, addon) => {
      if (addon.selected && addon.quantity) {
        return sum + addon.price * addon.quantity;
      }
      return sum;
    }, 0);
    setTotal(calculatedTotal);
  }, []);

  const loadAddons = useCallback(async () => {
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
  }, [listingId, bookingId, addonService, calculateTotal]);

  useEffect(() => {
    loadAddons();
  }, [loadAddons]);

  const addAddon = useCallback(
    async (addonId: string, quantity: number = 1) => {
      if (!bookingId) {
        // Update local state only
        const updatedAddons = addons.map((a) =>
          a.id === addonId
            ? { ...a, selected: true, quantity }
            : a
        );
        setAddons(updatedAddons);
        calculateTotal(updatedAddons);
        return;
      }

      try {
        const result = await addonService.addAddonToBooking(bookingId, addonId, quantity);
        if (result.success && result.selection) {
          const updatedAddons = addons.map((a) =>
            a.id === addonId
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add addon");
      }
    },
    [bookingId, addons, addonService, calculateTotal]
  );

  const removeAddon = useCallback(
    async (addonId: string) => {
      if (!bookingId) {
        // Update local state only
        const updatedAddons = addons.map((a) =>
          a.id === addonId ? { ...a, selected: false, quantity: 0 } : a
        );
        setAddons(updatedAddons);
        calculateTotal(updatedAddons);
        return;
      }

      try {
        const result = await addonService.removeAddonFromBooking(bookingId, addonId);
        if (result.success) {
          const updatedAddons = addons.map((a) =>
            a.id === addonId ? { ...a, selected: false, quantity: 0 } : a
          );
          setAddons(updatedAddons);
          calculateTotal(updatedAddons);
        } else {
          setError(result.error || "Failed to remove addon");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove addon");
      }
    },
    [bookingId, addons, addonService, calculateTotal]
  );

  const updateQuantity = useCallback(
    async (addonId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeAddon(addonId);
        return;
      }

      if (!bookingId) {
        // Update local state only
        const updatedAddons = addons.map((a) =>
          a.id === addonId ? { ...a, quantity, selected: quantity > 0 } : a
        );
        setAddons(updatedAddons);
        calculateTotal(updatedAddons);
        return;
      }

      try {
        const result = await addonService.updateAddonQuantity(bookingId, addonId, quantity);
        if (result.success && result.selection) {
          const updatedAddons = addons.map((a) =>
            a.id === addonId
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
    },
    [bookingId, addons, addonService, calculateTotal, removeAddon]
  );

  return {
    addons,
    loading,
    error,
    total,
    addAddon,
    removeAddon,
    updateQuantity,
    refresh: loadAddons,
  };
}

