#!/bin/bash

# Script to deploy all platforms to Vercel using Vercel CLI
# Supports: admin, portal, dashboard, api-server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Vercel Deployment Setup (CLI)                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✓ Vercel CLI is installed${NC}"
echo ""

# Check if logged in
echo -e "${BLUE}Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}You need to login to Vercel${NC}"
    vercel login
else
    USER=$(vercel whoami)
    echo -e "${GREEN}✓ Logged in as: ${USER}${NC}"
fi

echo ""

# Select platforms to deploy
echo -e "${BLUE}Select platforms to deploy:${NC}"
echo "1) Admin App (apps/admin)"
echo "2) Portal App (apps/portal)"
echo "3) Dashboard App (apps/dashboard)"
echo "4) API Server (packages/api-server)"
echo "5) All platforms"
echo ""
read -p "Enter choice [1-5]: " -n 1 -r
echo ""

DEPLOY_ADMIN=false
DEPLOY_PORTAL=false
DEPLOY_DASHBOARD=false
DEPLOY_API=false

case $REPLY in
    1)
        DEPLOY_ADMIN=true
        ;;
    2)
        DEPLOY_PORTAL=true
        ;;
    3)
        DEPLOY_DASHBOARD=true
        ;;
    4)
        DEPLOY_API=true
        ;;
    5)
        DEPLOY_ADMIN=true
        DEPLOY_PORTAL=true
        DEPLOY_DASHBOARD=true
        DEPLOY_API=true
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Function to deploy a platform
deploy_platform() {
    local PLATFORM_NAME=$1
    local PLATFORM_DIR=$2
    local BUILD_COMMAND=$3
    
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Deploying ${PLATFORM_NAME}${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    cd "$PLATFORM_DIR"
    
    # Check if already linked
    if [ -f ".vercel/project.json" ]; then
        echo -e "${YELLOW}⚠️  Project is already linked to Vercel${NC}"
        read -p "Do you want to deploy to existing project? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo -e "${YELLOW}Skipping ${PLATFORM_NAME}${NC}"
            cd - > /dev/null
            return
        fi
    else
        echo -e "${BLUE}Linking to Vercel...${NC}"
        vercel link
    fi
    
    # Pull environment variables
    echo ""
    echo -e "${BLUE}Pulling environment variables...${NC}"
    vercel env pull .env.local 2>/dev/null || echo -e "${YELLOW}No environment variables found in Vercel${NC}"
    
    # Ask about deployment type
    echo ""
    echo -e "${BLUE}Deployment Type:${NC}"
    echo "1) Preview deployment (for testing)"
    echo "2) Production deployment"
    read -p "Enter choice [1-2]: " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[2]$ ]]; then
        DEPLOY_FLAG="--prod"
        echo -e "${GREEN}Deploying to production...${NC}"
    else
        DEPLOY_FLAG=""
        echo -e "${BLUE}Deploying preview...${NC}"
    fi
    
    # Deploy
    echo ""
    echo -e "${BLUE}Deploying ${PLATFORM_NAME}...${NC}"
    vercel deploy $DEPLOY_FLAG
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ ${PLATFORM_NAME} deployed successfully${NC}"
    else
        echo ""
        echo -e "${RED}❌ Failed to deploy ${PLATFORM_NAME}${NC}"
    fi
    
    cd - > /dev/null
}

# Deploy selected platforms
if [ "$DEPLOY_ADMIN" = true ]; then
    deploy_platform "Admin App" "apps/admin" "cd ../.. && pnpm turbo run build --filter=@tinadmin/admin"
fi

if [ "$DEPLOY_PORTAL" = true ]; then
    deploy_platform "Portal App" "apps/portal" "cd ../.. && pnpm turbo run build --filter=@tinadmin/portal"
fi

if [ "$DEPLOY_DASHBOARD" = true ]; then
    deploy_platform "Dashboard App" "apps/dashboard" "cd ../.. && pnpm turbo run build --filter=@tinadmin/dashboard"
fi

if [ "$DEPLOY_API" = true ]; then
    deploy_platform "API Server" "packages/api-server" "cd ../.. && pnpm turbo run build --filter=@listing-platform/api-server"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deployment Complete                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Set environment variables in Vercel dashboard for each project"
echo "2. Configure custom domains if needed"
echo "3. Set up environment-specific variables (production/preview)"
echo ""
echo -e "${BLUE}Required environment variables:${NC}"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY (server-side only)"
echo ""


