# Vercel Environment Variables Setup for API Server

## Required Environment Variables

The API server requires the following environment variables to be set in Vercel:

### 1. Supabase Configuration (REQUIRED)

```bash
SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY3pta2pycHN5a3B3aXlwdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODIyMjMsImV4cCI6MjA4MzU1ODIyM30.JZnXOYmO-fxR1i9ak13_TKqXLBF40ETHHr0P26hqd5s
```

**Important:** 
- `SUPABASE_SERVICE_KEY` is the **service role key** (not the anon key)
- Get it from: Supabase Dashboard → Settings → API → `service_role` key (secret)
- This key bypasses Row-Level Security (RLS) - keep it secure!

### 2. Optional Configuration

```bash
NODE_ENV=production
PORT=8080
ALLOWED_ORIGINS=https://pawpointers-portal.tinconnect.com,https://pawpointers-admin.tinconnect.com
```

## Setting Environment Variables via Vercel CLI

### Step 1: Navigate to API Server Directory

```bash
cd packages/api-server
```

### Step 2: Link Project (if not already linked)

```bash
vercel link
```

Follow the prompts to select your Vercel project.

### Step 3: Set Environment Variables

```bash
# Set Supabase URL
vercel env add SUPABASE_URL production
# Paste: https://omczmkjrpsykpwiyptfj.supabase.co

# Set Supabase Service Key (REQUIRED - get from Supabase Dashboard)
vercel env add SUPABASE_SERVICE_KEY production
# Paste your service role key

# Set Supabase Anon Key
vercel env add SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY3pta2pycHN5a3B3aXlwdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODIyMjMsImV4cCI6MjA4MzU1ODIyM30.JZnXOYmO-fxR1i9ak13_TKqXLBF40ETHHr0P26hqd5s

# Set for all environments (production, preview, development)
vercel env add SUPABASE_URL preview
vercel env add SUPABASE_SERVICE_KEY preview
vercel env add SUPABASE_ANON_KEY preview

vercel env add SUPABASE_URL development
vercel env add SUPABASE_SERVICE_KEY development
vercel env add SUPABASE_ANON_KEY development
```

### Step 4: Verify Environment Variables

```bash
vercel env ls
```

## Setting Environment Variables via Vercel Dashboard

1. Go to: https://vercel.com/tindeveloper/api-server/settings/environment-variables
2. Click "Add New"
3. Add each variable:
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://omczmkjrpsykpwiyptfj.supabase.co`
   - **Environment**: Select Production, Preview, Development (or all)
   - Click "Save"
4. Repeat for `SUPABASE_SERVICE_KEY` and `SUPABASE_ANON_KEY`

## After Setting Environment Variables

1. **Redeploy the API Server:**
   ```bash
   cd packages/api-server
   vercel --prod
   ```

2. **Test the API:**
   ```bash
   # Health check
   curl https://pawpointers-api.tinconnect.com/health
   
   # Diagnostic endpoint (checks env vars)
   curl https://pawpointers-api.tinconnect.com/api/diagnostic
   
   # Public listings
   curl "https://pawpointers-api.tinconnect.com/api/public/listings?limit=3"
   ```

## Troubleshooting

### If API returns 500 errors:

1. **Check Vercel Function Logs:**
   ```bash
   vercel logs api-server --follow
   ```

2. **Verify Environment Variables:**
   ```bash
   curl https://pawpointers-api.tinconnect.com/api/diagnostic
   ```
   This endpoint shows which env vars are present (without exposing secrets).

3. **Common Issues:**
   - Missing `SUPABASE_SERVICE_KEY` - Most common cause of 500 errors
   - Trailing whitespace in env vars - The code now trims automatically
   - Wrong service key - Must be the `service_role` key, not `anon` key
   - Database tables don't exist - Run migrations in Supabase

4. **Get Service Role Key:**
   - Go to: https://supabase.com/dashboard/project/omczmkjrpsykpwiyptfj/settings/api
   - Copy the `service_role` key (it's secret, starts with `eyJ...`)

## Quick Setup Script

If you have the service role key, you can use this script:

```bash
#!/bin/bash
cd packages/api-server

# Set variables (replace YOUR_SERVICE_ROLE_KEY with actual key)
vercel env add SUPABASE_URL production <<< "https://omczmkjrpsykpwiyptfj.supabase.co"
vercel env add SUPABASE_SERVICE_KEY production <<< "YOUR_SERVICE_ROLE_KEY"
vercel env add SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY3pta2pycHN5a3B3aXlwdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODIyMjMsImV4cCI6MjA4MzU1ODIyM30.JZnXOYmO-fxR1i9ak13_TKqXLBF40ETHHr0P26hqd5s"

# Copy to preview and development
vercel env pull .env.preview --environment=preview
vercel env pull .env.development --environment=development

echo "Environment variables set! Redeploy with: vercel --prod"
```

