# Builder.io Dev Command - Exit Code 1 Fix

## Problem

Builder.io shows `exited with code 1` and displays pnpm help output. This means the dev command failed.

## Likely Causes

### 1. Port 3030 Already in Use

If you're running the dev server locally, Builder.io can't start it again.

**Solution:** Stop your local dev server first:
```bash
lsof -ti:3030 | xargs kill
```

Or use a different port in Builder.io.

### 2. Dev Command Not Found

The command might not be executing correctly.

**Verify Dev Command:**
```bash
cd apps/portal && pnpm dev
```

**Make sure it includes:**
- ✅ `cd apps/portal` (changes to correct directory)
- ✅ `&&` (chains commands)
- ✅ `pnpm dev` (runs the dev script)

### 3. Dependencies Not Installed

If setup didn't complete, dependencies might be missing.

**Re-run Setup Command:**
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

## Correct Configuration

### Setup Command
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

### Dev Command
```bash
cd apps/portal && pnpm dev
```

**Important:** Make sure there's a space after `cd apps/portal` and before `&&`

### Dev Server URL
```
http://localhost:3030
```

## Debugging Steps

### Step 1: Check if Port is Available

In Builder.io's Debugging Terminal, run:
```bash
lsof -ti:3030
```

If it returns a PID, the port is in use. Kill it:
```bash
lsof -ti:3030 | xargs kill
```

### Step 2: Test Dev Command Manually

In Builder.io's Debugging Terminal, test:
```bash
cd apps/portal && pnpm dev
```

You should see:
```
▲ Next.js 15.4.8
- Local:        http://localhost:3030
```

### Step 3: Check for Errors

Look for:
- ❌ "Cannot find module" → Dependencies not installed
- ❌ "Port already in use" → Kill existing process
- ❌ "Command not found" → Check pnpm installation
- ❌ "No such file or directory" → Check path

## Alternative: Use Different Port

If port 3030 keeps conflicting, use a different port:

### Update package.json
```json
{
  "scripts": {
    "dev": "next dev --port 3031 --hostname 0.0.0.0"
  }
}
```

### Update Builder.io Dev Server URL
```
http://localhost:3031
```

## Quick Fix Checklist

- [ ] Stop local dev server: `lsof -ti:3030 | xargs kill`
- [ ] Verify Setup Command completed successfully
- [ ] Check Dev Command is exactly: `cd apps/portal && pnpm dev`
- [ ] Check Dev Server URL is: `http://localhost:3030`
- [ ] Test dev command manually in Debugging Terminal
- [ ] Check for specific error messages in Debugging Terminal

## Still Failing?

Share the full error output from Builder.io's Debugging Terminal (not just the exit code), and we can diagnose the specific issue.


