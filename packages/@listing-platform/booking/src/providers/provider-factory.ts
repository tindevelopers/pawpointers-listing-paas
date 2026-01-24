import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";
import type { BookingProviderType, BookingProvider } from "./booking-provider-interface";
import {
  CalComProvider,
  GoHighLevelProvider,
  LocalBookingProvider,
} from "./local-booking-provider";

export function createBookingProvider(
  type: BookingProviderType,
  supabase: SupabaseClient<Database>
): BookingProvider {
  switch (type) {
    case "builtin":
      return new LocalBookingProvider("builtin", supabase);
    case "gohighlevel":
      return new GoHighLevelProvider(supabase);
    case "calcom":
      return new CalComProvider(supabase);
    default:
      return new LocalBookingProvider("builtin", supabase);
  }
}


