#!/bin/bash

# Start Dev Server with Tunnel for Builder.io
# This script starts the Next.js dev server and exposes it via ngrok

set -e

echo "🚀 Starting dev server with tunnel for Builder.io..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed."
    echo "   Install it with: brew install ngrok"
    echo "   Or download from: https://ngrok.com/download"
    exit 1
fi

# Check if dev server is already running
if lsof -Pi :3030 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3030 is already in use."
    echo "   Please stop the existing dev server first."
    exit 1
fi

# Change to portal directory
cd "$(dirname "$0")/.." || exit

echo "📦 Starting Next.js dev server..."
# Start dev server in background
pnpm dev &
DEV_PID=$!

# Wait for dev server to be ready
echo "⏳ Waiting for dev server to start..."
sleep 8

# Check if dev server started successfully
if ! lsof -Pi :3030 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Dev server failed to start on port 3030"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Dev server is running on http://localhost:3030"
echo ""
echo "🌐 Starting ngrok tunnel..."
echo "   Copy the HTTPS URL below and update Builder.io Dev Server URL"
echo ""

# Start ngrok tunnel
ngrok http 3030

# Cleanup on exit
trap "echo ''; echo '🛑 Stopping dev server...'; kill $DEV_PID 2>/dev/null || true; exit" EXIT INT TERM

