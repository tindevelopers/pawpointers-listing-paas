# Builder.io Final Setup - Install pnpm First

## Problem

npm doesn't support `workspace:*` protocol. The project uses pnpm workspaces.

## Solution: Install pnpm First

Since Builder.io has npm, we can install pnpm globally, then use it:

### Setup Command

```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**What this does:**
1. Installs pnpm globally using npm
2. Changes to apps/portal directory
3. Clears cached dependencies and build artifacts
4. Forces Next.js 15.4.8 installation
5. Installs all dependencies using pnpm (which understands workspace:*)

### Dev Command

```bash
cd apps/portal && pnpm dev
```

**What this does:**
- Starts Next.js dev server on port 3030
- Binds to 0.0.0.0 (allows Builder.io to connect)
- Uses pnpm to run the dev script

### Dev Server URL

```
http://localhost:3030
```

## Complete Configuration

**Setup Command:**
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**Dev Command:**
```bash
cd apps/portal && pnpm dev
```

**Dev Server URL:**
```
http://localhost:3030
```

## Why This Works

- ✅ npm is available in Builder.io (can install pnpm)
- ✅ pnpm understands `workspace:*` protocol
- ✅ pnpm works with pnpm-workspace.yaml
- ✅ Forces Next.js 15.4.8 (fixes version error)
- ✅ Clears cache for clean install

## Step-by-Step

1. **Go to Builder.io Project Settings**
2. **Enter Setup Command:**
   ```
   npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
   ```
3. **Enter Dev Command:**
   ```
   cd apps/portal && pnpm dev
   ```
4. **Enter Dev Server URL:**
   ```
   http://localhost:3030
   ```
5. **Click Verify/Save**

## Troubleshooting

### If pnpm Installation Fails

Try without version pin:

```bash
npm install -g pnpm && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

### If Still Errors

Check Debugging Terminal for:
- Permission errors (may need sudo, but Builder.io usually runs as root)
- Network issues
- Disk space

## Expected Result

After setup:
- ✅ pnpm installed globally
- ✅ Next.js 15.4.8 installed
- ✅ All workspace dependencies resolved
- ✅ No `workspace:*` errors
- ✅ Dev server starts successfully
- ✅ Builder.io can connect to localhost:3030

