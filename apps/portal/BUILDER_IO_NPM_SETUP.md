# Builder.io Setup - Using npm (Not pnpm)

## Important

Builder.io's environment only supports **npm**, not pnpm. Use npm commands instead.

## Setup Command

Use this in Builder.io's **Setup Command** field:

```bash
cd apps/portal && rm -rf node_modules .next && npm install next@15.4.8 --force && npm install
```

This will:
1. Clear cached node_modules and .next
2. Force install Next.js 15.4.8
3. Install all other dependencies

## Dev Command

Use this in Builder.io's **Dev Command** field:

```bash
cd apps/portal && npm run dev
```

## Dev Server URL

```
http://localhost:3030
```

## Why npm Instead of pnpm?

- Builder.io's environment doesn't have pnpm installed
- npm is the default package manager in Builder.io
- npm will read package.json and install dependencies correctly

## Complete Configuration

**Setup Command:**
```bash
cd apps/portal && rm -rf node_modules .next && npm install next@15.4.8 --force && npm install
```

**Dev Command:**
```bash
cd apps/portal && npm run dev
```

**Dev Server URL:**
```
http://localhost:3030
```

## Notes

- npm will create its own `node_modules` and `package-lock.json`
- This is fine - npm will still respect the version pin in package.json
- The `--force` flag ensures Next.js 15.4.8 is installed

## Alternative: Simpler Setup

If the above doesn't work, try:

**Setup Command:**
```bash
cd apps/portal && npm install next@15.4.8
```

**Dev Command:**
```bash
cd apps/portal && npm run dev
```

## Verify

After setup, check the version in Debugging Terminal:

```bash
cd apps/portal && npm list next
```

Should show: `next@15.4.8`

