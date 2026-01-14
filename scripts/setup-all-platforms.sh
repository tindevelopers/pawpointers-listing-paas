#!/bin/bash

# Comprehensive setup script for all platforms
# Links Supabase Cloud and deploys to Vercel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Complete Platform Setup                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "This script will:"
echo "  1. Link to Supabase Cloud (using Supabase CLI)"
echo "  2. Run database migrations"
echo "  3. Deploy all platforms to Vercel (using Vercel CLI)"
echo ""

read -p "Continue? (Y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

# Step 1: Supabase Setup
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Supabase Cloud Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

read -p "Do you want to set up Supabase Cloud? (Y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if [ -f "scripts/setup-supabase-cloud.sh" ]; then
        bash scripts/setup-supabase-cloud.sh
    else
        echo -e "${YELLOW}⚠️  Supabase setup script not found${NC}"
        echo "Run manually: ./scripts/setup-supabase-cloud.sh"
    fi
else
    echo -e "${YELLOW}Skipping Supabase setup${NC}"
fi

# Step 2: Vercel Setup
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: Vercel Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

read -p "Do you want to deploy to Vercel? (Y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if [ -f "scripts/setup-vercel.sh" ]; then
        bash scripts/setup-vercel.sh
    else
        echo -e "${YELLOW}⚠️  Vercel setup script not found${NC}"
        echo "Run manually: ./scripts/setup-vercel.sh"
    fi
else
    echo -e "${YELLOW}Skipping Vercel deployment${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Setup Summary                                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Important next steps:${NC}"
echo ""
echo "1. Environment Variables:"
echo "   - Set all required env vars in Vercel dashboard for each project"
echo "   - Use Supabase credentials from .env.local"
echo ""
echo "2. Database:"
echo "   - Verify migrations ran successfully"
echo "   - Check Supabase dashboard: https://app.supabase.com"
echo ""
echo "3. Domains:"
echo "   - Configure custom domains in Vercel if needed"
echo "   - Update DNS records"
echo ""
echo "4. Testing:"
echo "   - Test each deployed platform"
echo "   - Verify authentication works"
echo "   - Check API endpoints"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  - Supabase: ./LINK_SUPABASE.md"
echo "  - Vercel: ./docs/VERCEL_DEPLOYMENT.md"
echo ""

