import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/core/database/types";

export interface BookingAddon {
  id: string;
  listing_id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonSelection {
  id: string;
  booking_id: string;
  addon_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface AddonWithSelection extends BookingAddon {
  selected?: boolean;
  quantity?: number;
  selection_id?: string;
}

/**
 * Service for managing booking add-ons
 */
export class AddonService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Get all active add-ons for a listing
   */
  async getAddonsForListing(listingId: string): Promise<{
    success: boolean;
    addons?: BookingAddon[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from("booking_addons")
        .select("*")
        .eq("listing_id", listingId)
        .eq("active", true)
        .order("price", { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, addons: (data || []) as BookingAddon[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch add-ons",
      };
    }
  }

  /**
   * Get add-ons for a listing with selection status for a specific booking
   */
  async getAddonsForBooking(
    listingId: string,
    bookingId: string
  ): Promise<{
    success: boolean;
    addons?: AddonWithSelection[];
    error?: string;
  }> {
    try {
      // Get all add-ons for listing
      const addonsResult = await this.getAddonsForListing(listingId);
      if (!addonsResult.success || !addonsResult.addons) {
        return addonsResult;
      }

      // Get selected add-ons for this booking
      const { data: selections, error: selectionsError } = await this.supabase
        .from("booking_addon_selections")
        .select("*")
        .eq("booking_id", bookingId);

      if (selectionsError) {
        return { success: false, error: selectionsError.message };
      }

      // Merge add-ons with selection data
      const addonsWithSelection: AddonWithSelection[] = addonsResult.addons.map(
        (addon) => {
          const selection = (selections || []).find(
            (s) => s.addon_id === addon.id
          );
          return {
            ...addon,
            selected: !!selection,
            quantity: selection?.quantity || 0,
            selection_id: selection?.id,
          };
        }
      );

      return { success: true, addons: addonsWithSelection };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch add-ons",
      };
    }
  }

  /**
   * Add addon to booking
   */
  async addAddonToBooking(
    bookingId: string,
    addonId: string,
    quantity: number = 1
  ): Promise<{
    success: boolean;
    selection?: AddonSelection;
    error?: string;
  }> {
    try {
      // Get addon details
      const { data: addon, error: addonError } = await this.supabase
        .from("booking_addons")
        .select("*")
        .eq("id", addonId)
        .single();

      if (addonError || !addon) {
        return { success: false, error: "Addon not found" };
      }

      if (!addon.active) {
        return { success: false, error: "Addon is not active" };
      }

      const unitPrice = addon.price;
      const totalPrice = unitPrice * quantity;

      // Upsert selection (update if exists, insert if not)
      const { data: selection, error: selectionError } = await this.supabase
        .from("booking_addon_selections")
        .upsert(
          {
            booking_id: bookingId,
            addon_id: addonId,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
          },
          {
            onConflict: "booking_id,addon_id",
          }
        )
        .select()
        .single();

      if (selectionError) {
        return { success: false, error: selectionError.message };
      }

      return {
        success: true,
        selection: selection as AddonSelection,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add addon",
      };
    }
  }

  /**
   * Remove addon from booking
   */
  async removeAddonFromBooking(
    bookingId: string,
    addonId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from("booking_addon_selections")
        .delete()
        .eq("booking_id", bookingId)
        .eq("addon_id", addonId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove addon",
      };
    }
  }

  /**
   * Update addon quantity in booking
   */
  async updateAddonQuantity(
    bookingId: string,
    addonId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    selection?: AddonSelection;
    error?: string;
  }> {
    if (quantity <= 0) {
      return this.removeAddonFromBooking(bookingId, addonId);
    }

    try {
      // Get addon details
      const { data: addon, error: addonError } = await this.supabase
        .from("booking_addons")
        .select("price")
        .eq("id", addonId)
        .single();

      if (addonError || !addon) {
        return { success: false, error: "Addon not found" };
      }

      const unitPrice = addon.price;
      const totalPrice = unitPrice * quantity;

      const { data: selection, error: selectionError } = await this.supabase
        .from("booking_addon_selections")
        .update({
          quantity,
          total_price: totalPrice,
        })
        .eq("booking_id", bookingId)
        .eq("addon_id", addonId)
        .select()
        .single();

      if (selectionError) {
        return { success: false, error: selectionError.message };
      }

      return {
        success: true,
        selection: selection as AddonSelection,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update addon",
      };
    }
  }

  /**
   * Calculate total addon cost for a booking
   */
  async calculateAddonTotal(bookingId: string): Promise<{
    success: boolean;
    total?: number;
    addons?: AddonSelection[];
    error?: string;
  }> {
    try {
      const { data: selections, error } = await this.supabase
        .from("booking_addon_selections")
        .select("*")
        .eq("booking_id", bookingId);

      if (error) {
        return { success: false, error: error.message };
      }

      const total =
        (selections || []).reduce((sum, selection) => sum + selection.total_price, 0) || 0;

      return {
        success: true,
        total,
        addons: (selections || []) as AddonSelection[],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate total",
      };
    }
  }

  /**
   * Create a new addon for a listing
   */
  async createAddon(
    listingId: string,
    tenantId: string,
    addon: {
      name: string;
      description?: string;
      price: number;
      currency?: string;
    }
  ): Promise<{
    success: boolean;
    addon?: BookingAddon;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from("booking_addons")
        .insert({
          listing_id: listingId,
          tenant_id: tenantId,
          name: addon.name,
          description: addon.description || null,
          price: addon.price,
          currency: addon.currency || "USD",
          active: true,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, addon: data as BookingAddon };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create addon",
      };
    }
  }

  /**
   * Update an existing addon
   */
  async updateAddon(
    addonId: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      active?: boolean;
    }
  ): Promise<{
    success: boolean;
    addon?: BookingAddon;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from("booking_addons")
        .update(updates)
        .eq("id", addonId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, addon: data as BookingAddon };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update addon",
      };
    }
  }

  /**
   * Delete an addon
   */
  async deleteAddon(addonId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from("booking_addons")
        .delete()
        .eq("id", addonId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete addon",
      };
    }
  }
}

