# Builder.io Environment Variables Setup

## Files Created

1. **`.env.builder`** - Contains your actual environment variables (ready to use)
2. **`.env.builder.example`** - Template file (for reference)

## How to Use with Builder.io

### Option 1: Copy Values to Builder.io Dashboard

1. **Go to Builder.io Project Settings**:
   - Open your project in Builder.io
   - Go to **Settings** → **Environment Variables**
   - Or **Settings** → **Build Settings** → **Environment Variables**

2. **Add Each Variable**:
   - Copy each variable from `.env.builder`
   - Add it in Builder.io dashboard
   - Set for: Production, Preview, Development (as needed)

3. **Required Variables**:
   ```
   NEXT_PUBLIC_BUILDER_API_KEY=5a52d82defcf479eb265bdbda490769e
   NEXT_PUBLIC_SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
   ```

### Option 2: Upload .env File (if Builder.io supports it)

Some Builder.io configurations allow uploading `.env` files directly:
- Look for "Upload Environment File" option
- Upload `.env.builder` file

### Option 3: Use Builder.io CLI

If using Builder.io CLI:

```bash
cd apps/portal
# Builder.io CLI may read .env.builder automatically
npx @builder.io/cli deploy
```

## Environment Variables Explained

### Required for Builder.io

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BUILDER_API_KEY` | Your Builder.io API key | `5a52d82defcf479eb265bdbda490769e` |
| `NEXT_PUBLIC_BUILDER_SPACE_ID` | Builder.io space ID (optional) | |
| `NEXT_PUBLIC_BUILDER_ENVIRONMENT` | Environment name | `production` |

### Required for Portal

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `NEXT_PUBLIC_API_URL` | Your API server URL | `https://api.example.com` |

### Optional

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `AI_GATEWAY_URL` / `AI_GATEWAY_API_KEY` | Vercel AI Gateway | Preferred for AI chat |
| `OPENAI_API_KEY` | OpenAI API key | Fallback if gateway not configured |
| `TYPESENSE_API_KEY` | Typesense API key | If using fast search |
| `REVALIDATION_SECRET` | Secret for revalidation | For ISR revalidation |

## Security Notes

⚠️ **Important**:
- `.env.builder` contains real API keys
- **DO NOT** commit this file to git (it's gitignored)
- `.env.builder.example` is safe to commit (no real keys)

## For Local Development

Use `.env.local` (already created):
- Contains your local development variables
- Used by Next.js dev server automatically

## For Builder.io Builds

Use `.env.builder`:
- Copy values to Builder.io dashboard
- Or use if Builder.io reads env files from repo

## Verification

After adding variables to Builder.io:

1. **Check Build Logs**:
   - Look for environment variable errors
   - Verify variables are loaded

2. **Test Build**:
   - Trigger a build in Builder.io
   - Check if it succeeds

3. **Test Preview**:
   - Preview a Builder.io page
   - Verify it loads correctly

## Troubleshooting

### Variables Not Loading

**Issue**: Builder.io build fails with missing env vars

**Solutions**:
1. Verify variables are set in Builder.io dashboard
2. Check variable names match exactly (case-sensitive)
3. Ensure `NEXT_PUBLIC_` prefix for client-side vars
4. Restart Builder.io build

### Wrong Values

**Issue**: Builder.io using wrong API keys

**Solutions**:
1. Double-check values in Builder.io dashboard
2. Verify you're using the correct environment (Production vs Preview)
3. Update `.env.builder` and re-upload if needed

## Quick Reference

**Copy these to Builder.io**:
```bash
# From .env.builder file
NEXT_PUBLIC_BUILDER_API_KEY=5a52d82defcf479eb265bdbda490769e
NEXT_PUBLIC_SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
```

