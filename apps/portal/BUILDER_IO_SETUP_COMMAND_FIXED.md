# Builder.io Setup Command - Fixed Version

## Problem

Builder.io setup shows:
```
npm error Unsupported URL Type "workspace:": workspace:*
```

This happens because npm is being called after pnpm installation, or the command chain isn't working correctly.

## Root Cause

The setup command might be:
1. Installing pnpm correctly
2. But then npm is still being called somewhere
3. Or the `cd apps/portal` isn't working, so npm runs from root

## Correct Setup Command

Use this **exact** setup command in Builder.io:

```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**Important:** Make sure there are no extra spaces or line breaks.

## Verify Each Step

The command should:
1. ✅ `npm install -g pnpm@10.6.1` - Install pnpm globally (npm can do this)
2. ✅ `&&` - Chain commands (only continue if previous succeeds)
3. ✅ `cd apps/portal` - Change to portal directory
4. ✅ `rm -rf node_modules .next` - Clear cache
5. ✅ `pnpm install next@15.4.8 --force` - Force install Next.js 15.4.8
6. ✅ `pnpm install` - Install all dependencies (pnpm understands workspace:*)

## If Still Getting npm Errors

### Option 1: Verify pnpm is Installed

Add a verification step:

```bash
npm install -g pnpm@10.6.1 && pnpm --version && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

### Option 2: Use Explicit Paths

If `cd apps/portal` isn't working:

```bash
npm install -g pnpm@10.6.1 && cd /root/app/code/apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

(Replace `/root/app/code` with Builder.io's actual root path)

### Option 3: Install from Root with pnpm Filter

```bash
npm install -g pnpm@10.6.1 && pnpm install -w && cd apps/portal && pnpm install next@15.4.8 --force && pnpm install
```

## Debugging

### Check What's Happening

In Builder.io Debugging Terminal, run manually:

```bash
# Step 1: Install pnpm
npm install -g pnpm@10.6.1

# Step 2: Verify pnpm
pnpm --version

# Step 3: Check directory
pwd
ls -la apps/portal

# Step 4: Change directory
cd apps/portal

# Step 5: Clear cache
rm -rf node_modules .next

# Step 6: Install Next.js
pnpm install next@15.4.8 --force

# Step 7: Install dependencies
pnpm install
```

If any step fails, that's where the issue is.

## Most Likely Issue

The `cd apps/portal` might be failing silently, so npm runs from root and tries to install workspace dependencies.

**Solution:** Add error checking:

```bash
npm install -g pnpm@10.6.1 && (cd apps/portal || exit 1) && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

## Recommended Setup Command

**Use this version with verification:**

```bash
npm install -g pnpm@10.6.1 && pnpm --version && cd apps/portal && pwd && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

This will:
- Install pnpm
- Verify pnpm works
- Change to portal directory
- Show current directory (for debugging)
- Clear cache
- Install Next.js 15.4.8
- Install all dependencies

## Expected Output

You should see:
```
+ pnpm@10.6.1
10.6.1
/root/app/code/apps/portal
... (pnpm install output)
```

**No npm errors about workspace:* should appear.**


