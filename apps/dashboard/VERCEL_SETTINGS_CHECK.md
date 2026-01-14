# Vercel Dashboard Settings Verification

## Current Status

✅ **Root Directory**: `apps/dashboard` (CORRECT)

## Issues Found

### 1. Build Command ❌
**Current**: `turbo run build --filter=@repo/dashboard`  
**Should be**: `cd ../.. && pnpm install && pnpm turbo build --filter=@tinadmin/dashboard`

**Why**: 
- Must use `pnpm` (not npm) - this is a pnpm workspace
- Must navigate to repo root (`cd ../..`) before running turbo
- Package name is `@tinadmin/dashboard` (not `@repo/dashboard`)

### 2. Install Command ❌
**Current**: `npm ci --no-audit --no-fund`  
**Should be**: `cd ../.. && pnpm install`

**Why**:
- Must use `pnpm` (not npm) - this is a pnpm workspace
- Must run from repo root to install all workspace dependencies
- The `vercel.json` already has this correct, but project settings override it

## Required Actions

### Option 1: Update in Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/tindeveloper/pawpointers-dashboard/settings/general
2. Scroll to **Build & Development Settings**
3. Update:
   - **Build Command**: `cd ../.. && pnpm install && pnpm turbo build --filter=@tinadmin/dashboard`
   - **Install Command**: `cd ../.. && pnpm install`
4. Save changes
5. Redeploy

### Option 2: Verify vercel.json is Being Read

The `apps/dashboard/vercel.json` file has the correct settings:
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm turbo build --filter=@tinadmin/dashboard",
  "installCommand": "cd ../.. && pnpm install"
}
```

However, Vercel project settings take precedence. You may need to:
1. Remove the build/install commands from Vercel project settings (leave blank)
2. This will force Vercel to read from `vercel.json`

## Verification Checklist

- [x] Root Directory: `apps/dashboard`
- [ ] Build Command: Uses `pnpm` and `@tinadmin/dashboard`
- [ ] Install Command: Uses `pnpm` and runs from root
- [ ] Package Manager: Set to `pnpm` in project settings
- [ ] Node.js Version: 24.x (current)

## Package Name Reference

- **Package Name**: `@tinadmin/dashboard` (from `apps/dashboard/package.json`)
- **Filter**: `--filter=@tinadmin/dashboard`
- **NOT**: `@repo/dashboard` (incorrect)

## Turborepo Configuration

The `turbo.json` at repo root defines:
- Build task dependencies: `dependsOn: ["^build"]` (builds dependencies first)
- Outputs: `.next/**` for Next.js apps
- Environment variables: All required env vars are listed

## Next Steps

1. Update Build Command in Vercel Dashboard
2. Update Install Command in Vercel Dashboard  
3. Ensure Package Manager is set to `pnpm`
4. Test deployment
5. Verify build succeeds

