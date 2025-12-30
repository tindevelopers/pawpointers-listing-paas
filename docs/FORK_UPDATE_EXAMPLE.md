# Fork Update Example: Updating Only Bookings Program

This is a step-by-step example showing how to update only the Bookings program from upstream.

## Scenario

- You forked the repository
- You only enabled: Dashboard, Bookings, CRM, and Billing
- Upstream released updates to Bookings, CRM, and a new E-commerce feature
- You want to update Bookings only (not E-commerce since it's disabled)

## Step-by-Step Example

### 1. Initial Setup (One-time)

```bash
# Add upstream remote
git remote add upstream https://github.com/original-owner/listing-paas-base.git

# Verify
git remote -v
```

### 2. Check Your Configuration

```bash
# View your enabled programs
cat config/programs.config.ts | grep -A 2 "enabled: true"

# Output shows:
# bookings: { enabled: true }
# crm: { enabled: true }
# billing: { enabled: true }
# ecommerce: { enabled: false }  ← You don't want this
```

### 3. Fetch Latest Changes

```bash
# Fetch all updates from upstream
git fetch upstream

# See what's new
git log HEAD..upstream/main --oneline

# Example output:
# abc1234 Add new booking features
# def5678 Update CRM contacts
# ghi9012 Add e-commerce module  ← You don't need this
```

### 4. Create Backup Branch (Safety First!)

```bash
# Create backup before updating
git checkout -b backup-$(date +%Y%m%d)
git checkout main
```

### 5. Start Selective Merge

```bash
# Merge from upstream but don't commit yet
git merge upstream/main --no-commit --no-ff
```

### 6. Update Only Bookings

```bash
# Accept upstream changes for bookings-related files
git checkout --theirs apps/admin/app/bookings/
git checkout --theirs apps/admin/app/api/bookings/
git checkout --theirs apps/admin/app/api/integrations/video/
git checkout --theirs packages/@listing-platform/booking/
git checkout --theirs database/schema/features/booking*.sql
git checkout --theirs supabase/migrations/*booking*.sql
git checkout --theirs supabase/migrations/*video*.sql
```

### 7. Keep Your Configuration

```bash
# Always keep your program configuration
git checkout --ours config/programs.config.ts
git checkout --ours config/features.config.ts
```

### 8. Reset Unwanted Changes (E-commerce)

```bash
# Discard changes to disabled programs
git checkout HEAD -- apps/admin/app/products-list/
git checkout HEAD -- apps/admin/app/add-product/
git checkout HEAD -- apps/admin/app/ecommerce/
```

### 9. Review Changes

```bash
# See what will be committed
git status

# Review the actual changes
git diff --staged

# Example output shows:
# Modified: apps/admin/app/bookings/page.tsx  ← Good!
# Modified: packages/@listing-platform/booking/src/index.ts  ← Good!
# Modified: apps/admin/app/products-list/page.tsx  ← Should be reset
```

### 10. Fix Any Issues

If you see unwanted files:

```bash
# Reset them
git reset HEAD apps/admin/app/products-list/
git checkout HEAD -- apps/admin/app/products-list/
```

### 11. Commit

```bash
# Commit only the bookings updates
git commit -m "Update Bookings program from upstream

- Updated booking pages and components
- Updated booking API routes
- Updated booking SDK
- Updated database migrations

Excluded: E-commerce (disabled in config)"
```

### 12. Test

```bash
# Start your dev server
npm run dev

# Test bookings functionality
# - Create a booking
# - View bookings list
# - Check availability calendar
```

### 13. Push

```bash
# Push to your fork
git push origin main
```

## Using the Automated Script

For easier updates, use the provided script:

```bash
# Make sure script is executable
chmod +x scripts/update-programs.sh

# Run the script
./scripts/update-programs.sh

# Follow the prompts
# Review changes
git diff --staged

# Commit if everything looks good
git commit -m "Update enabled programs from upstream"
```

## What Gets Updated vs. What Doesn't

### ✅ Updated (Bookings - enabled)
- `apps/admin/app/bookings/` - All booking pages
- `apps/admin/app/api/bookings/` - Booking API routes
- `packages/@listing-platform/booking/` - Booking SDK
- Database migrations for bookings

### ❌ Not Updated (E-commerce - disabled)
- `apps/admin/app/products-list/` - Kept at your version
- `apps/admin/app/add-product/` - Kept at your version
- E-commerce migrations - Not applied

### 🔒 Always Preserved
- `config/programs.config.ts` - Your configuration
- `config/features.config.ts` - Your feature flags
- Any customizations you made

## Handling Conflicts

If there are conflicts in files you want to update:

```bash
# See conflicted files
git status

# For bookings files (you want upstream version)
git checkout --theirs apps/admin/app/bookings/page.tsx

# For config files (you want your version)
git checkout --ours config/programs.config.ts

# After resolving all conflicts
git add .
git commit -m "Resolve conflicts, update bookings"
```

## Quick Reference: Program Paths

When updating specific programs, here are the key paths:

**Bookings:**
```bash
apps/admin/app/bookings/
apps/admin/app/api/bookings/
apps/admin/app/api/integrations/video/
packages/@listing-platform/booking/
database/schema/features/booking*.sql
supabase/migrations/*booking*.sql
```

**CRM:**
```bash
apps/admin/app/crm/
apps/admin/app/api/crm/
packages/api-server/src/routes/crm.ts
```

**Billing:**
```bash
apps/admin/app/saas/billing/
apps/admin/app/api/billing/
apps/admin/app/saas/invoicing/
```

## Summary

The key steps are:
1. **Fetch** from upstream
2. **Merge** without committing
3. **Selectively accept** changes for enabled programs
4. **Reset** changes for disabled programs
5. **Preserve** your configuration
6. **Review**, **test**, and **commit**

This ensures you only get updates for programs you're using while keeping your customizations safe!


