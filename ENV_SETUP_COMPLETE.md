# Environment Setup Complete

## ✅ Local Environment Files Updated

All local environment files have been configured with remote Supabase settings:

### Root `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`: https://gakuwocsamrqcplrxvmh.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Configured
- `SUPABASE_SERVICE_ROLE_KEY`: Configured
- `NEXT_PUBLIC_SITE_URL`: http://localhost:3001

### Portal `.env.local` (`apps/portal/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`: https://gakuwocsamrqcplrxvmh.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Configured
- `SUPABASE_SERVICE_ROLE_KEY`: Configured
- `NEXT_PUBLIC_SITE_URL`: http://localhost:3001

### Admin `.env.local` (`apps/admin/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`: https://gakuwocsamrqcplrxvmh.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Configured
- `SUPABASE_SERVICE_KEY`: Configured

## 🌐 Remote Environment (Vercel)

For Vercel deployments, configure these environment variables in the Vercel Dashboard:

### Portal App Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://gakuwocsamrqcplrxvmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjU4NzMsImV4cCI6MjA4NDYwMTg3M30.83Ka_MlIYx_oR2V5FaF0b1G7J_hmmaCq3WwvtFl39p0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyNTg3MywiZXhwIjoyMDg0NjAxODczfQ.-OMdZwRNGVNY7GSjeLOo6zUYDVKwcCFuHNp4U2SWTbA
NEXT_PUBLIC_SITE_URL=https://your-portal-domain.vercel.app
```

### Admin App Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://gakuwocsamrqcplrxvmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjU4NzMsImV4cCI6MjA4NDYwMTg3M30.83Ka_MlIYx_oR2V5FaF0b1G7J_hmmaCq3WwvtFl39p0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyNTg3MywiZXhwIjoyMDg0NjAxODczfQ.-OMdZwRNGVNY7GSjeLOo6zUYDVKwcCFuHNp4U2SWTbA
```

## 📝 How to Update Vercel Environment Variables

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project (portal or admin)
3. Go to Settings → Environment Variables
4. Add/update the variables listed above
5. Redeploy the application

## ✅ Verification

To verify environment variables are loaded:

```bash
# Check portal app
cd apps/portal
node -e "console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Check admin app
cd apps/admin
node -e "console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

## 🚀 Next Steps

1. Start development servers: `pnpm dev`
2. Access Portal: http://localhost:3001
3. Access Admin: http://localhost:3031
4. Login with: systemadmin@tin.info / 88888888

