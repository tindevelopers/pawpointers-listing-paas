# Builder.io Setup Command (Running from apps/portal)

## Configuration

- **Builder.io Root Directory**: `apps/portal`
- **Repository Root**: Two levels up (`../../`)
- **Package Manager**: pnpm (configured in repo root)

## Setup Command

Since Builder.io runs from `apps/portal`, you need to navigate to the repository root first:

```bash
cd ../.. && pnpm install
```

This will:
1. Navigate up two directories: `apps/portal` → `apps` → repository root
2. Run `pnpm install` from the root (where `pnpm-workspace.yaml` is)
3. Install all workspace dependencies

## Alternative Commands

### Option 1: Simple (Recommended)
```bash
cd ../.. && pnpm install
```

### Option 2: With error handling
```bash
cd ../.. && pnpm install || npm install
```

### Option 3: If pnpm not available
```bash
cd ../.. && npm install -g pnpm@10.6.1 && pnpm install
```

### Option 4: Using absolute path (if supported)
```bash
cd /workspace && pnpm install
```
(Adjust `/workspace` to Builder.io's actual root path)

## Why This Works

- Builder.io sets root directory to `apps/portal`
- But `pnpm install` must run from repository root
- `cd ../..` goes from `apps/portal` → `apps` → repository root
- Then `pnpm install` works correctly

## Path Structure

```
repository-root/          ← pnpm install runs here
├── package.json         ← Has pnpm workspace config
├── pnpm-workspace.yaml  ← Defines workspaces
├── apps/
│   └── portal/          ← Builder.io root directory
│       ├── package.json
│       └── ...
└── packages/
    └── ...
```

## Verification

After running the setup command, verify:
- Dependencies installed in `node_modules/` at root
- Workspace packages linked correctly
- `apps/portal` can access `@tinadmin/*` packages

## Next: Dev Command

After setup works, your Dev Command should be:

```bash
cd ../.. && pnpm turbo dev --filter=@tinadmin/portal
```

Or if staying in `apps/portal`:

```bash
cd ../.. && pnpm --filter=@tinadmin/portal dev
```

