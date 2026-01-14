# Builder.io Dev Command - Working Solutions

## Problem

The dev command `cd apps/portal && pnpm dev` may not work in Builder.io's environment.

## Solutions

### Option 1: Use pnpm filter (Recommended)

Since Builder.io runs from repository root, use pnpm's filter feature:

```bash
pnpm --filter=@tinadmin/portal dev
```

This:
- Runs from repository root (no `cd` needed)
- Uses pnpm's workspace filtering
- Executes the dev script in `apps/portal`

### Option 2: Use turbo directly

```bash
pnpm turbo run dev --filter=@tinadmin/portal
```

### Option 3: Navigate and use npm

If pnpm isn't working:

```bash
cd apps/portal && npm run dev
```

### Option 4: Use npx next directly

```bash
cd apps/portal && npx next dev --port 3030
```

## Recommended Dev Command

**Try this first:**

```
pnpm --filter=@tinadmin/portal dev
```

**If that fails, try:**

```
cd apps/portal && npm run dev
```

## Dev Server URL

Always use:
```
http://localhost:3030
```

## Troubleshooting

If you get "command not found" errors:
1. Make sure setup command (`pnpm install`) completed successfully
2. Try using `npm` instead of `pnpm`
3. Use `npx` to run commands directly

## Why Option 1 Works Best

- No directory navigation needed
- Uses pnpm workspace features
- Works from repository root
- More reliable in CI/CD environments

