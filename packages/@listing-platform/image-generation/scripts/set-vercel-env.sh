#!/bin/bash

# Script to set Vercel environment variables for API server
# This ensures all required env vars are properly configured

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting Vercel environment variables for API Server...${NC}"
echo ""

cd "$(dirname "$0")/.."

# Check if .env.local exists
if [ ! -f "../../.env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found in root directory${NC}"
    echo "Using values from ENV_VARS.md"
    
    SUPABASE_URL="https://omczmkjrpsykpwiyptfj.supabase.co"
    SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY3pta2pycHN5a3B3aXlwdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODIyMjMsImV4cCI6MjA4MzU1ODIyM30.JZnXOYmO-fxR1i9ak13_TKqXLBF40ETHHr0P26hqd5s"
    
    echo -e "${YELLOW}⚠️  SUPABASE_SERVICE_KEY must be set manually${NC}"
    echo "Get it from: https://supabase.com/dashboard/project/omczmkjrpsykpwiyptfj/settings/api"
    echo ""
    read -p "Enter SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY
else
    # Read from .env.local
    SUPABASE_URL=$(grep "^SUPABASE_URL=" ../../.env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
    SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" ../../.env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
    SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" ../../.env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
    
    # Fallback to direct SUPABASE_ANON_KEY if NEXT_PUBLIC_ not found
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" ../../.env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
    fi
fi

# Validate values
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL is required"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_KEY is required"
    echo "Get it from: https://supabase.com/dashboard/project/omczmkjrpsykpwiyptfj/settings/api"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ SUPABASE_ANON_KEY is required"
    exit 1
fi

echo -e "${GREEN}✓ Found environment variables${NC}"
echo "  SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:30}..."
echo "  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:30}..."
echo ""

# Function to set env var for all environments
set_env_var() {
    local var_name=$1
    local var_value=$2
    
    echo -e "${BLUE}Setting ${var_name}...${NC}"
    
    # Production
    echo "$var_value" | vercel env add "$var_name" production --force 2>&1 | grep -v "already exists" || true
    
    # Preview
    echo "$var_value" | vercel env add "$var_name" preview --force 2>&1 | grep -v "already exists" || true
    
    # Development
    echo "$var_value" | vercel env add "$var_name" development --force 2>&1 | grep -v "already exists" || true
    
    echo -e "${GREEN}✓ ${var_name} set for all environments${NC}"
}

# Set environment variables
set_env_var "SUPABASE_URL" "$SUPABASE_URL"
set_env_var "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_KEY"
set_env_var "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"

echo ""
echo -e "${GREEN}✓ All environment variables set!${NC}"
echo ""
echo "Next steps:"
echo "1. Redeploy: vercel --prod"
echo "2. Test: curl https://pawpointers-api.tinconnect.com/health"
echo "3. Check diagnostic: curl https://pawpointers-api.tinconnect.com/api/diagnostic"


