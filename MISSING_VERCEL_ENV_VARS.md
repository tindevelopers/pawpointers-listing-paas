# Missing Vercel Environment Variables for pawpointers-admin

Based on the deployment logs and code analysis, here are the environment variables that need to be configured in your Vercel project.

## 🔴 Required Environment Variables

These are **critical** and must be set for the app to function:

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Note:** The code also checks for `SUPABASE_SERVICE_KEY` as an alias, but `SUPABASE_SERVICE_ROLE_KEY` is the standard name.

### Application URL
```bash
NEXT_PUBLIC_APP_URL=https://pawpointers-admin-tindeveloper.vercel.app
# Or your custom domain if configured
```

## 🟡 Recommended Environment Variables

These are recommended for full functionality:

### API Configuration
```bash
NEXT_PUBLIC_API_URL=https://api.yourplatform.com
# Or your API server URL
```

### Stripe (if using payments)
```bash
STRIPE_SECRET_KEY=sk_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 🟢 Optional Environment Variables

These enable additional features but are not required for basic functionality:

### AI/Knowledge Base Features
```bash
AI_GATEWAY_URL=https://your-ai-gateway.com
AI_GATEWAY_API_KEY=your-api-key
AI_MODEL=openai/gpt-4.1
EMBEDDING_MODEL=openai/text-embedding-3-small
PGVECTOR_TABLE=kb_chunks
KB_TABLE=knowledge_base_entries
```

### S3/File Storage (for knowledge base)
```bash
S3_ENDPOINT=https://s3.your-region.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

### CDN Configuration
```bash
NEXT_PUBLIC_CDN_URL=https://cdn.yourplatform.com
```

### Video Integration (Zoom)
```bash
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

### Video Integration (Microsoft Teams)
```bash
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
# Or your specific tenant ID
```

## How to Add Environment Variables in Vercel

1. Go to your Vercel project: https://vercel.com/tindeveloper/pawpointers-admin/settings/environment-variables

2. Add each variable for the appropriate environments:
   - **Production**: For production deployments
   - **Preview**: For preview deployments (PRs)
   - **Development**: For local development (if using Vercel CLI)

3. After adding variables, **redeploy** your application:
   ```bash
   vercel deploy --prod
   ```

## Current Status

✅ **Build**: Successful  
⚠️ **Runtime**: May have errors due to missing environment variables

## Next Steps

1. Add the **Required** environment variables first
2. Test the application at: https://pawpointers-admin-q5ddea9kv-tindeveloper.vercel.app
3. Check browser console and server logs for any missing variable errors
4. Add **Recommended** variables as needed for your use case
5. Add **Optional** variables only if you're using those features

## Verification

After adding environment variables, you can verify they're set by:
- Checking the Vercel dashboard → Settings → Environment Variables
- Or using the Vercel CLI: `vercel env ls pawpointers-admin`

