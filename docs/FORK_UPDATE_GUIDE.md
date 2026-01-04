# Fork Update Guide: Selective Program Updates

This guide explains how to selectively update only the programs you care about when pulling updates from the upstream repository.

## Overview

When you fork this repository and customize which programs are enabled, you can selectively pull updates for only the programs you're using. This keeps your fork up-to-date while avoiding conflicts with disabled programs.

## Prerequisites

1. You have a forked copy of the repository
2. You've configured `config/programs.config.ts` with your enabled programs
3. You have the upstream repository added as a remote

## Setup: Add Upstream Remote

First, add the upstream repository as a remote:

```bash
# Add upstream remote (replace with actual upstream URL)
git remote add upstream https://github.com/original-owner/listing-paas-base.git

# Verify remotes
git remote -v
# Should show:
# origin    https://github.com/your-username/your-fork.git (fetch)
# origin    https://github.com/your-username/your-fork.git (push)
# upstream  https://github.com/original-owner/listing-paas-base.git (fetch)
# upstream  https://github.com/original-owner/listing-paas-base.git (push)
```

## Method 1: Selective Merge by Path (Recommended)

This method allows you to merge only specific directories/files from upstream.

### Step 1: Fetch Latest Changes

```bash
# Fetch all updates from upstream
git fetch upstream

# Check what branch you're on (usually 'main' or 'master')
git branch
```

### Step 2: Identify Programs to Update

Based on your `config/programs.config.ts`, identify which programs you want to update:

```bash
# Example: You only have these enabled:
# - bookings (enabled: true)
# - crm (enabled: true)
# - billing (enabled: true)
```

### Step 3: Selective Merge by Path

Merge only the paths related to your enabled programs:

```bash
# Merge bookings-related files
git merge upstream/main --no-commit --no-ff
git checkout --theirs apps/admin/app/bookings/
git checkout --theirs apps/admin/app/api/bookings/
git checkout --theirs apps/admin/app/api/integrations/video/
git checkout --theirs packages/@listing-platform/booking/
git checkout --theirs database/schema/features/booking*.sql
git checkout --theirs supabase/migrations/*booking*.sql
git checkout --theirs supabase/migrations/*video*.sql

# Merge CRM-related files
git checkout --theirs apps/admin/app/crm/
git checkout --theirs apps/admin/app/api/crm/
git checkout --theirs packages/api-server/src/routes/crm.ts

# Merge billing-related files
git checkout --theirs apps/admin/app/saas/billing/
git checkout --theirs apps/admin/app/api/billing/

# Commit the selective merge
git commit -m "Update bookings, CRM, and billing from upstream"
```

### Step 4: Reset Other Changes

Reset changes to disabled programs:

```bash
# Reset changes to disabled programs (e.g., ecommerce)
git checkout --ours apps/admin/app/products-list/
git checkout --ours apps/admin/app/add-product/
git checkout --ours apps/admin/app/ecommerce/

# Or discard all changes to disabled programs
git checkout HEAD -- apps/admin/app/products-list/
git checkout HEAD -- apps/admin/app/add-product/
```

## Method 2: Using Git Sparse Checkout (Advanced)

This method uses Git's sparse checkout feature to only check out specific directories.

### Step 1: Enable Sparse Checkout

```bash
# Create a new branch for updates
git checkout -b update-selective-programs

# Enable sparse checkout
git config core.sparseCheckout true

# Create sparse checkout file
cat > .git/info/sparse-checkout << EOF
# Keep your config
config/programs.config.ts
config/features.config.ts

# Bookings program
apps/admin/app/bookings/
apps/admin/app/api/bookings/
apps/admin/app/api/integrations/video/
packages/@listing-platform/booking/
database/schema/features/booking*.sql
supabase/migrations/*booking*.sql
supabase/migrations/*video*.sql

# CRM program
apps/admin/app/crm/
apps/admin/app/api/crm/
packages/api-server/src/routes/crm.ts

# Billing program
apps/admin/app/saas/billing/
apps/admin/app/api/billing/

# Core files (always needed)
apps/admin/config/navigation-filtered.tsx
apps/admin/layout/AppSidebar.tsx
EOF

# Apply sparse checkout
git read-tree -mu HEAD
```

### Step 2: Merge from Upstream

```bash
# Merge only the sparse-checked-out files
git merge upstream/main
```

## Method 3: Cherry-Pick Specific Commits

If upstream uses clear commit messages, you can cherry-pick specific commits.

### Step 1: Find Relevant Commits

```bash
# Fetch upstream
git fetch upstream

# List commits with program names in messages
git log upstream/main --oneline --grep="booking\|crm\|billing" --since="2 weeks ago"

# Or search by file path
git log upstream/main --oneline -- apps/admin/app/bookings/
```

### Step 2: Cherry-Pick Commits

```bash
# Cherry-pick specific commits
git cherry-pick <commit-hash-1>
git cherry-pick <commit-hash-2>
git cherry-pick <commit-hash-3>
```

## Method 4: Automated Script (Best for Regular Updates)

Create a script that automatically updates based on your `programs.config.ts`:

### Create Update Script

```bash
# Create scripts/update-programs.sh
cat > scripts/update-programs.sh << 'EOF'
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Fetching latest changes from upstream...${NC}"
git fetch upstream

# Read enabled programs from config
ENABLED_PROGRAMS=$(grep -A 2 "enabled: true" config/programs.config.ts | grep "id:" | awk '{print $2}' | tr -d "',")

echo -e "${YELLOW}Enabled programs:${NC} $ENABLED_PROGRAMS"

# Program to path mapping
declare -A PROGRAM_PATHS
PROGRAM_PATHS["bookings"]="apps/admin/app/bookings/ apps/admin/app/api/bookings/ apps/admin/app/api/integrations/video/ packages/@listing-platform/booking/ database/schema/features/booking*.sql supabase/migrations/*booking*.sql supabase/migrations/*video*.sql"
PROGRAM_PATHS["crm"]="apps/admin/app/crm/ apps/admin/app/api/crm/ packages/api-server/src/routes/crm.ts"
PROGRAM_PATHS["billing"]="apps/admin/app/saas/billing/ apps/admin/app/api/billing/"
PROGRAM_PATHS["ai-assistant"]="apps/admin/app/ai-assistant/ apps/admin/app/text-generator/ apps/admin/app/image-generator/"
PROGRAM_PATHS["knowledge-base"]="apps/admin/app/knowledge-base/"
PROGRAM_PATHS["admin"]="apps/admin/app/saas/admin/ apps/admin/app/api/admin/"
PROGRAM_PATHS["system-admin"]="apps/admin/app/saas/admin/system-admin/"
PROGRAM_PATHS["saas"]="apps/admin/app/saas/"

# Merge upstream
echo -e "${GREEN}Merging from upstream...${NC}"
git merge upstream/main --no-commit --no-ff

# Update only enabled programs
for program in $ENABLED_PROGRAMS; do
    if [ -n "${PROGRAM_PATHS[$program]}" ]; then
        echo -e "${YELLOW}Updating program: $program${NC}"
        for path in ${PROGRAM_PATHS[$program]}; do
            if [ -e "$path" ] || ls $path 2>/dev/null; then
                git checkout --theirs "$path" 2>/dev/null || true
            fi
        done
    fi
done

# Keep your config files
echo -e "${GREEN}Preserving your configuration...${NC}"
git checkout --ours config/programs.config.ts
git checkout --ours config/features.config.ts

# Show status
echo -e "${GREEN}Update complete! Review changes:${NC}"
git status

echo -e "${YELLOW}To commit: git commit -m 'Update enabled programs from upstream'${NC}"
EOF

chmod +x scripts/update-programs.sh
```

### Use the Script

```bash
# Run the update script
./scripts/update-programs.sh

# Review changes
git status
git diff

# Commit if everything looks good
git commit -m "Update enabled programs from upstream"
```

## Example Workflow

Here's a complete example for updating only the Bookings program:

```bash
# 1. Ensure you're on your main branch
git checkout main

# 2. Fetch latest from upstream
git fetch upstream

# 3. Create a backup branch (safety first!)
git checkout -b backup-before-update
git checkout main

# 4. Merge from upstream (don't commit yet)
git merge upstream/main --no-commit --no-ff

# 5. Update only bookings-related files
git checkout --theirs apps/admin/app/bookings/
git checkout --theirs apps/admin/app/api/bookings/
git checkout --theirds apps/admin/app/api/integrations/video/
git checkout --theirs packages/@listing-platform/booking/
git checkout --theirs database/schema/features/booking*.sql
git checkout --theirs supabase/migrations/*booking*.sql
git checkout --theirs supabase/migrations/*video*.sql

# 6. Keep your config
git checkout --ours config/programs.config.ts

# 7. Review changes
git status
git diff --staged

# 8. Commit
git commit -m "Update Bookings program from upstream"

# 9. Test your application
npm run dev

# 10. If everything works, push
git push origin main
```

## Handling Conflicts

If you have conflicts in files you want to update:

```bash
# See conflicted files
git status

# For files you want to update, accept upstream version
git checkout --theirs path/to/conflicted/file.ts

# For files you've customized, keep your version
git checkout --ours path/to/your/custom/file.ts

# After resolving, add and commit
git add .
git commit -m "Resolve conflicts, update enabled programs"
```

## Program Path Mapping Reference

Here's a reference of which paths correspond to which programs:

| Program | Key Paths |
|---------|-----------|
| **bookings** | `apps/admin/app/bookings/`, `apps/admin/app/api/bookings/`, `packages/@listing-platform/booking/` |
| **crm** | `apps/admin/app/crm/`, `apps/admin/app/api/crm/` |
| **ai-assistant** | `apps/admin/app/ai-assistant/`, `apps/admin/app/text-generator/`, `apps/admin/app/image-generator/` |
| **knowledge-base** | `apps/admin/app/knowledge-base/` |
| **ecommerce** | `apps/admin/app/products-list/`, `apps/admin/app/add-product/` |
| **billing** | `apps/admin/app/saas/billing/`, `apps/admin/app/api/billing/` |
| **admin** | `apps/admin/app/saas/admin/`, `apps/admin/app/api/admin/` |
| **system-admin** | `apps/admin/app/saas/admin/system-admin/` |
| **saas** | `apps/admin/app/saas/` |
| **calendar** | `apps/admin/app/calendar/` |
| **task** | `apps/admin/app/task-list/`, `apps/admin/app/task-kanban/` |
| **forms** | `apps/admin/app/form-elements/`, `apps/admin/app/form-layout/` |
| **tables** | `apps/admin/app/basic-tables/`, `apps/admin/app/data-tables/` |

## Best Practices

1. **Always backup first**: Create a backup branch before updating
2. **Test after updates**: Run your test suite after pulling updates
3. **Review changes**: Use `git diff` to review what changed
4. **Keep config separate**: Never overwrite your `programs.config.ts`
5. **Document customizations**: Keep notes on what you've customized
6. **Regular updates**: Update more frequently to avoid large conflicts

## Troubleshooting

**Q: I accidentally merged everything, how do I undo?**
```bash
# Reset to before the merge
git reset --hard HEAD~1

# Or reset to a specific commit
git reset --hard <commit-hash>
```

**Q: How do I see what changed in upstream?**
```bash
# Compare your branch with upstream
git diff main upstream/main

# See commits you don't have
git log main..upstream/main --oneline
```

**Q: Can I update multiple programs at once?**
Yes! Just include multiple paths in your merge command:
```bash
git checkout --theirs apps/admin/app/bookings/ apps/admin/app/crm/ apps/admin/app/saas/billing/
```

## Summary

The key to selective updates is:
1. **Fetch** from upstream
2. **Merge** without committing (`--no-commit`)
3. **Selectively accept** changes for enabled programs (`--theirs`)
4. **Keep** your configuration (`--ours`)
5. **Review** and **commit**

This workflow ensures you only update the programs you're using while keeping your customizations intact.


