# Vercel Auto-Deploy Configuration

## Overview

The API server is configured to automatically deploy to Vercel when changes are pushed to the `main` branch. This happens via two mechanisms:

1. **Vercel Git Integration** (Primary) - Vercel automatically deploys when code is pushed to GitHub
2. **GitHub Actions Workflow** (Backup) - `.github/workflows/vercel-deploy.yml` also triggers deployments

## How It Works

### Path-Based Change Detection

The GitHub Actions workflow uses path filters to detect changes:

```yaml
api:
  - 'packages/api-server/**'
  - 'packages/@tinadmin/core/**'
  - 'packages/@tinadmin/config/**'
  - 'packages/@listing-platform/**'
  - 'config/**'
  - 'package.json'
  - 'pnpm-lock.yaml'
  - 'pnpm-workspace.yaml'
```

**The `deploy-api` job only runs if files in these paths are changed.**

### Deployment Triggers

Deployments are triggered when:
- Code is pushed to `main` branch AND files in `packages/api-server/**` are changed
- Code is pushed to `pawpointers-portal` branch AND files in `packages/api-server/**` are changed
- Pull requests are opened against `main` or `pawpointers-portal` (preview deployments)

## Verifying Auto-Deploy is Enabled

### 1. Check Vercel Git Integration

1. Go to Vercel Dashboard → Your API Server Project → Settings → Git
2. Verify:
   - ✅ Repository is connected
   - ✅ Production Branch is set to `main`
   - ✅ Auto-deploy is enabled

### 2. Check GitHub Actions Workflow

1. Go to GitHub → Actions tab
2. Look for "Vercel Deployment" workflow
3. Verify it runs when you push to `main`

### 3. Test the Setup

Make a small change to `packages/api-server`:

```bash
# Make a trivial change
echo "# Test" >> packages/api-server/README.md
git add packages/api-server/README.md
git commit -m "test: trigger API server deployment"
git push origin main
```

**Expected behavior:**
- ✅ Vercel automatically starts a deployment (check Vercel dashboard)
- ✅ GitHub Actions workflow runs `deploy-api` job (check GitHub Actions)

## Troubleshooting

### Issue: Changes to `packages/api-server` don't trigger deployment

**Check:**
1. Are you pushing to `main` or `pawpointers-portal` branch? (Workflow only triggers on these)
2. Did you actually change files in `packages/api-server/**`?
3. Check GitHub Actions logs - is the `detect-changes` job showing `api: 'true'`?

### Issue: GitHub Actions workflow fails

**Common causes:**
1. Missing `VERCEL_TOKEN` secret in GitHub
2. Missing `VERCEL_ORG_ID` secret in GitHub
3. Project not linked in Vercel (no `.vercel` folder)

**Fix:**
```bash
# Link the project
cd packages/api-server
vercel link
# Follow prompts to select org and project
```

### Issue: Vercel doesn't auto-deploy

**Check:**
1. Vercel Dashboard → Settings → Git → Verify repository connection
2. Ensure "Auto-deploy" toggle is ON
3. Check if there are any deployment errors in Vercel dashboard

## Manual Deployment

If auto-deploy isn't working, you can manually trigger:

```bash
cd packages/api-server
vercel --prod
```

Or via GitHub Actions:
- Go to GitHub → Actions → "Vercel Deployment" → "Run workflow"

## Configuration Files

- **Workflow:** `.github/workflows/vercel-deploy.yml`
- **Vercel Config:** `packages/api-server/vercel.json`
- **Package Config:** `packages/api-server/package.json`

