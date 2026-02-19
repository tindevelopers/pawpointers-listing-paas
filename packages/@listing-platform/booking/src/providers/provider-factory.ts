import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";
import type { BookingProviderType, BookingProvider } from "./booking-provider-interface";
import { CalComProvider } from "./calcom-provider";
import { GoHighLevelProvider, LocalBookingProvider } from "./local-booking-provider";

export function createBookingProvider(
  type: BookingProviderType,
  supabase: SupabaseClient<Database> | SupabaseClient<unknown> | any
): BookingProvider {
  switch (type) {
    case "builtin":
      return new LocalBookingProvider("builtin", supabase);
    case "gohighlevel":
      return new GoHighLevelProvider(supabase);
    case "calcom":
      return new CalComProvider(supabase as any);
    default:
      return new LocalBookingProvider("builtin", supabase);
  }
}


