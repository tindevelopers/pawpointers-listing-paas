# Selective Update Scripts

Quick reference for the selective update system.

## Available Scripts

### Main Scripts

- **selective-update.ts** - Main update script
- **detect-conflicts.ts** - Pre-update conflict detection
- **resolve-dependencies.ts** - Dependency resolution
- **validate-update.ts** - Post-update validation
- **rollback-update.ts** - Rollback utility

## Quick Commands

### Using npm scripts (recommended)

```bash
# Check for conflicts
pnpm update:check packages/@listing-platform/crm

# Preview update
pnpm update:preview --package crm

# Update a package
pnpm update:package crm

# Validate update
pnpm update:validate packages/@listing-platform/crm

# Rollback
pnpm update:rollback

# View history
pnpm update:history
```

### Using tsx directly

```bash
# Update CRM package
tsx scripts/selective-update.ts --package crm

# Check conflicts
tsx scripts/detect-conflicts.ts packages/@listing-platform/crm

# Resolve dependencies
tsx scripts/resolve-dependencies.ts packages/@listing-platform/crm

# Validate update
tsx scripts/validate-update.ts packages/@listing-platform/crm

# Rollback
tsx scripts/rollback-update.ts
```

## Common Workflows

### Update Single Package

```bash
# 1. Check conflicts
pnpm update:check packages/@listing-platform/crm

# 2. Preview
pnpm update:preview --package crm

# 3. Update
pnpm update:package crm

# 4. Validate
pnpm update:validate packages/@listing-platform/crm
```

### Update Multiple Packages

```bash
tsx scripts/selective-update.ts --packages crm,reviews,maps
```

### Emergency Rollback

```bash
# Rollback last update
pnpm update:rollback

# Force rollback
tsx scripts/rollback-update.ts --force
```

## Configuration

Edit `config/update.config.ts` to:
- Enable/disable packages for updates
- Set conflict resolution strategies
- Configure protected paths

See [SELECTIVE_UPDATES.md](../docs/SELECTIVE_UPDATES.md) for full documentation.

