# Booking Provider Integration

Configure booking providers (Built-in, GoHighLevel, Cal.com) and route bookings per listing.

## Schema
- `booking_provider_integrations`: stores provider, credentials, settings, status
- `listings.booking_provider_id`: FK to provider config
- `bookings.external_provider`, `bookings.external_booking_id`: external references

Migration: `supabase/migrations/20260121000000_add_booking_provider_integrations.sql`

## Providers
- Built-in: uses local bookings/availability
- GoHighLevel: placeholder routing (extend with Appointments API)
- Cal.com: placeholder routing (extend with Cal.com API)

## API
- `POST /api/booking` supports `provider` override (`builtin|gohighlevel|calcom`)
- Provider CRUD: `/api/booking-providers`
  - `GET /api/booking-providers`
  - `POST /api/booking-providers` (provider, credentials, settings, listing_id?)
  - `PUT /api/booking-providers/:id`
  - `DELETE /api/booking-providers/:id`
  - `GET /api/booking-providers/:id/health`
- Webhooks:
  - `/api/webhooks/gohighlevel` (placeholder)
  - `/api/webhooks/calcom` (placeholder)

## UI
- Integrations list includes Booking providers
- Integration detail pages for GoHighLevel Booking and Cal.com
- Integration settings adds default booking provider selector
- Booking create form adds provider selector
- Availability page shows provider selector per listing (UI only)

## How to Configure
1) Create provider config (per tenant/listing)
```
POST /api/booking-providers
{
  "provider": "gohighlevel",
  "listing_id": "<listing-id>",
  "credentials": { "apiKey": "...", "locationId": "..." },
  "settings": { "syncDirection": "export" }
}
```
2) Set listing.booking_provider_id to the created provider (or use API to associate listing)
3) In the Admin UI, choose provider in Integrations > Booking or in booking creation form.

## Extending Providers
- Implement real API calls in:
  - `packages/@listing-platform/booking/src/providers/local-booking-provider.ts` (GHL/Cal.com placeholders)
  - Add OAuth/token handling and map responses to `Booking`
- Add webhook signature verification in:
  - `packages/api-server/src/routes/webhooks/gohighlevel.ts`
  - `packages/api-server/src/routes/webhooks/calcom.ts`
- Sync strategies: import/export/bidirectional based on provider settings.

## Notes
- Credentials should be stored securely (consider encryption at rest).
- Rate limit external API calls; add retries/backoff.
- Validate API keys before saving when possible.
- Keep service role keys out of client code; booking provider CRUD is server-side.

