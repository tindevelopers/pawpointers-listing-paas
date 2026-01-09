#!/bin/bash

# Script to update Vercel project root directory setting
# Usage: ./scripts/update-vercel-root-directory.sh <project-name> <root-directory> [vercel-token]

set -e

PROJECT_NAME=${1:-"pawpointers-portal"}
ROOT_DIRECTORY=${2:-"apps/portal"}
VERCEL_TOKEN=${3:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Updating Vercel project root directory...${NC}"
echo "Project: $PROJECT_NAME"
echo "Root Directory: $ROOT_DIRECTORY"
echo ""

# Get project ID from .vercel/project.json if it exists
if [ -f "apps/portal/.vercel/project.json" ]; then
    PROJECT_ID=$(cat apps/portal/.vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
    ORG_ID=$(cat apps/portal/.vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}Found project ID: $PROJECT_ID${NC}"
    echo -e "${GREEN}Found org ID: $ORG_ID${NC}"
else
    echo -e "${RED}Error: Could not find .vercel/project.json${NC}"
    echo "Please run 'vercel link' in apps/portal first"
    exit 1
fi

# Get Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${YELLOW}Vercel token not provided.${NC}"
    echo "Please get your token from: https://vercel.com/account/tokens"
    echo "Then run: $0 $PROJECT_NAME $ROOT_DIRECTORY <your-token>"
    exit 1
fi

# Update project settings via Vercel API
echo ""
echo -e "${BLUE}Updating project settings via Vercel API...${NC}"

RESPONSE=$(curl -s -X PATCH \
  "https://api.vercel.com/v10/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"rootDirectory\": \"$ROOT_DIRECTORY\",
    \"buildCommand\": \"cd ../.. && pnpm turbo build --filter=@tinadmin/portal\",
    \"installCommand\": \"cd ../.. && pnpm install\",
    \"outputDirectory\": \".next\",
    \"framework\": \"nextjs\"
  }")

# Check if update was successful
if echo "$RESPONSE" | grep -q "rootDirectory"; then
    echo -e "${GREEN}✓ Successfully updated root directory to: $ROOT_DIRECTORY${NC}"
    echo ""
    echo -e "${BLUE}Updated settings:${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Failed to update project settings${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Project settings updated successfully!${NC}"
echo -e "${YELLOW}You can now deploy with: cd apps/portal && vercel --prod${NC}"

