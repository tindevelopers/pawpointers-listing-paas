# Builder.io Turborepo Configuration Guide

## Overview

When connecting Builder.io to a Turborepo monorepo, you need to configure it to work with the `apps/portal` directory specifically.

## Method 1: Connect Repository (Recommended for Visual Editing)

### Step 1: Connect Your Repository

1. **In Builder.io Dashboard**:
   - Click **"Connect Repo"** button (blue button on Projects page)
   - Or go to: Settings → Integrations → GitHub

2. **Authorize Builder.io**:
   - Grant Builder.io access to your GitHub repository
   - Select your repository: `pawpointers-listing-paas` (or your repo name)

3. **Configure Repository Settings**:
   After connecting, you'll need to configure:
   
   - **Root Directory**: `apps/portal`
   - **Framework**: Next.js
   - **Build Command**: `cd ../.. && pnpm turbo build --filter=@tinadmin/portal`
   - **Install Command**: `cd ../.. && pnpm install`
   - **Dev Command**: `cd ../.. && pnpm turbo dev --filter=@tinadmin/portal`

### Step 2: Set Project Root Directory

In Builder.io project settings:

1. Go to **Settings** → **Project Settings**
2. Find **"Root Directory"** or **"Working Directory"**
3. Set it to: `apps/portal`
4. Save

### Step 3: Configure Build Settings

**Build Configuration**:
```
Root Directory: apps/portal
Framework: Next.js
Build Command: cd ../.. && pnpm turbo build --filter=@tinadmin/portal
Install Command: cd ../.. && pnpm install
Output Directory: .next
```

**Environment Variables** (set in Builder.io):
```
NEXT_PUBLIC_BUILDER_API_KEY=5a52d82defcf479eb265bdbda490769e
NEXT_PUBLIC_SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
```

## Method 2: Use Builder.io CLI (Alternative)

### Step 1: Navigate to Portal Directory

```bash
cd apps/portal
```

### Step 2: Initialize Builder.io CLI

```bash
npx @builder.io/cli init
```

The CLI will:
- Detect it's a Next.js app
- Create Builder.io config files
- Set up the project

### Step 3: Configure for Turborepo

After initialization, you may need to update the config to handle the monorepo structure.

## Method 3: Manual Configuration (No Repo Connection)

If you don't want to connect the repository, you can still use Builder.io:

1. **Create Pages Directly**:
   - Go to Builder.io → Content → Pages
   - Create new pages
   - Set URLs (e.g., `/about`, `/contact`)

2. **Use Visual Editor**:
   - Click "Open Visual Editor" on any page
   - Enter your local URL: `http://localhost:3030/your-page-path`
   - Edit visually

3. **No Build Integration**:
   - Pages are stored in Builder.io
   - Rendered via the catch-all route we set up
   - No code generation needed

## Recommended Approach

For your use case, **Method 3 (Manual Configuration)** is simplest:

✅ **No repository connection needed**  
✅ **Works immediately**  
✅ **Visual editing works**  
✅ **Pages render via catch-all route**  

### Quick Start (No Repo Connection)

1. **Create a Page in Builder.io**:
   - Go to Builder.io → Content → Pages
   - Click "New Page"
   - Set URL: `/test-page`
   - Design your page
   - Save & Publish

2. **Open Visual Editor**:
   - Click "Open Visual Editor"
   - Your portal opens at `http://localhost:3030/test-page`
   - Edit visually

3. **That's it!** No repo connection needed.

## If You Do Connect the Repo

### Builder.io Project Settings

When configuring the connected repository:

**General Settings**:
- **Project Name**: Portal
- **Root Directory**: `apps/portal`
- **Framework**: Next.js 15

**Build Settings**:
- **Build Command**: 
  ```bash
  cd ../.. && pnpm turbo build --filter=@tinadmin/portal
  ```
- **Install Command**:
  ```bash
  cd ../.. && pnpm install
  ```
- **Output Directory**: `.next`
- **Node Version**: 18 or 20

**Environment Variables** (in Builder.io):
Add all variables from `apps/portal/.env.local`:
- `NEXT_PUBLIC_BUILDER_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- etc.

## Troubleshooting

### Builder.io Can't Find Portal Files

**Issue**: Builder.io looks in root directory, not `apps/portal`

**Solution**: 
- Set **Root Directory** to `apps/portal` in project settings
- Or use relative paths: `../../apps/portal`

### Build Fails in Builder.io

**Issue**: Build command doesn't work in monorepo

**Solution**:
- Use full path commands: `cd /path/to/repo && pnpm turbo build --filter=@tinadmin/portal`
- Or create a build script in `apps/portal/package.json`:
  ```json
  "build:builder": "cd ../.. && pnpm turbo build --filter=@tinadmin/portal"
  ```

### Visual Editor Not Working

**Issue**: Can't connect to localhost

**Solution**:
- Use ngrok or similar tunnel for external access
- Or use Builder.io's preview mode without connecting repo

## Best Practice

For development, **don't connect the repo** - just use Builder.io's visual editor:

1. Create pages in Builder.io dashboard
2. Use "Open Visual Editor" to edit on your live site
3. Pages render via the catch-all route (`apps/portal/app/[...taxonomy]/page.tsx`)
4. No build integration needed

For production, you can optionally connect the repo for:
- Automatic deployments
- Code generation
- Component sync

But it's **not required** for visual editing to work!

