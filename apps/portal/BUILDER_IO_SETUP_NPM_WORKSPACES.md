# Builder.io Setup - npm Workspaces Solution

## Problem

npm doesn't support `workspace:*` protocol. We need to install from repository root using npm workspaces.

## Solution: Install from Repository Root

Since Builder.io runs commands from the repository root, install there:

### Setup Command

```bash
npm install next@15.4.8 --force && npm install
```

This will:
1. Install Next.js 15.4.8 at root level
2. npm will resolve workspace dependencies automatically
3. Install all dependencies for the monorepo

### Dev Command

```bash
cd apps/portal && npm run dev
```

## Alternative: Install pnpm First

If npm workspaces don't work properly:

```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

Then use pnpm for dev command:

```bash
cd apps/portal && pnpm dev
```

## Why Install from Root?

- Builder.io runs from repository root
- npm needs to see the full workspace structure
- Workspace dependencies resolve at root level
- Then can run commands in subdirectories

## Complete Configuration

**Setup Command:**
```bash
npm install next@15.4.8 --force && npm install
```

**Dev Command:**
```bash
cd apps/portal && npm run dev
```

**Dev Server URL:**
```
http://localhost:3030
```

## If npm Workspaces Don't Work

Use pnpm (install it first):

**Setup Command:**
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**Dev Command:**
```bash
cd apps/portal && pnpm dev
```

