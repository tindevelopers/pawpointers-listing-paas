#!/bin/bash
# Wait for Next.js dev server to be ready
# This script starts the dev server and waits for it to be fully ready

cd apps/portal

# Start dev server in background
pnpm dev &
DEV_PID=$!

# Wait for Next.js to be ready (check for "Ready" message or port availability)
echo "Waiting for dev server to be ready..."
MAX_WAIT=120
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  # Check if port is listening
  if nc -z localhost 3030 2>/dev/null; then
    # Check if Next.js has compiled (look for .next directory with some files)
    if [ -d ".next" ] && [ -f ".next/package.json" ] 2>/dev/null; then
      echo "Dev server is ready!"
      # Trigger a compilation by making a request
      curl -s http://localhost:3030 > /dev/null 2>&1 || true
      sleep 2
      break
    fi
  fi
  
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

# Keep the server running
wait $DEV_PID


