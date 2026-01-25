# Builder.io Troubleshooting Guide

## Exit Code 1 Error

If Builder.io shows `exited with code 1`, it means a command failed. Here's how to diagnose and fix:

## Common Issues

### 1. Dev Command Not Found

**Error:** `exited with code 1` after showing pnpm help

**Cause:** The dev command might not be running correctly.

**Fix:** Make sure your Dev Command is:
```bash
cd apps/portal && pnpm dev
```

**Verify:** Check that `apps/portal/package.json` has a `dev` script:
```json
{
  "scripts": {
    "dev": "next dev --port 3030 --hostname 0.0.0.0"
  }
}
```

### 2. Port Already in Use

**Error:** Port 3030 already in use

**Fix:** Kill the existing process:
```bash
lsof -ti:3030 | xargs kill
```

Or change the port in `package.json`:
```json
{
  "scripts": {
    "dev": "next dev --port 3031 --hostname 0.0.0.0"
  }
}
```

### 3. Dependencies Not Installed

**Error:** Module not found errors

**Fix:** Run setup command again:
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

### 4. Wrong Working Directory

**Error:** Commands fail because they're running from wrong directory

**Fix:** Always include `cd apps/portal` in commands:
- ✅ `cd apps/portal && pnpm dev`
- ❌ `pnpm dev` (runs from root, won't find package.json)

## Debugging Steps

### Step 1: Check Setup Command Output

Look for:
- ✅ `+768` packages installed
- ✅ No fatal errors
- ⚠️ Peer dependency warnings (OK, non-blocking)

### Step 2: Check Dev Command

The dev command should:
1. Change to `apps/portal` directory
2. Run `pnpm dev`
3. Start Next.js on port 3030
4. Bind to `0.0.0.0`

**Correct Dev Command:**
```bash
cd apps/portal && pnpm dev
```

### Step 3: Check Debugging Terminal

Look for:
- Next.js compilation messages
- `Ready on http://0.0.0.0:3030`
- Any error messages

### Step 4: Verify Port Access

Builder.io should be able to connect to:
```
http://localhost:3030
```

If Builder.io is remote, use a tunnel (ngrok):
```
https://your-ngrok-url.ngrok.io
```

## Complete Working Configuration

### Setup Command
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

### Dev Command
```bash
cd apps/portal && pnpm dev
```

### Dev Server URL
```
http://localhost:3030
```

(Or your ngrok URL if exposing localhost)

## If Still Failing

### Check Builder.io Debugging Terminal

Look for specific error messages:
- File not found → Check paths
- Permission denied → Check file permissions
- Port in use → Kill existing process
- Module not found → Re-run setup

### Test Locally First

Before using Builder.io, test locally:
```bash
cd apps/portal
pnpm dev
```

Should see:
```
▲ Next.js 15.4.8
- Local:        http://localhost:3030
- Ready in X seconds
```

### Common Fixes

1. **Clear cache and reinstall:**
   ```bash
   cd apps/portal && rm -rf node_modules .next && pnpm install
   ```

2. **Check Node version:**
   ```bash
   node -v  # Should be >= 20.0.0
   ```

3. **Verify pnpm:**
   ```bash
   pnpm -v  # Should be 10.6.1
   ```

4. **Check package.json exists:**
   ```bash
   ls apps/portal/package.json
   ```

## Still Need Help?

Share the full error output from Builder.io's Debugging Terminal, and we can diagnose the specific issue.


