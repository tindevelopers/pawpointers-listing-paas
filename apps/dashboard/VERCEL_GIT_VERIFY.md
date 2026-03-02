# Verify Vercel Git Connection for pawpointers-dashboard

When you push to `origin` (GitHub), Vercel should auto-deploy. Use these steps to confirm the connection.

## 1. Check Git connection in Vercel

1. Go to **https://vercel.com/tindeveloper/pawpointers-dashboard/settings/git**
2. Confirm:
   - **Connected Git Repository**: `tindevelopers/pawpointers-listing-paas`
   - **Production Branch**: Usually `main` — only this branch’s deploys go to Production
   - **Preview deployments**: Enabled for other branches (e.g. `develop`)

## 2. Branch behavior

| Branch   | Deployment type | Where to see it                          |
|----------|-----------------|------------------------------------------|
| `main`   | Production      | Deployments tab (default view)           |
| `develop`| Preview         | Deployments tab → filter "All Branches" or "develop" |

If you push to `develop`, look for **Preview** deployments, not Production.

## 3. Reconnect Git if needed

If the repo is not connected or deploys don’t trigger:

1. Go to **Settings → Git**
2. Click **Disconnect** (if connected)
3. Click **Connect Git Repository**
4. Choose **GitHub** → `tindevelopers/pawpointers-listing-paas`
5. Set **Root Directory** to `apps/dashboard`
6. Save

## 4. GitHub Actions (alternative path)

The workflow `.github/workflows/vercel-deploy.yml` also deploys on push to `main` and `develop` when `apps/dashboard/**` changes.

**Required secrets** (GitHub → Settings → Secrets → Actions):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID` or `VERCEL_PROJECT_ID_DASHBOARD` = `prj_skdvchiLo7WzNjHLjv1vb3806wUl`

## 5. Quick test

```bash
# Make a small change in apps/dashboard
echo "// deploy test" >> apps/dashboard/app/layout.tsx
git add apps/dashboard/app/layout.tsx
git commit -m "chore: trigger dashboard deploy test"
git push origin develop
```

Then check:

- **Vercel**: Deployments tab (filter by `develop`)
- **GitHub**: Actions tab for `vercel-deploy` workflow
