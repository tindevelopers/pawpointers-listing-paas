# Vercel Environment Variables Setup

## ✅ Local Environment - Configured

All local `.env.local` files have been updated with remote Supabase settings.

## 🌐 Vercel Remote Environment Variables

To configure your Vercel deployments, add these environment variables in the Vercel Dashboard for each project:

### Portal App (`apps/portal`)

Go to: Vercel Dashboard → Your Portal Project → Settings → Environment Variables

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://gakuwocsamrqcplrxvmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjU4NzMsImV4cCI6MjA4NDYwMTg3M30.83Ka_MlIYx_oR2V5FaF0b1G7J_hmmaCq3WwvtFl39p0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyNTg3MywiZXhwIjoyMDg0NjAxODczfQ.-OMdZwRNGVNY7GSjeLOo6zUYDVKwcCFuHNp4U2SWTbA
NEXT_PUBLIC_SITE_URL=https://your-portal-domain.vercel.app
```

**Optional (AI Gateway):**
```
AI_GATEWAY_URL=<your-gateway-url>
AI_GATEWAY_API_KEY=<your-gateway-key>
AI_MODEL=openai/gpt-4.1
EMBEDDING_MODEL=openai/text-embedding-3-small
```

**Optional (Fallback OpenAI):**
```
OPENAI_API_KEY=<your-openai-key>
```

### Admin App (`apps/admin`)

Go to: Vercel Dashboard → Your Admin Project → Settings → Environment Variables

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://gakuwocsamrqcplrxvmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjU4NzMsImV4cCI6MjA4NDYwMTg3M30.83Ka_MlIYx_oR2V5FaF0b1G7J_hmmaCq3WwvtFl39p0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyNTg3MywiZXhwIjoyMDg0NjAxODczfQ.-OMdZwRNGVNY7GSjeLOo6zUYDVKwcCFuHNp4U2SWTbA
```

## 📝 Steps to Update Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project (portal or admin)

2. **Navigate to Environment Variables**
   - Go to: Settings → Environment Variables

3. **Add/Update Variables**
   - Click "Add New" or edit existing variables
   - Paste the values from above
   - Select environment: Production, Preview, Development (or All)

4. **Redeploy**
   - After adding variables, trigger a new deployment
   - Or push to your main branch to auto-deploy

## 🔍 Verification

After deployment, verify environment variables are loaded:

1. Check Vercel deployment logs for any env-related errors
2. Test authentication flow
3. Verify database connections work
4. Check that Supabase queries succeed

## 📚 Additional Resources

- Vercel Environment Variables Docs: https://vercel.com/docs/concepts/projects/environment-variables
- Supabase Dashboard: https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh

