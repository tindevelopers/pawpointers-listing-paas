# Builder.io Connection Diagnostic Guide

## Problem

Builder.io is trying to connect to `http://localhost:3030/` but can't establish a connection.

## Common Issues & Solutions

### Issue 1: Dev Server Not Running

**Symptom:** "Connecting to Development Server" spinner never stops

**Solution:** Make sure the dev server is actually running locally:

```bash
# In a separate terminal, start the dev server manually
cd /Users/gene/Projects/pawpointers-listing-paas/apps/portal
pnpm dev
```

Then verify it's running:
```bash
curl http://localhost:3030
```

### Issue 2: Builder.io Can't Access Localhost

**Symptom:** Builder.io shows "Connecting..." but never connects

**Cause:** Builder.io runs in the cloud and can't directly access your localhost

**Solution:** Builder.io uses a proxy/tunnel. Make sure:
1. The dev command is actually starting the server
2. The server is binding to `0.0.0.0` not just `localhost`

**Fix:** Update the dev command to explicitly bind to all interfaces:

```bash
cd apps/portal && pnpm dev --hostname 0.0.0.0
```

Or update `package.json`:
```json
"dev": "next dev --port 3030 --hostname 0.0.0.0"
```

### Issue 3: Dev Command Not Starting Server

**Symptom:** Command runs but no server starts

**Check:** The command might be failing silently. Try running it manually:

```bash
cd /Users/gene/Projects/pawpointers-listing-paas
pnpm --filter=@tinadmin/portal dev
```

If it fails, check:
- Are dependencies installed? (`pnpm install`)
- Are there any errors in the output?
- Is port 3030 already in use?

### Issue 4: Port Already in Use

**Check:**
```bash
lsof -i :3030
```

**Fix:** Kill the process or use a different port

### Issue 5: Workspace Dependencies Not Resolved

**Symptom:** Command fails with module not found errors

**Fix:** Make sure workspace dependencies are installed:

```bash
cd /Users/gene/Projects/pawpointers-listing-paas
pnpm install
```

## Using Builder.io CLI

### Install CLI

```bash
npm install -g @builder.io/cli
```

### Authenticate

```bash
builder auth
```

### Connect Project

```bash
cd /Users/gene/Projects/pawpointers-listing-paas/apps/portal
builder connect
```

### Check Status

```bash
builder status
```

### Index Repository (for component discovery)

```bash
builder index-repo
```

## Recommended Dev Command Fix

Try this dev command in Builder.io:

```bash
cd apps/portal && pnpm dev --hostname 0.0.0.0
```

Or if that doesn't work, use npm:

```bash
cd apps/portal && npm run dev -- --hostname 0.0.0.0
```

## Alternative: Manual Proxy Setup

If Builder.io's automatic proxy isn't working:

1. **Start dev server manually** in your terminal:
   ```bash
   cd apps/portal && pnpm dev
   ```

2. **Use ngrok or similar** to expose localhost:
   ```bash
   ngrok http 3030
   ```

3. **Update Dev Server URL** in Builder.io to the ngrok URL

## Debugging Steps

1. **Test dev command locally:**
   ```bash
   cd /Users/gene/Projects/pawpointers-listing-paas
   pnpm --filter=@tinadmin/portal dev
   ```
   Wait for "Ready" message, then test: `curl http://localhost:3030`

2. **Check Builder.io logs:**
   - Look at the "Debugging Terminal" tab in Builder.io
   - Check for error messages

3. **Verify environment:**
   - Make sure `.env.local` has all required variables
   - Check that Supabase connection works

4. **Test with simpler command:**
   ```bash
   cd apps/portal && npx next dev --port 3030 --hostname 0.0.0.0
   ```

## Next Steps

1. Install Builder.io CLI: `npm install -g @builder.io/cli`
2. Run `builder connect` from `apps/portal` directory
3. Try the updated dev command with `--hostname 0.0.0.0`
4. Check the debugging terminal in Builder.io for errors

