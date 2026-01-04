#!/bin/bash

# Selective Program Update Script
# This script updates only the programs enabled in config/programs.config.ts
# from the upstream repository.

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if upstream remote exists
if ! git remote | grep -q "^upstream$"; then
    echo -e "${RED}Error: Upstream remote not found.${NC}"
    echo -e "${YELLOW}Add it with: git remote add upstream <upstream-url>${NC}"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

echo -e "${BLUE}=== Selective Program Update Script ===${NC}\n"

# Fetch latest changes from upstream
echo -e "${GREEN}[1/5] Fetching latest changes from upstream...${NC}"
git fetch upstream

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}\n"

# Read enabled programs from config
echo -e "${GREEN}[2/5] Reading enabled programs from config/programs.config.ts...${NC}"
if [ ! -f "config/programs.config.ts" ]; then
    echo -e "${RED}Error: config/programs.config.ts not found${NC}"
    exit 1
fi

# Extract enabled program IDs
ENABLED_PROGRAMS=$(grep -A 2 "enabled: true" config/programs.config.ts | grep "id:" | sed "s/.*id: '\([^']*\)'.*/\1/" | tr '\n' ' ')

if [ -z "$ENABLED_PROGRAMS" ]; then
    echo -e "${YELLOW}Warning: No enabled programs found in config${NC}"
    echo -e "${YELLOW}Proceeding with all programs...${NC}"
else
    echo -e "${GREEN}Enabled programs:${NC} $ENABLED_PROGRAMS\n"
fi

# Program to path mapping
declare -A PROGRAM_PATHS
PROGRAM_PATHS["dashboard"]="apps/admin/app/saas/dashboard/"
PROGRAM_PATHS["bookings"]="apps/admin/app/bookings/ apps/admin/app/api/bookings/ apps/admin/app/api/integrations/video/ packages/@listing-platform/booking/ database/schema/features/booking*.sql supabase/migrations/*booking*.sql supabase/migrations/*video*.sql"
PROGRAM_PATHS["crm"]="apps/admin/app/crm/ apps/admin/app/api/crm/ packages/api-server/src/routes/crm.ts database/schema/features/crm*.sql supabase/migrations/*crm*.sql"
PROGRAM_PATHS["ai-assistant"]="apps/admin/app/ai-assistant/ apps/admin/app/text-generator/ apps/admin/app/image-generator/ apps/admin/app/code-generator/ apps/admin/app/video-generator/"
PROGRAM_PATHS["knowledge-base"]="apps/admin/app/knowledge-base/ database/schema/features/knowledge*.sql supabase/migrations/*knowledge*.sql"
PROGRAM_PATHS["ecommerce"]="apps/admin/app/products-list/ apps/admin/app/add-product/ apps/admin/app/billing/ apps/admin/app/invoices/ apps/admin/app/transactions/"
PROGRAM_PATHS["billing"]="apps/admin/app/saas/billing/ apps/admin/app/api/billing/ apps/admin/app/saas/invoicing/"
PROGRAM_PATHS["admin"]="apps/admin/app/saas/admin/ apps/admin/app/api/admin/"
PROGRAM_PATHS["system-admin"]="apps/admin/app/saas/admin/system-admin/"
PROGRAM_PATHS["saas"]="apps/admin/app/saas/ apps/admin/app/api/"
PROGRAM_PATHS["calendar"]="apps/admin/app/calendar/"
PROGRAM_PATHS["user-profile"]="apps/admin/app/profile/"
PROGRAM_PATHS["task"]="apps/admin/app/task-list/ apps/admin/app/task-kanban/"
PROGRAM_PATHS["forms"]="apps/admin/app/form-elements/ apps/admin/app/form-layout/"
PROGRAM_PATHS["tables"]="apps/admin/app/basic-tables/ apps/admin/app/data-tables/"
PROGRAM_PATHS["pages"]="apps/admin/app/file-manager/ apps/admin/app/pricing-tables/ apps/admin/app/faq/ apps/admin/app/api-keys/ apps/admin/app/integrations/ apps/admin/app/blank/ apps/admin/app/error-404/ apps/admin/app/error-500/"
PROGRAM_PATHS["support"]="apps/admin/app/chat/ apps/admin/app/support-tickets/ apps/admin/app/inbox/"
PROGRAM_PATHS["charts"]="apps/admin/app/line-chart/ apps/admin/app/bar-chart/ apps/admin/app/pie-chart/"
PROGRAM_PATHS["ui-elements"]="apps/admin/app/alerts/ apps/admin/app/avatars/ apps/admin/app/badge/ apps/admin/app/breadcrumb/ apps/admin/app/buttons/"
PROGRAM_PATHS["authentication"]="apps/admin/app/signin/ apps/admin/app/signup/ apps/admin/app/reset-password/ apps/admin/app/two-step-verification/"

# Merge upstream
echo -e "${GREEN}[3/5] Merging from upstream (no commit yet)...${NC}"
UPSTREAM_BRANCH=$(git rev-parse --abbrev-ref upstream/HEAD 2>/dev/null | sed 's/upstream\///' || echo "main")
git merge upstream/$UPSTREAM_BRANCH --no-commit --no-ff || {
    echo -e "${YELLOW}Merge in progress, continuing with selective updates...${NC}"
}

# Update only enabled programs
echo -e "${GREEN}[4/5] Updating enabled programs...${NC}"
UPDATED_COUNT=0
SKIPPED_COUNT=0

for program in $ENABLED_PROGRAMS; do
    if [ -n "${PROGRAM_PATHS[$program]}" ]; then
        echo -e "${BLUE}  → Updating program: $program${NC}"
        for path in ${PROGRAM_PATHS[$program]}; do
            # Handle glob patterns
            if [[ $path == *"*"* ]]; then
                # Use find for glob patterns
                for file in $(find . -path "./$path" 2>/dev/null); do
                    if [ -e "$file" ]; then
                        git checkout --theirs "$file" 2>/dev/null && UPDATED_COUNT=$((UPDATED_COUNT + 1)) || true
                    fi
                done
            else
                if [ -e "$path" ] || [ -d "$path" ]; then
                    git checkout --theirs "$path" 2>/dev/null && UPDATED_COUNT=$((UPDATED_COUNT + 1)) || SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
                fi
            fi
        done
    else
        echo -e "${YELLOW}  → Skipping program: $program (no path mapping)${NC}"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    fi
done

# Always keep config files
echo -e "${GREEN}[5/5] Preserving your configuration files...${NC}"
git checkout --ours config/programs.config.ts 2>/dev/null || true
git checkout --ours config/features.config.ts 2>/dev/null || true
git checkout --ours config/index.ts 2>/dev/null || true

# Show summary
echo -e "\n${BLUE}=== Update Summary ===${NC}"
echo -e "${GREEN}Updated files: $UPDATED_COUNT${NC}"
echo -e "${YELLOW}Skipped files: $SKIPPED_COUNT${NC}\n"

# Show status
echo -e "${GREEN}Current status:${NC}"
git status --short

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Review changes: ${BLUE}git diff${NC}"
echo -e "  2. Review staged: ${BLUE}git diff --staged${NC}"
echo -e "  3. Test your application: ${BLUE}npm run dev${NC}"
echo -e "  4. Commit if everything looks good: ${BLUE}git commit -m 'Update enabled programs from upstream'${NC}"
echo -e "  5. Or abort: ${BLUE}git merge --abort${NC}"


