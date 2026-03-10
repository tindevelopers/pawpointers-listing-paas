# Cal.com Booking Integration — Technical Analysis

**PawPointers Platform**  
**Document Version:** 1.0  
**Last Updated:** March 2025

---

## Executive Summary

This document describes the end-to-end Cal.com booking flow in PawPointers, including customer and merchant flows, availability, booking creation, lifecycle, data sync, notifications, and architecture. It also maps what is implemented today versus what remains to be built.

---

## 1. Customer Booking Flow (Portal Side)

### 1.1 Step-by-Step Process

| Step | Action | Component | Location |
|------|--------|------------|----------|
| 1 | Customer visits listing page | **Frontend** | `apps/portal/app/listings/[slug]/page.tsx` → `ListingDetail.tsx` |
| 2 | Clicks "Book Now" | **Frontend** | `ListingDetail.tsx` → `setIsBookingModalOpen(true)` |
| 3 | Booking modal opens | **Frontend** | `BookingModal.tsx` |
| 4 | If not logged in → sign-up prompt | **Frontend** | Modal shows "Create Account" / "Sign In" |
| 5 | Select date | **Frontend** | Date picker in Step 1 |
| 6 | Fetch available time slots | **Frontend → Backend → Cal.com** | `GET /api/booking/availability` → Cal.com `/slots` |
| 7 | Select time | **Frontend** | Time slot grid |
| 8 | Select service, pet name, notes | **Frontend** | Step 2 (hardcoded services) |
| 9 | Review & confirm | **Frontend** | Step 3 |
| 10 | Submit booking | **Frontend → Backend** | `POST /api/booking/create` |
| 11 | Backend creates in Cal.com | **Backend → Cal.com** | `CalComApiClient.createBooking()` |
| 12 | Backend stores local record | **Backend → DB** | `bookings` table with `external_provider='calcom'`, `external_booking_id` |
| 13 | Return confirmation | **Backend → Frontend** | `{ success: true, data: { bookingId } }` |
| 14 | Success screen | **Frontend** | "Booking Confirmed!" + link to My Bookings |
| 15 | View in My Bookings | **Frontend** | `GET /api/booking/list` → `/account/bookings` |

### 1.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Frontend (Portal)** | UI, form validation, API calls, success/error handling |
| **Backend (Portal API)** | Auth, validation, provider resolution, Cal.com API calls, DB writes |
| **Cal.com API** | Availability slots, booking creation, cancellation |
| **Local DB (Supabase)** | `bookings`, `listings`, `booking_provider_integrations` |

### 1.3 Key Files

- `apps/portal/components/listings/BookingModal.tsx` — Booking wizard UI
- `apps/portal/app/api/booking/availability/route.ts` — Availability API
- `apps/portal/app/api/booking/create/route.ts` — Create booking API
- `apps/portal/app/api/booking/list/route.ts` — List customer bookings
- `apps/portal/app/api/booking/cancel/route.ts` — Cancel booking
- `packages/@listing-platform/booking/src/providers/calcom-provider.ts` — Cal.com provider
- `packages/@listing-platform/booking/src/providers/calcom-client.ts` — Cal.com API client

---

## 2. Merchant Booking Flow (Dashboard Side)

### 2.1 Connecting Cal.com

| Step | Action | Location |
|------|--------|----------|
| 1 | Merchant opens Admin app | `apps/admin` |
| 2 | Navigate to Integrations → Booking → Cal.com | `/saas/integrations/booking/cal.com` |
| 3 | Enter API Key (required) | From Cal.com Settings → Developer → API Keys |
| 4 | Enter API URL (optional, for self-hosted) | e.g. `https://api.cal.com` |
| 5 | Enter Event Type ID (required for booking) | From Cal.com event type URL or settings |
| 6 | Save | `POST /api/booking-providers` |
| 7 | Test connection | "Test Connection" → `GET /api/booking-providers/[id]/health` |

**Note:** The listing must be linked to the Cal.com integration via `listings.booking_provider_id`. There is **no UI** for this yet; it must be set in Supabase.

### 2.2 Event Types in Cal.com

Event types are configured **in Cal.com**, not in PawPointers:

1. Cal.com → Event Types → Create event type
2. Set duration, availability schedule, buffer time, etc.
3. Copy Event Type ID from URL or settings
4. Enter in PawPointers integration settings as `calEventTypeId`

### 2.3 Availability Schedules

Defined entirely in Cal.com:

- Cal.com → Availability → Set working hours per day
- Calendar sync (Google, Outlook) blocks busy times
- Event type can override availability

### 2.4 Listing-to-Cal.com Mapping

- `listings.booking_provider_id` → `booking_provider_integrations.id`
- Integration stores `calEventTypeId` in `settings`
- One integration can serve multiple listings (tenant-level) or be listing-specific (`listing_id` on integration)

### 2.5 Incoming Bookings in Dashboard

| Step | Action | Location |
|------|--------|----------|
| 1 | Customer books via portal | Creates Cal.com booking + local `bookings` row |
| 2 | DB trigger fires | `notify_merchant_on_booking_insert` |
| 3 | In-app notification created | `notifications` table, type `booking` |
| 4 | Merchant opens Dashboard → Bookings | `apps/dashboard/app/(dashboard)/bookings/page.tsx` |
| 5 | Bookings loaded | Supabase query on `bookings` where `listing_id IN (merchant's listings)` |
| 6 | Upcoming / Past sections | Filtered by date and status |

### 2.6 Merchant Actions

| Action | Trigger | Backend | Cal.com Sync |
|--------|---------|---------|--------------|
| **Confirm** | "Confirm" button | `confirmBookingAction` → `provider.updateBooking(..., { status: 'confirmed' })` | **Local only** — Cal.com provider does not call Cal.com API for status updates |
| **Mark Completed** | "Mark Completed" button | `completeBookingAction` → `provider.updateBooking(..., { status: 'completed' })` | **Local only** |
| **Cancel** | "Cancel" button | `cancelBookingAction` → `provider.cancelBooking()` | **Yes** — Cal.com API `POST /bookings/{uid}/cancel` |
| **Save Notes** | "Save notes" | `updateBookingNotesAction` → `provider.updateBooking(..., { internalNotes })` | **Local only** |

### 2.7 Status Sync with Cal.com

- **Portal/Dashboard → Cal.com:** Only **cancel** is synced. Confirm and complete are local-only.
- **Cal.com → Portal/Dashboard:** Webhooks sync `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`, `BOOKING_REJECTED`.

### 2.8 Merchant Notifications

- **New booking:** DB trigger `notify_merchant_on_booking_insert` creates in-app notification.
- **Cancellation by customer:** DB trigger `notify_on_booking_status_change` creates in-app notification for merchant team.
- **Email/SMS:** Not implemented; Cal.com sends its own emails for bookings created via Cal.com.

---

## 3. Availability Flow

### 3.1 Request Flow

```
Portal (BookingModal)
  → GET /api/booking/availability?listingId=X&dateFrom=Y&dateTo=Y
    → Backend resolves listing.booking_provider_id
    → If Cal.com: load credentials from booking_provider_integrations
    → CalComProvider.getAvailability()
      → CalComApiClient.getSlots(eventTypeId, startTime, endTime)
        → Cal.com API GET /v2/slots?eventTypeId=...&startTime=...&endTime=...
    → Map Cal.com slots to AvailabilitySlot[]
    → Return { success: true, data: { slots } }
  → Frontend filters available slots, displays in 12-hour format
```

### 3.2 Cal.com Slot Generation

- Cal.com computes slots from:
  - Event type duration
  - Host availability schedule
  - Connected calendars (busy blocks)
  - Buffer times
  - Existing bookings

### 3.3 Time Zones

- **Current:** Cal.com `getSlots` is called **without** `timeZone`; Cal.com uses its default.
- **Create booking:** `timeZone` is passed as `input.metadata?.timezone || "UTC"`.
- **Gap:** Portal does not send user timezone; defaults to UTC.

### 3.4 Conflict Prevention

- Cal.com handles conflicts via its availability engine.
- Slots returned are already free.
- Double-booking is avoided by Cal.com when creating the booking.

### 3.5 Availability After Booking

- Cal.com recalculates slots on each request.
- New bookings reduce available slots on subsequent availability calls.
- No local caching of slots.

---

## 4. Booking Creation — Technical Sequence

### 4.1 Exact Flow

```
1. Frontend (BookingModal.handleBookingConfirm)
   POST /api/booking/create
   Body: { listingId, startDate, endDate, startTime, endTime, guestCount, guestDetails?, specialRequests? }

2. Backend (create route)
   - Auth: supabase.auth.getUser() → 401 if not logged in
   - Validate: listingId, startDate, endDate required
   - Load listing → tenant_id, booking_provider_id
   - Resolve provider: booking_provider_integrations.provider → "calcom"
   - Load integration credentials + settings (admin client)
   - Compute basePrice, serviceFee, taxAmount from event_type or defaults

3. CalComProvider.createBooking()
   - Build start/end ISO strings
   - CalComApiClient.createBooking({ eventTypeId, start, end, timeZone, responses, metadata })
   - Cal.com API: POST /v2/bookings

4. Cal.com Response
   - Returns { uid, booking: { ... } }
   - Extract external_booking_id (uid)

5. Local DB Insert
   - INSERT into bookings (listing_id, user_id, tenant_id, start_date, end_date, start_time, end_time,
     guest_count, guest_details, special_requests, base_price, service_fee, tax_amount, total_amount,
     currency, payment_status, status, external_provider='calcom', external_booking_id, confirmation_code)

6. Response to Frontend
   { success: true, data: { bookingId, booking } }

7. Frontend
   - setBookingStep("success")
   - Show confirmation, link to My Bookings
```

### 4.2 Data Stored Locally

| Field | Source |
|-------|--------|
| `listing_id` | Request |
| `user_id` | Auth |
| `tenant_id` | Listing |
| `start_date`, `end_date`, `start_time`, `end_time` | Request |
| `guest_count`, `guest_details`, `special_requests` | Request |
| `base_price`, `service_fee`, `tax_amount`, `total_amount`, `currency` | Computed |
| `status` | Default "pending" |
| `external_provider` | "calcom" |
| `external_booking_id` | Cal.com response `uid` |
| `confirmation_code` | Generated `BK-{timestamp}-{random}` |

---

## 5. Booking Lifecycle

### 5.1 States

| Status | Description | Who Can Set |
|--------|-------------|-------------|
| **pending** | Awaiting merchant confirmation | System (create), Cal.com webhook |
| **confirmed** | Merchant confirmed | Merchant (dashboard), Cal.com webhook |
| **cancelled** | Cancelled | Customer (portal), Merchant (dashboard), Cal.com webhook |
| **completed** | Service delivered | Merchant (dashboard) |

### 5.2 Transitions

| From | To | Trigger | Cal.com Synced |
|------|-----|---------|----------------|
| — | pending | Create booking | Yes (create) |
| pending | confirmed | Merchant clicks Confirm | No |
| pending | cancelled | Customer or merchant cancels | Yes (cancel) |
| confirmed | completed | Merchant clicks Mark Completed | No |
| confirmed | cancelled | Customer or merchant cancels | Yes (cancel) |
| * | cancelled | Cal.com BOOKING_CANCELLED / BOOKING_REJECTED | N/A (webhook) |
| * | * | Cal.com BOOKING_RESCHEDULED | Yes (dates updated) |

### 5.3 Not Implemented

- **rescheduled** — No dedicated status; reschedule updates dates in place. Cal.com webhook handles it.
- **no-show** — Not in schema or provider.

---

## 6. Data Synchronization

### 6.1 Webhook Events

| Event | Handler | Action |
|-------|---------|--------|
| **BOOKING_CREATED** | Update existing or insert if new (from Cal.ai or external) | Set status from payload |
| **BOOKING_CANCELLED** | Update local booking | Set status=cancelled, cancelled_at |
| **BOOKING_RESCHEDULED** | Update local booking | Update start/end dates, external_booking_id |
| **BOOKING_REJECTED** | Update local booking | Set status=cancelled, cancellation_reason |

### 6.2 Webhook Endpoint

- **URL:** `https://{admin-domain}/api/webhooks/calcom`
- **Auth:** `cal-signature` header, verified with `CALCOM_WEBHOOK_SECRET` (HMAC-SHA256)
- **Config:** Cal.com → Webhooks → Add subscriber URL

### 6.3 Sync Direction Summary

| Action | Portal/Dashboard → Cal.com | Cal.com → Portal/Dashboard |
|--------|---------------------------|----------------------------|
| Create | Yes | Webhook can create if from Cal.ai |
| Cancel | Yes | Yes (webhook) |
| Confirm | No | Webhook (if Cal.com supports) |
| Complete | No | — |
| Reschedule | No | Yes (webhook) |

---

## 7. Notifications

### 7.1 In-App Notifications (Implemented)

| Event | Recipient | Trigger | Table |
|-------|-----------|---------|-------|
| New booking | Merchant + listing members | `notify_merchant_on_booking_insert` | `notifications` |
| Booking confirmed | Customer | `notify_on_booking_status_change` | `notifications` |
| Booking completed | Customer | `notify_on_booking_status_change` | `notifications` |
| Booking cancelled | Customer | `notify_on_booking_status_change` | `notifications` |
| Customer cancelled | Merchant + listing members | `notify_on_booking_status_change` | `notifications` |

### 7.2 Email/SMS (Not Implemented)

| Notification | Customer | Merchant |
|--------------|----------|----------|
| Booking confirmation | Cal.com sends (for Cal.com-origin) | — |
| Booking reminder | — | — |
| Cancellation notice | — | — |
| New booking alert | — | — |
| Reschedule alert | — | — |

**Note:** Cal.com sends its own emails for bookings created through Cal.com. PawPointers does not send booking-related emails.

---

## 8. Architecture Overview

### 8.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PAWPOINTERS PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐  │
│  │  PORTAL (Customer)│     │ DASHBOARD         │     │  ADMIN (SaaS)         │  │
│  │  - Listing page   │     │ (Merchant)        │     │  - Integrations      │  │
│  │  - BookingModal   │     │ - Bookings list   │     │  - Cal.com config    │  │
│  │  - My Bookings    │     │ - Confirm/Cancel  │     │  - Cal.com Setup     │  │
│  └────────┬──────────┘     └────────┬──────────┘     └──────────┬───────────┘  │
│           │                        │                            │               │
│           ▼                        ▼                            ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     BACKEND API (Next.js Route Handlers)                  │   │
│  │  /api/booking/availability  /api/booking/create  /api/booking/cancel     │   │
│  │  /api/booking/list          /api/bookings (dashboard)                    │   │
│  │  /api/booking-providers     /api/webhooks/calcom                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│           │                        │                            │               │
│           ▼                        ▼                            ▼               │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐  │
│  │  Booking Provider │     │  Supabase         │     │  Cal.com API          │  │
│  │  Abstraction      │────▶│  (PostgreSQL)     │     │  (External)           │  │
│  │  - CalComProvider │     │  - bookings       │     │  - /v2/slots           │  │
│  │  - BuiltinProvider│     │  - listings      │     │  - /v2/bookings        │  │
│  └──────────────────┘     │  - integrations  │     │  - /v2/bookings/:id/   │  │
│                           │  - notifications │     │    cancel              │  │
│                           └──────────────────┘     └──────────▲─────────────┘  │
│                                      │                        │               │
│                                      │    Webhooks             │               │
│                                      └────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Data Flow Summary

| Flow | Path |
|------|------|
| Customer books | Portal → API → CalComProvider → Cal.com API + DB |
| Customer cancels | Portal → API → CalComProvider → Cal.com API + DB |
| Merchant confirms | Dashboard → Server Action → CalComProvider.updateBooking → DB only |
| Merchant cancels | Dashboard → Server Action → CalComProvider.cancelBooking → Cal.com API + DB |
| Cal.com event | Cal.com → Webhook → DB update + optional AI assistant |
| Availability | Portal → API → CalComProvider.getAvailability → Cal.com /slots |

---

## 9. Implementation Mapping

### 9.1 Implemented ✅

| Component | Status | Notes |
|------------|--------|------|
| Portal booking modal | ✅ | 3-step wizard: date/time, service, confirmation |
| Availability API | ✅ | Uses Cal.com when listing has Cal.com provider |
| Create booking API | ✅ | Cal.com + local DB |
| Cancel booking API | ✅ | Portal + dashboard, syncs to Cal.com |
| My Bookings (customer) | ✅ | List, filter, cancel |
| Dashboard bookings | ✅ | List, confirm, complete, cancel, notes |
| Cal.com provider | ✅ | createBooking, cancelBooking, getAvailability, updateBooking |
| Cal.com API client | ✅ | getSlots, createBooking, cancelBooking, getMe |
| Webhook receiver | ✅ | BOOKING_CREATED, CANCELLED, RESCHEDULED, REJECTED |
| Admin Cal.com integration | ✅ | API key, URL, Event Type ID |
| In-app notifications | ✅ | DB triggers for new booking, status change |
| Provider abstraction | ✅ | Builtin, Cal.com, GoHighLevel (placeholder) |

### 9.2 Partially Implemented ⚠️

| Component | Gap |
|-----------|-----|
| **Event types** | Modal uses hardcoded services; `eventTypeId` not sent. `calEventTypeId` must be in integration settings. |
| **Guest email** | Portal does not pass user email to `guestDetails`; Cal.com may receive empty guest email. |
| **Timezone** | Availability does not pass timezone; create uses `metadata.timezone` (default UTC). |
| **Merchant confirm/complete** | Updates local DB only; does not sync to Cal.com. |
| **Listing–provider link** | No UI; must set `booking_provider_id` in Supabase. |

### 9.3 Not Implemented ❌

| Component | Description |
|-----------|-------------|
| **Email notifications** | No Resend/SendGrid integration for booking confirmation, reminder, cancellation. |
| **SMS notifications** | Not implemented. |
| **Reschedule UI** | No portal or dashboard action; webhook handles Cal.com reschedules. |
| **No-show status** | Not in schema or flows. |
| **Cal.com Setup → listing link** | Cal.com Setup page does not set `booking_provider_id` on listing. |
| **Dynamic event types** | Services from `event_types` table not used in modal. |
| **Calendar conflict detection** | Relies entirely on Cal.com. |

### 9.4 Recommended Next Steps

1. **Pass user email to Cal.com** — Include `user.email` in `guestDetails.primaryContact.email` when creating booking.
2. **Add timezone to availability** — Detect or ask for user timezone; pass to Cal.com `getSlots`.
3. **Listing–provider UI** — Add "Booking provider" dropdown on listing form (dashboard) to set `booking_provider_id`.
4. **Cal.com Setup → link listing** — When saving Cal.com Setup, optionally set `booking_provider_id` for selected listing.
5. **Sync confirm/complete to Cal.com** — If Cal.com API supports status updates, call it from `updateBooking`.
6. **Email notifications** — Integrate Resend (or similar) for confirmation, reminder, cancellation emails.
7. **Dynamic services** — Load `event_types` for listing; map to Cal.com `external_event_type_id` via `service_booking_provider_mappings`.

---

## Appendix A: Database Schema (Relevant Tables)

- **bookings** — Core booking record; `external_provider`, `external_booking_id` for Cal.com
- **listings** — `booking_provider_id` → `booking_provider_integrations`
- **booking_provider_integrations** — `provider`, `credentials`, `settings` (e.g. `calEventTypeId`)
- **event_types** — Per-listing event types (used by Cal.com Setup, not yet by portal modal)
- **service_booking_provider_mappings** — Maps `event_type_id` to Cal.com `external_event_type_id`
- **notifications** — In-app notifications for booking events

---

## Appendix B: Environment Variables

| Variable | Required For | Description |
|----------|--------------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Cal.com in Portal | Access credentials for Cal.com integration |
| `CALCOM_WEBHOOK_SECRET` | Webhooks | Verify Cal.com webhook signatures |

---

*End of document*
