import { redirect } from "next/navigation";

/**
 * Provider signup entry point: redirects to member signup with the same query params
 * so that plan (and intent, listingId, etc.) are preserved through the flow.
 * Flow: Get Started → /pricing → choose plan → /signup/provider?plan=... → /signup/member?plan=...
 */
export default function ProviderSignupPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => query.append(key, v));
      } else {
        query.set(key, value);
      }
    }
  }
  const qs = query.toString();
  redirect(`/signup/member${qs ? `?${qs}` : ""}`);
}
