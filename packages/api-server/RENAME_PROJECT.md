# Renaming Vercel Project: api-server → pawpointers-api-server

## What Happens When You Rename

**✅ Preserved:**
- Project ID (stays the same)
- Environment variables (all preserved)
- Deployment history (all deployments remain)
- Code and configuration (unchanged)
- Custom domains (if configured, stay the same)

**⚠️ Changes:**
- Project display name: `api-server` → `pawpointers-api-server`
- Default Vercel URL: `api-server-tindeveloper.vercel.app` → `pawpointers-api-server-tindeveloper.vercel.app`
- Project name in dashboard

**❌ Does NOT affect:**
- Active deployments (they continue working)
- Environment variables
- Build configuration
- Git integration
- Webhooks

## How to Rename

### Option 1: Via Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/tindeveloper/api-server/settings/general
2. Find "Project Name" field
3. Change from `api-server` to `pawpointers-api-server`
4. Click "Save"
5. Done! ✅

### Option 2: Via CLI (Create New Project)

If you prefer to create a fresh project:

1. **Create new project in dashboard:**
   - Go to https://vercel.com/new
   - Create project named `pawpointers-api-server`
   - Link to your GitHub repo
   - Set root directory to `packages/api-server`

2. **Copy environment variables:**
   ```bash
   # From old project (api-server)
   vercel env ls
   
   # Add to new project (pawpointers-api-server)
   # Use vercel env add for each variable
   ```

3. **Link to new project:**
   ```bash
   cd packages/api-server
   rm -rf .vercel
   vercel link
   # Select: pawpointers-api-server
   ```

## After Renaming

1. **Update any references:**
   - Update frontend apps to use new API URL (if using default Vercel URL)
   - Update documentation
   - Update CI/CD scripts if referencing project name

2. **Verify deployment:**
   ```bash
   cd packages/api-server
   vercel deploy --prod
   ```

3. **Test the new URL:**
   ```bash
   curl https://pawpointers-api-server-tindeveloper.vercel.app/health
   ```

## Current Project Info

- **Current Name:** `api-server`
- **Project ID:** `prj_QaCCHVYM3EPQ8RlLm4TwOxSLDM2l`
- **Current URL:** `https://api-server-tindeveloper.vercel.app`
- **New URL (after rename):** `https://pawpointers-api-server-tindeveloper.vercel.app`

## Recommendation

**Use Option 1 (Dashboard rename)** - It's the simplest and preserves everything automatically.

