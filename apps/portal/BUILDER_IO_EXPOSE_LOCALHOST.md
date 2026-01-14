# Expose Localhost for Builder.io

## Problem

Builder.io needs to connect to your dev server, but `localhost:3030` is only accessible on your local machine. Builder.io runs in a remote environment and can't access your localhost directly.

## Solution: Use a Tunneling Service

You need to expose your localhost using a tunneling service. Here are the best options:

## Option 1: ngrok (Recommended)

### Install ngrok

```bash
# macOS (using Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

### Expose Port 3030

```bash
ngrok http 3030
```

This will give you a public URL like:
```
https://abc123.ngrok.io
```

### Update Builder.io Dev Server URL

In Builder.io Project Settings:
- **Dev Server URL:** `https://abc123.ngrok.io` (use your ngrok URL)

### Keep ngrok Running

Keep the `ngrok http 3030` command running in a separate terminal while Builder.io is connected.

## Option 2: Cloudflare Tunnel (cloudflared)

### Install cloudflared

```bash
# macOS (using Homebrew)
brew install cloudflare/cloudflare/cloudflared

# Or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

### Expose Port 3030

```bash
cloudflared tunnel --url http://localhost:3030
```

This will give you a public URL like:
```
https://random-subdomain.trycloudflare.com
```

### Update Builder.io Dev Server URL

In Builder.io Project Settings:
- **Dev Server URL:** `https://random-subdomain.trycloudflare.com` (use your cloudflared URL)

## Option 3: localtunnel

### Install localtunnel

```bash
npm install -g localtunnel
```

### Expose Port 3030

```bash
lt --port 3030
```

This will give you a public URL like:
```
https://random-subdomain.loca.lt
```

### Update Builder.io Dev Server URL

In Builder.io Project Settings:
- **Dev Server URL:** `https://random-subdomain.loca.lt` (use your localtunnel URL)

## Complete Setup Workflow

### Step 1: Start Your Dev Server

```bash
cd apps/portal && pnpm dev
```

Keep this running in Terminal 1.

### Step 2: Expose Localhost (Choose One)

**Using ngrok:**
```bash
ngrok http 3030
```

**Using cloudflared:**
```bash
cloudflared tunnel --url http://localhost:3030
```

**Using localtunnel:**
```bash
lt --port 3030
```

Keep this running in Terminal 2.

### Step 3: Copy the Public URL

Copy the HTTPS URL from the tunnel output (e.g., `https://abc123.ngrok.io`)

### Step 4: Update Builder.io

1. Go to Builder.io Project Settings
2. Update **Dev Server URL** to your tunnel URL
3. Click Save/Verify

### Step 5: Test Connection

Builder.io should now be able to connect to your local dev server through the tunnel.

## Recommended: ngrok

**Why ngrok:**
- ✅ Most reliable
- ✅ Stable URLs (with free account)
- ✅ Good documentation
- ✅ Widely used

**Free tier:**
- Random URLs (changes each time)
- Limited connections

**Paid tier:**
- Custom domains
- Reserved URLs
- More connections

## Quick Start Script

Create a script to start both dev server and tunnel:

```bash
#!/bin/bash
# start-dev-with-tunnel.sh

# Start dev server in background
cd apps/portal && pnpm dev &
DEV_PID=$!

# Wait for dev server to start
sleep 5

# Start ngrok tunnel
ngrok http 3030

# Cleanup on exit
trap "kill $DEV_PID" EXIT
```

## Troubleshooting

### Tunnel URL Changes

If using free ngrok, the URL changes each time. You'll need to update Builder.io Dev Server URL each time you restart ngrok.

**Solution:** Use ngrok with a free account to get a reserved domain, or use a paid service.

### Connection Refused

Make sure:
1. Dev server is running (`pnpm dev`)
2. Dev server is bound to `0.0.0.0` (already configured in package.json)
3. Tunnel is pointing to correct port (3030)

### SSL Certificate Errors

Some tunneling services use self-signed certificates. Builder.io should handle this, but if you see SSL errors:
- Try a different tunneling service
- Use ngrok (most reliable SSL)

## Summary

1. ✅ Start dev server: `cd apps/portal && pnpm dev`
2. ✅ Expose with tunnel: `ngrok http 3030` (or cloudflared/localtunnel)
3. ✅ Copy tunnel URL
4. ✅ Update Builder.io Dev Server URL
5. ✅ Keep both running while using Builder.io

