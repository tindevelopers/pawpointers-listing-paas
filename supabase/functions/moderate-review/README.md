# Moderate Review Edge Function

This Supabase Edge Function handles AI-powered review moderation.

## Setup

1. Set environment variables in Supabase Dashboard:
   - `OPENAI_API_KEY` - Your OpenAI API key (optional, falls back to basic moderation)
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

2. Deploy the function:
```bash
supabase functions deploy moderate-review
```

## Usage

The function is automatically invoked when a review is created via the database trigger.

You can also invoke it manually:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/moderate-review \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "review_id": "uuid-here",
    "review_content": "Review text",
    "review_rating": 5,
    "user_id": "user-uuid",
    "listing_id": "listing-uuid"
  }'
```

## Features

- AI content moderation using OpenAI Moderation API
- Bot detection based on user behavior patterns
- Automatic approval/rejection based on confidence scores
- Fallback to basic rule-based moderation if AI unavailable
