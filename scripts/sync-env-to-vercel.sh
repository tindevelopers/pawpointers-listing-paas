#!/bin/bash

# Script to sync environment variables from .env.local to Vercel projects
# This helps ensure all platforms have the correct environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sync Environment Variables to Vercel              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

# Check if .env.local exists
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "Please create .env.local first or run: npm run supabase:link"
    exit 1
fi

echo -e "${GREEN}✓ Found .env.local${NC}"
echo ""

# Parse .env.local and extract variables
echo -e "${BLUE}Reading environment variables from .env.local...${NC}"

# Required variables for all platforms
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

# Optional variables
OPTIONAL_VARS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_KEY"
    "STRIPE_SECRET_KEY"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "STRIPE_WEBHOOK_SECRET"
)

# Function to get value from .env.local
get_env_value() {
    local var_name=$1
    grep "^${var_name}=" "$ENV_FILE" | cut -d '=' -f2- | sed 's/^"//;s/"$//'
}

# Function to set env var in Vercel project
set_vercel_env() {
    local project_dir=$1
    local var_name=$2
    local var_value=$3
    local env_type=${4:-production}
    
    cd "$project_dir"
    
    if [ -f ".vercel/project.json" ]; then
        echo "  Setting ${var_name} for ${env_type}..."
        echo "$var_value" | vercel env add "$var_name" "$env_type" --force 2>/dev/null || {
            echo "  ⚠️  Failed to set ${var_name}, may already exist"
        }
    else
        echo "  ⚠️  Project not linked to Vercel. Run 'vercel link' first."
    fi
    
    cd - > /dev/null
}

# Select platforms
echo -e "${BLUE}Select platforms to sync:${NC}"
echo "1) Admin App"
echo "2) Portal App"
echo "3) Dashboard App"
echo "4) API Server"
echo "5) All platforms"
echo ""
read -p "Enter choice [1-5]: " -n 1 -r
echo ""

SYNC_ADMIN=false
SYNC_PORTAL=false
SYNC_DASHBOARD=false
SYNC_API=false

case $REPLY in
    1)
        SYNC_ADMIN=true
        ;;
    2)
        SYNC_PORTAL=true
        ;;
    3)
        SYNC_DASHBOARD=true
        ;;
    4)
        SYNC_API=true
        ;;
    5)
        SYNC_ADMIN=true
        SYNC_PORTAL=true
        SYNC_DASHBOARD=true
        SYNC_API=true
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Select environment type
echo ""
echo -e "${BLUE}Select environment:${NC}"
echo "1) Production"
echo "2) Preview"
echo "3) Development"
echo "4) All environments"
echo ""
read -p "Enter choice [1-4]: " -n 1 -r
echo ""

ENV_TYPES=()
case $REPLY in
    1)
        ENV_TYPES=("production")
        ;;
    2)
        ENV_TYPES=("preview")
        ;;
    3)
        ENV_TYPES=("development")
        ;;
    4)
        ENV_TYPES=("production" "preview" "development")
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Sync variables
echo ""
echo -e "${BLUE}Syncing environment variables...${NC}"
echo ""

# Function to sync platform
sync_platform() {
    local platform_name=$1
    local platform_dir=$2
    
    echo -e "${BLUE}Syncing ${platform_name}...${NC}"
    
    for env_type in "${ENV_TYPES[@]}"; do
        echo "  Environment: ${env_type}"
        
        # Sync required variables
        for var_name in "${REQUIRED_VARS[@]}"; do
            var_value=$(get_env_value "$var_name")
            if [ -n "$var_value" ]; then
                set_vercel_env "$platform_dir" "$var_name" "$var_value" "$env_type"
            fi
        done
        
        # Sync optional variables
        for var_name in "${OPTIONAL_VARS[@]}"; do
            var_value=$(get_env_value "$var_name")
            if [ -n "$var_value" ]; then
                set_vercel_env "$platform_dir" "$var_name" "$var_value" "$env_type"
            fi
        done
    done
    
    echo -e "${GREEN}✓ ${platform_name} synced${NC}"
    echo ""
}

# Sync selected platforms
if [ "$SYNC_ADMIN" = true ]; then
    sync_platform "Admin App" "apps/admin"
fi

if [ "$SYNC_PORTAL" = true ]; then
    sync_platform "Portal App" "apps/portal"
fi

if [ "$SYNC_DASHBOARD" = true ]; then
    sync_platform "Dashboard App" "apps/dashboard"
fi

if [ "$SYNC_API" = true ]; then
    sync_platform "API Server" "packages/api-server"
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sync Complete                                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} Some variables may need to be set manually in Vercel dashboard"
echo "Visit: https://vercel.com → Your Project → Settings → Environment Variables"
echo ""

