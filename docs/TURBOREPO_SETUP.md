# Turborepo Setup Guide

Complete guide for setting up Turborepo with listing platform SDKs and Next.js applications.

## Overview

Turborepo enables you to manage multiple packages and apps in a single monorepo, with fast builds, caching, and hot reloading.

## Project Structure

```
listing-platform-as-a-service/
├── apps/
│   ├── admin/              # Admin panel (Next.js)
│   └── portal/             # Public portal (Next.js)
├── packages/
│   ├── @listing-platform/
│   │   ├── base/           # Base package
│   │   ├── config/         # Configuration system
│   │   ├── core/           # Core utilities
│   │   ├── design-tokens/  # Design tokens
│   │   ├── reviews/        # Reviews SDK
│   │   ├── maps/           # Maps SDK
│   │   └── booking/        # Booking SDK
│   └── your-custom/        # Your custom packages
├── turbo.json              # Turborepo config
├── pnpm-workspace.yaml     # pnpm workspace config
└── package.json            # Root package.json
```

## Initial Setup

### 1. Install Turborepo

```bash
pnpm add -D turbo
```

### 2. Configure turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### 3. Configure pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/@listing-platform/*'
```

### 4. Root package.json Scripts

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "clean": "turbo run clean"
  }
}
```

## Package Configuration

### SDK Package (e.g., reviews)

```json
{
  "name": "@listing-platform/reviews",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@listing-platform/design-tokens": "workspace:*"
  }
}
```

### App Package (e.g., portal)

```json
{
  "name": "portal",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@listing-platform/reviews": "workspace:*",
    "@listing-platform/maps": "workspace:*",
    "@listing-platform/design-tokens": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Development Workflow

### Start All Apps

```bash
# Start all apps and packages in dev mode
pnpm dev

# Start specific app
pnpm --filter portal dev

# Start SDK in watch mode
pnpm --filter @listing-platform/reviews dev
```

### Build Everything

```bash
# Build all packages and apps
pnpm build

# Build specific package
pnpm --filter @listing-platform/reviews build

# Build app (will build dependencies first)
pnpm --filter portal build
```

### Type Checking

```bash
# Type check everything
pnpm type-check

# Type check specific package
pnpm --filter @listing-platform/reviews type-check
```

## Hot Reloading

### SDK Development

1. Start SDK in watch mode:
   ```bash
   pnpm --filter @listing-platform/reviews dev
   ```

2. Start app that uses SDK:
   ```bash
   pnpm --filter portal dev
   ```

3. Changes to SDK automatically rebuild and reflect in app

### App Development

Changes to apps hot reload automatically with Next.js Fast Refresh.

## Caching

Turborepo caches build outputs:

- **Cache hits**: Instant builds
- **Cache misses**: Full builds
- **Remote cache**: Share cache across team (optional)

### View Cache

```bash
# See cache status
turbo run build --dry-run

# Clear cache
turbo run build --force
```

## Dependency Management

### Workspace Protocol

Use `workspace:*` for internal packages:

```json
{
  "dependencies": {
    "@listing-platform/reviews": "workspace:*"
  }
}
```

### Adding Dependencies

```bash
# Add to root (shared)
pnpm add -w package-name

# Add to specific package
pnpm --filter @listing-platform/reviews add package-name

# Add to app
pnpm --filter portal add package-name
```

## TypeScript Configuration

### Root tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Package tsconfig.json

```json
{
  "extends": "../../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Best Practices

### 1. Build Order

Turborepo automatically handles build order based on dependencies:
- SDKs build before apps that use them
- Dependencies build before dependents

### 2. Watch Mode

Use watch mode for SDKs during development:
```bash
pnpm --filter @listing-platform/reviews dev
```

### 3. Parallel Execution

Turborepo runs independent tasks in parallel:
- Multiple SDKs build simultaneously
- Tests run in parallel

### 4. Cache Strategy

- Cache `dist/` outputs for packages
- Cache `.next/` for Next.js apps
- Don't cache `node_modules/`

### 5. Environment Variables

Use `globalDependencies` in turbo.json:
```json
{
  "globalDependencies": ["**/.env.*local"]
}
```

## Troubleshooting

### Build Failures

**Problem**: Build fails with dependency errors

**Solution**:
1. Ensure all dependencies are installed: `pnpm install`
2. Check workspace protocol: `workspace:*`
3. Verify package.json names match

### Type Errors

**Problem**: TypeScript can't find types

**Solution**:
1. Build dependencies first: `pnpm --filter @listing-platform/reviews build`
2. Check tsconfig extends path
3. Restart TypeScript server

### Hot Reload Not Working

**Problem**: Changes don't reflect

**Solution**:
1. Ensure SDK is in watch mode
2. Check Next.js Fast Refresh is enabled
3. Clear `.next` cache: `rm -rf .next`

### Cache Issues

**Problem**: Stale cache causing issues

**Solution**:
```bash
# Clear cache
turbo run build --force

# Or delete .turbo directory
rm -rf .turbo
```

## Advanced Configuration

### Remote Caching

Set up remote cache for team sharing:

```bash
# Login to Vercel (or other provider)
turbo login

# Link to remote cache
turbo link
```

### Task Dependencies

Define custom task dependencies:

```json
{
  "pipeline": {
    "test": {
      "dependsOn": ["build", "lint"],
      "outputs": ["coverage/**"]
    }
  }
}
```

### Environment Variables

Pass env vars to tasks:

```json
{
  "pipeline": {
    "build": {
      "env": ["NODE_ENV", "DATABASE_URL"]
    }
  }
}
```

## Example Workflow

### Daily Development

```bash
# 1. Start SDKs in watch mode
pnpm --filter @listing-platform/reviews dev &
pnpm --filter @listing-platform/maps dev &

# 2. Start app
pnpm --filter portal dev

# 3. Make changes - hot reload works!
```

### Before Committing

```bash
# 1. Build everything
pnpm build

# 2. Type check
pnpm type-check

# 3. Run tests
pnpm test

# 4. Lint
pnpm lint
```

## Benefits

1. **Fast Builds**: Caching speeds up builds significantly
2. **Hot Reload**: Changes reflect immediately
3. **Type Safety**: TypeScript types flow between packages
4. **Parallel Execution**: Multiple tasks run simultaneously
5. **Dependency Management**: Automatic build ordering
6. **Team Collaboration**: Shared cache across team

## Next Steps

1. Set up your turbo.json
2. Configure package.json scripts
3. Start developing with `pnpm dev`
4. Enjoy fast, cached builds!
