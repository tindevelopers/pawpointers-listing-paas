# Builder.io Complete Setup Guide - Using npm

## Complete Configuration for Builder.io

Since Builder.io only supports **npm** (not pnpm), use these commands:

### Setup Command

```bash
cd apps/portal && rm -rf node_modules .next && npm install next@15.4.8 --force && npm install
```

**What this does:**
- Clears cached dependencies and build artifacts
- Forces Next.js 15.4.8 installation (fixes version mismatch)
- Installs all dependencies from package.json

### Dev Command

```bash
cd apps/portal && npm run dev
```

**What this does:**
- Starts Next.js dev server on port 3030
- Binds to 0.0.0.0 (allows Builder.io to connect)
- Enables hot reloading

### Dev Server URL

```
http://localhost:3030
```

## Why These Commands?

1. **npm instead of pnpm**: Builder.io environment only has npm
2. **Force Next.js 15.4.8**: Fixes `expandNextJsTemplate` error
3. **Clear cache**: Ensures clean install
4. **cd apps/portal**: Builder.io runs from repo root

## Step-by-Step Setup

1. **Go to Builder.io Project Settings**
2. **Enter Setup Command:**
   ```
   cd apps/portal && rm -rf node_modules .next && npm install next@15.4.8 --force && npm install
   ```
3. **Enter Dev Command:**
   ```
   cd apps/portal && npm run dev
   ```
4. **Enter Dev Server URL:**
   ```
   http://localhost:3030
   ```
5. **Click Verify/Save**

## Troubleshooting

### If Setup Fails

Try simpler version:

**Setup Command:**
```bash
cd apps/portal && npm install next@15.4.8
```

### If Dev Server Doesn't Start

Check Debugging Terminal for:
- Port 3030 already in use
- Missing dependencies
- Compilation errors

### If Version Mismatch Persists

Force reinstall:

**Setup Command:**
```bash
cd apps/portal && npm uninstall next && npm install next@15.4.8
```

## Expected Result

After setup:
- ✅ Next.js 15.4.8 installed
- ✅ No version mismatch warnings
- ✅ Dev server starts successfully
- ✅ Builder.io can connect to localhost:3030
- ✅ No `expandNextJsTemplate` errors

## Status

- ✅ Commands updated for npm
- ✅ Next.js version pinned to 15.4.8
- ✅ Dev command includes --hostname 0.0.0.0
- ✅ Ready for Builder.io setup


