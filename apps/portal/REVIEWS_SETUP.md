# Reviews System Setup Guide

The reviews system has been installed and configured for the portal app. This guide explains how to use it.

## ✅ What's Been Set Up

1. **API Routes Created:**
   - `GET /api/reviews` - Get reviews for an entity
   - `POST /api/reviews` - Create a new review
   - `GET /api/reviews/stats` - Get review statistics
   - `POST /api/reviews/vote` - Vote on reviews (helpful/not helpful)

2. **SDK Initialization:**
   - `ReviewsProvider` wrapper added to root layout
   - Automatically detects base URL for API calls

3. **Components Updated:**
   - `TaxonomyListing` component now uses `entityId` prop
   - Reviews section displays on listing detail pages

## 🚀 How to See It

### 1. Start the Development Server

```bash
# From the root directory
pnpm dev:portal

# Or from apps/portal
cd apps/portal
pnpm dev
```

The portal will run on `http://localhost:3030`

### 2. View Reviews on a Listing Page

1. Navigate to any listing detail page (e.g., `/listings/[slug]`)
2. Scroll down to the "Reviews" section
3. You should see:
   - Review statistics (if any reviews exist)
   - List of reviews
   - Option to submit a new review (if authenticated)

### 3. Test Review Submission

1. Make sure you're signed in (create an account if needed)
2. Go to a listing detail page
3. Scroll to the reviews section
4. Fill out the review form and submit

## 📋 Prerequisites

### Database Tables

Make sure your Supabase database has the following tables:
- `reviews` - Stores review data
- `review_votes` - Tracks helpful/not helpful votes
- `listing_ratings` - Cached rating statistics

These should already exist from the migration files in `supabase/migrations/`.

### Environment Variables

Ensure these are set in your `.env.local` or environment:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3030  # Optional, for production
```

## 🎨 Using Reviews Components

### Basic Usage

```tsx
import { ReviewsList, ReviewForm, ReviewStats } from "@listing-platform/reviews";

// Display reviews
<ReviewsList entityId="listing-id" variant="default" />

// Display review form
<ReviewForm 
  entityId="listing-id" 
  onSubmit={(reviewId) => console.log('Review created:', reviewId)}
/>

// Display stats
<ReviewStats stats={stats} variant="detailed" />
```

### With Filters

```tsx
<ReviewsList 
  entityId="listing-id"
  filters={{
    minRating: 4,
    sortBy: 'date',
    sortOrder: 'desc',
    limit: 10
  }}
/>
```

## 🔧 API Endpoints

### Get Reviews

```bash
GET /api/reviews?entityId=123&minRating=4&sortBy=date&sortOrder=desc
```

### Get Review Stats

```bash
GET /api/reviews/stats?entityId=123
```

### Submit Review

```bash
POST /api/reviews
Content-Type: application/json

{
  "entityId": "123",
  "rating": 5,
  "comment": "Great listing!"
}
```

### Vote on Review

```bash
POST /api/reviews/vote
Content-Type: application/json

{
  "reviewId": "review-id",
  "type": "helpful"
}
```

## 📝 Notes

- Reviews require authentication to submit
- Reviews are set to `pending` status by default (require moderation)
- Only `approved` reviews are displayed
- The SDK uses `entityId` as the primary identifier (platform-agnostic)
- Legacy `listingId` prop is still supported for backward compatibility

## 🐛 Troubleshooting

### Reviews Not Showing

1. Check that reviews exist in the database with `status = 'approved'`
2. Verify the API routes are accessible (check browser network tab)
3. Ensure Supabase environment variables are set correctly

### API Errors

1. Check browser console for error messages
2. Verify Supabase connection is working
3. Check that the `reviews` table exists in your database

### Build Errors

If you see TypeScript errors about missing types:
```bash
cd packages/@listing-platform/reviews
pnpm build
```

## 📚 More Information

See the reviews package README for detailed API documentation:
- `packages/@listing-platform/reviews/README.md`
- `REVIEWS_RATINGS_SDK_ARCHITECTURE.md`
