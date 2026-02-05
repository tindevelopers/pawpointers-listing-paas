#!/bin/bash

# Script to update all three Vercel projects' root directory settings
# Usage: ./scripts/update-all-vercel-projects.sh [vercel-token]

set -e

VERCEL_TOKEN=${1:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${YELLOW}Vercel token not provided.${NC}"
    echo "Please get your token from: https://vercel.com/account/tokens"
    echo "Then run: $0 <your-token>"
    exit 1
fi

# Function to update a project
update_project() {
    local APP_DIR=$1
    local PROJECT_NAME=$2
    local FILTER=$3
    
    echo ""
    echo -e "${BLUE}Updating $PROJECT_NAME...${NC}"
    
    if [ ! -f "$APP_DIR/.vercel/project.json" ]; then
        echo -e "${RED}Error: Could not find $APP_DIR/.vercel/project.json${NC}"
        echo "Please run 'vercel link' in $APP_DIR first"
        return 1
    fi
    
    PROJECT_ID=$(cat "$APP_DIR/.vercel/project.json" | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
    ORG_ID=$(cat "$APP_DIR/.vercel/project.json" | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
    
    echo "Project ID: $PROJECT_ID"
    echo "Root Directory: $APP_DIR"
    
    RESPONSE=$(curl -s -X PATCH \
      "https://api.vercel.com/v10/projects/$PROJECT_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"rootDirectory\": \"$APP_DIR\",
        \"buildCommand\": \"cd ../.. && pnpm turbo build --filter=$FILTER\",
        \"installCommand\": \"cd ../.. && pnpm install\",
        \"outputDirectory\": \".next\",
        \"framework\": \"nextjs\"
      }")
    
    if echo "$RESPONSE" | grep -q "rootDirectory\|id"; then
        echo -e "${GREEN}✓ Successfully updated $PROJECT_NAME${NC}"
    else
        echo -e "${RED}✗ Failed to update $PROJECT_NAME${NC}"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Update all three projects
update_project "apps/admin" "admin" "@tinadmin/admin"
update_project "apps/dashboard" "dashboard" "@tinadmin/dashboard"  
update_project "apps/portal" "portal" "@template/portal"

echo ""
echo -e "${GREEN}✓ All projects updated successfully!${NC}"
echo ""
echo "You can now deploy with:"
echo "  cd apps/admin && vercel --prod"
echo "  cd apps/dashboard && vercel --prod"
echo "  cd apps/portal && vercel --prod"
