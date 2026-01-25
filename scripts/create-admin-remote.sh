#!/bin/bash

# Script to create Platform Admin user on Remote Supabase
# Email: systemadmin@tin.info
# Password: 88888888

set -e

echo "🔧 Setting up Platform Admin user on Remote Supabase..."
echo ""

# Check if .env.local exists
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.local file not found"
    echo ""
    echo "   Please create .env.local with your remote Supabase credentials:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    echo "   Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
    exit 1
fi

# Check if required environment variables are set
source "$ENV_FILE" 2>/dev/null || true

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local"
    echo ""
    echo "   Please add: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local"
    echo ""
    echo "   Please add: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    echo "   Get it from: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
    echo "   (Look for 'service_role' key - keep it secret!)"
    exit 1
fi

# Validate URL format
if [[ ! "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
    echo "⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL doesn't look like a Supabase URL"
    echo "   Expected format: https://xxxxx.supabase.co"
    echo "   Current value: $NEXT_PUBLIC_SUPABASE_URL"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Environment variables found"
echo "   Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Check if tsx/npx is available
if ! command -v tsx > /dev/null 2>&1 && ! command -v npx > /dev/null 2>&1; then
    echo "❌ Neither tsx nor npx is available. Please install Node.js first."
    exit 1
fi

# Run the TypeScript script
echo "👤 Creating Platform Admin user..."
echo ""

if command -v tsx > /dev/null 2>&1; then
    tsx scripts/create-system-admin.ts
else
    npx tsx scripts/create-system-admin.ts
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📧 Login credentials:"
echo "   Email: systemadmin@tin.info"
echo "   Password: 88888888"
echo ""
echo "🎉 You can now sign in to your admin panel!"

