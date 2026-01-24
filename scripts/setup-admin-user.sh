#!/bin/bash

# Script to set up the Platform Admin user
# Email: systemadmin@tin.info
# Password: 88888888

set -e

echo "🔧 Setting up Platform Admin user..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    echo ""
    echo "   On macOS: Open Docker Desktop application"
    echo "   Then run this script again."
    exit 1
fi

echo "✅ Docker is running"

# Check if Supabase is initialized
if [ ! -d "supabase" ]; then
    echo "❌ Supabase is not initialized in this directory"
    echo "   Please run: supabase init"
    exit 1
fi

# Start Supabase if not running
echo ""
echo "📦 Checking Supabase status..."
SUPABASE_STATUS=$(supabase status 2>/dev/null || echo "")

if [ -z "$SUPABASE_STATUS" ]; then
    echo "🚀 Starting Supabase services..."
    supabase start
    echo ""
    echo "⏳ Waiting for services to be ready..."
    sleep 5
fi

# Get Supabase credentials
echo ""
echo "📋 Getting Supabase credentials..."
SUPABASE_STATUS=$(supabase status --output json 2>/dev/null || supabase status 2>/dev/null)

# Extract service role key (try JSON first, then text)
SERVICE_ROLE_KEY=""
if command -v jq > /dev/null 2>&1; then
    SERVICE_ROLE_KEY=$(echo "$SUPABASE_STATUS" | jq -r '.serviceRoleKey // ""' 2>/dev/null || echo "")
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
    # Try to extract from text output
    SERVICE_ROLE_KEY=$(echo "$SUPABASE_STATUS" | grep -i "service_role key:" | sed -E 's/.*service_role key:[[:space:]]+([^[:space:]]+).*/\1/' || echo "")
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
    # Use default local Supabase service role key
    echo "⚠️  Could not extract service role key, using default local Supabase key"
    SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
fi

# Extract Supabase URL
SUPABASE_URL=$(echo "$SUPABASE_STATUS" | grep -i "API URL:" | sed -E 's/.*API URL:[[:space:]]+([^[:space:]]+).*/\1/' || echo "http://127.0.0.1:54321")

# Ensure .env.local exists
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "📝 Creating .env.local file..."
    touch "$ENV_FILE"
fi

# Update environment variables
echo ""
echo "📝 Updating environment variables in .env.local..."

# Function to update or add env var
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        fi
    else
        # Add new
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

update_env_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
update_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY"

echo "✅ Environment variables updated"

# Run the TypeScript script to create the admin user
echo ""
echo "👤 Creating Platform Admin user..."
echo ""

# Check if tsx is available
if ! command -v tsx > /dev/null 2>&1 && ! command -v npx > /dev/null 2>&1; then
    echo "❌ Neither tsx nor npx is available. Please install Node.js first."
    exit 1
fi

# Run the script
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
echo "🎉 You can now sign in to the admin panel!"

