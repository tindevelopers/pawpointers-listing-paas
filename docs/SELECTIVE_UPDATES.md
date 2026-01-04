# Selective Update Guide

This guide explains how to selectively update only specific packages/features from the upstream base repository while protecting your custom changes.

## Overview

The selective update system allows you to:

- Update only the packages you want (e.g., CRM, Reviews, Maps)
- Automatically handle dependencies
- Detect conflicts before applying updates
- Protect your customizations
- Rollback easily if something goes wrong

## Quick Start

### 1. Configure Which Packages to Update

Edit `config/update.config.ts` to enable/disable updates for specific packages:

```typescript
export const updateConfig: Record<string, PackageUpdateConfig> = {
  'packages/@listing-platform/crm': {
    enabled: true,           // Enable updates for CRM
    strategy: 'merge',        // Merge changes
    conflictResolution: 'manual', // Require manual conflict resolution
  },
  'packages/@listing-platform/reviews': {
    enabled: false,           // Disable updates for Reviews
    strategy: 'skip',
  },
  // ... other packages
};
```

### 2. Check for Conflicts (Optional but Recommended)

Before updating, check for potential conflicts:

```bash
tsx scripts/detect-conflicts.ts packages/@listing-platform/crm
```

### 3. Preview Update (Dry Run)

See what would be updated without making changes:

```bash
tsx scripts/selective-update.ts --package crm --dry-run
```

### 4. Apply Update

Update the CRM package and its dependencies:

```bash
tsx scripts/selective-update.ts --package crm
```

### 5. Validate Update

After updating, validate that everything still works:

```bash
tsx scripts/validate-update.ts packages/@listing-platform/crm
```

## Configuration

### Update Configuration File

The `config/update.config.ts` file controls which packages can be updated and how.

#### Package Configuration Options

- **enabled**: `boolean` - Whether this package can be updated
- **strategy**: `'merge' | 'replace' | 'skip'` - How to apply updates
- **dependencies**: `string[]` - Other packages that must be updated together
- **protectedPaths**: `string[]` - Paths within package to protect
- **conflictResolution**: `'theirs' | 'ours' | 'manual'` - How to resolve conflicts

#### Example Configuration

```typescript
'packages/@listing-platform/crm': {
  enabled: true,
  strategy: 'merge',
  dependencies: [
    'packages/@listing-platform/shared',
    'packages/@listing-platform/design-tokens'
  ],
  conflictResolution: 'manual',
  description: 'CRM and lead management SDK',
}
```

### Protected Paths

Paths listed in `protectedPaths` will never be updated from upstream. These typically include:

- Configuration files (`config/listing.config.ts`, `config/brand.config.ts`)
- Custom components (`apps/portal/components/**`)
- Admin customizations (`apps/admin/**`)
- Environment files (`.env.local`)

## Usage Examples

### Update Single Package

```bash
# Update CRM package
tsx scripts/selective-update.ts --package crm

# Preview first
tsx scripts/selective-update.ts --package crm --dry-run
```

### Update Multiple Packages

```bash
# Update CRM, Reviews, and Maps
tsx scripts/selective-update.ts --packages crm,reviews,maps
```

### Update from Different Branch

```bash
# Update from upstream develop branch
tsx scripts/selective-update.ts --package crm --upstream-branch develop
```

### Skip Validation

```bash
# Update without running validation (faster, but less safe)
tsx scripts/selective-update.ts --package crm --skip-validation
```

### Skip Conflict Check

```bash
# Update without checking for conflicts first
tsx scripts/selective-update.ts --package crm --skip-conflict-check
```

## Conflict Resolution

### Automatic Resolution

Set `conflictResolution` in config:

- **'theirs'**: Always take upstream version
- **'ours'**: Always keep local version
- **'manual'**: Require manual resolution (default for most packages)

### Manual Resolution

If conflicts are detected:

1. Review conflicted files:
   ```bash
   git status
   ```

2. Resolve conflicts in each file:
   ```bash
   # Edit conflicted files
   # Look for <<<<<<< markers
   ```

3. Mark as resolved:
   ```bash
   git add <resolved-file>
   ```

4. Continue with update

## Dependency Resolution

The system automatically resolves dependencies. For example, updating CRM will also update:
- `@listing-platform/shared`
- `@listing-platform/design-tokens`

Dependencies are updated in the correct order (dependencies first, then dependents).

### Checking Dependencies

```bash
# See what dependencies CRM has
tsx scripts/resolve-dependencies.ts packages/@listing-platform/crm
```

## Rollback

### Rollback Last Update

```bash
# Rollback to backup branch
tsx scripts/rollback-update.ts

# Force rollback (hard reset)
tsx scripts/rollback-update.ts --force
```

### List Rollback Points

```bash
# See all available rollback points
tsx scripts/rollback-update.ts list
```

### Manual Rollback

If you know the backup branch name:

```bash
# Check update history
cat .updates/update-history.json

# Rollback to specific backup branch
git reset --hard backup-before-update-2024-01-15T10-30-00-000Z
```

## Update Workflow

### Recommended Workflow

1. **Commit Current Changes**
   ```bash
   git add .
   git commit -m "Save state before update"
   ```

2. **Check Conflicts**
   ```bash
   tsx scripts/detect-conflicts.ts packages/@listing-platform/crm
   ```

3. **Preview Update**
   ```bash
   tsx scripts/selective-update.ts --package crm --dry-run
   ```

4. **Apply Update**
   ```bash
   tsx scripts/selective-update.ts --package crm
   ```

5. **Validate**
   ```bash
   tsx scripts/validate-update.ts packages/@listing-platform/crm
   ```

6. **Test**
   ```bash
   pnpm dev
   # Test the updated feature
   ```

7. **Commit Update**
   ```bash
   git add .
   git commit -m "Update CRM package from upstream"
   ```

## Troubleshooting

### "Upstream remote not found"

Add the upstream remote:

```bash
git remote add upstream https://github.com/tindevelopers/listing-paas-base.git
```

### "Missing dependencies"

Enable missing dependencies in `config/update.config.ts`:

```typescript
'packages/@listing-platform/shared': {
  enabled: true,  // Enable this
  // ...
}
```

### "Conflicts detected"

Resolve conflicts manually or change conflict resolution strategy:

```typescript
conflictResolution: 'theirs',  // Auto-resolve by taking upstream
```

### "Validation failed"

Check the error messages and fix issues:

```bash
# Run type check
pnpm type-check

# Build packages
pnpm build --filter=@listing-platform/crm
```

### "Package not found"

Use the full path:

```bash
# Instead of: --package crm
tsx scripts/selective-update.ts --package packages/@listing-platform/crm
```

## Best Practices

1. **Always use dry-run first** - Preview changes before applying
2. **Check conflicts** - Know what will change before updating
3. **Create backups** - The system creates backup branches automatically
4. **Test after updates** - Run validation and manual testing
5. **Update incrementally** - Update one package at a time when possible
6. **Review changes** - Use `git diff` to see what changed
7. **Document customizations** - Note what you've customized so you know what to protect

## Protected Files

These files are automatically protected and will never be updated:

- `config/listing.config.ts` - Your listing configuration
- `config/brand.config.ts` - Your branding
- `config/features.config.ts` - Your feature flags
- `apps/portal/components/**` - Your custom components
- `apps/admin/**` - Your admin customizations
- `.env.local` - Your environment variables

## Update History

Update history is tracked in `.updates/update-history.json`:

```json
[
  {
    "packages": ["packages/@listing-platform/crm"],
    "upstreamBranch": "upstream/main",
    "upstreamCommit": "abc123...",
    "localCommit": "def456...",
    "backupBranch": "backup-before-update-2024-01-15T10-30-00",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
]
```

## Advanced Usage

### Custom Update Strategy

You can customize the update strategy per package:

```typescript
'packages/@listing-platform/crm': {
  enabled: true,
  strategy: 'replace',  // Replace entire package instead of merging
  // ...
}
```

### Protect Specific Files

Protect specific files within a package:

```typescript
'packages/@listing-platform/crm': {
  enabled: true,
  protectedPaths: [
    'src/custom-components.ts',  // Protect this file
  ],
  // ...
}
```

### Batch Updates

Update multiple packages at once:

```bash
tsx scripts/selective-update.ts --packages crm,reviews,maps,booking
```

## Integration with CI/CD

You can integrate selective updates into your CI/CD pipeline:

```yaml
# .github/workflows/update-packages.yml
name: Update Packages

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: tsx scripts/selective-update.ts --package crm --dry-run
      # Review output, then apply if safe
```

## See Also

- [FORKING.md](../FORKING.md) - Fork setup guide
- [CUSTOMIZATION.md](./CUSTOMIZATION.md) - Customization guide
- [config/update.config.ts](../config/update.config.ts) - Update configuration

