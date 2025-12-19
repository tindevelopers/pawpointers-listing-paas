#!/bin/bash

# ===================================
# LISTING PLATFORM BASE - CLONING SCRIPT
# ===================================
# Interactive script to clone and configure for specific use case

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "🚀 Listing Platform Base - Cloning Script"
echo "=========================================="
echo -e "${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed${NC}"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node is not installed${NC}"
    exit 1
fi

# Get project details
read -p "Enter new project name (e.g., legal-directory): " PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Project name is required${NC}"
    exit 1
fi

# Check if directory already exists
if [ -d "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Directory $PROJECT_NAME already exists${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Choose taxonomy type:${NC}"
echo "  1) Industry Directory (profession-based)"
echo "  2) Location-based Platform (geography-first)"
echo "  3) Hybrid Platform (category + location)"
read -p "Enter choice [1-3]: " TAXONOMY_CHOICE

case $TAXONOMY_CHOICE in
    1)
        TAXONOMY_TYPE="industry"
        ;;
    2)
        TAXONOMY_TYPE="location"
        ;;
    3)
        TAXONOMY_TYPE="hybrid"
        ;;
    *)
        echo -e "${RED}Invalid choice. Defaulting to 'industry'${NC}"
        TAXONOMY_TYPE="industry"
        ;;
esac

read -p "Enter domain name (e.g., legaldir.com): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${YELLOW}Warning: No domain specified, using example.com${NC}"
    DOMAIN_NAME="example.com"
fi

read -p "Enter site name (e.g., Legal Directory): " SITE_NAME

if [ -z "$SITE_NAME" ]; then
    SITE_NAME="$PROJECT_NAME"
fi

echo ""
echo -e "${GREEN}Configuration Summary:${NC}"
echo "  Project Name: $PROJECT_NAME"
echo "  Taxonomy Type: $TAXONOMY_TYPE"
echo "  Domain: $DOMAIN_NAME"
echo "  Site Name: $SITE_NAME"
echo ""
read -p "Proceed with cloning? [Y/n]: " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]] && [[ ! -z $CONFIRM ]]; then
    echo -e "${YELLOW}Aborted${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Cloning repository...${NC}"

# Clone repository (assumes current directory is the base repo)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

echo "Copying files from $BASE_DIR to $PROJECT_NAME..."
cp -r "$BASE_DIR" "$PROJECT_NAME"

cd "$PROJECT_NAME"

echo -e "${GREEN}✓ Repository cloned${NC}"

echo ""
echo -e "${BLUE}Step 2: Cleaning up...${NC}"

# Remove original git history
rm -rf .git
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/**/node_modules
rm -rf .next
rm -rf apps/*/.next
rm -rf .turbo
rm -rf pnpm-lock.yaml

echo -e "${GREEN}✓ Cleaned up${NC}"

echo ""
echo -e "${BLUE}Step 3: Initializing new git repository...${NC}"

git init
git add .
git commit -m "Initial commit from listing-platform-base template"

echo -e "${GREEN}✓ Git initialized${NC}"

echo ""
echo -e "${BLUE}Step 4: Configuring project...${NC}"

# Create .env.local file
cat > .env.local << EOF
# ===================================
# Configuration
# ===================================
TAXONOMY_CONFIG=$TAXONOMY_TYPE
NEXT_PUBLIC_TAXONOMY_CONFIG=$TAXONOMY_TYPE

# ===================================
# Site Information
# ===================================
NEXT_PUBLIC_SITE_NAME="$SITE_NAME"
NEXT_PUBLIC_SITE_URL="https://$DOMAIN_NAME"
NEXT_PUBLIC_SUPPORT_EMAIL="support@$DOMAIN_NAME"

# ===================================
# Supabase (Configure after project setup)
# ===================================
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===================================
# Wasabi Storage (Configure for production)
# ===================================
WASABI_ACCESS_KEY=your-access-key
WASABI_SECRET_KEY=your-secret-key
WASABI_BUCKET=${PROJECT_NAME}-images
WASABI_REGION=us-east-1
WASABI_ENDPOINT=s3.wasabisys.com
NEXT_PUBLIC_CDN_URL=https://cdn.$DOMAIN_NAME

# ===================================
# Maps Provider (Uncomment the one you want to use)
# ===================================
# Mapbox (Recommended)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Google Maps
# NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-key

# ===================================
# Feature Flags
# ===================================
ENABLE_BOOKING=false
ENABLE_REVIEWS=true
ENABLE_MAPS=true
ENABLE_CRM=true

# ===================================
# Stripe (If using booking/payments)
# ===================================
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-publishable-key
# STRIPE_SECRET_KEY=your-secret-key
# STRIPE_WEBHOOK_SECRET=your-webhook-secret

# ===================================
# Email Service (Resend recommended)
# ===================================
# EMAIL_FROM=noreply@$DOMAIN_NAME
# RESEND_API_KEY=your-resend-api-key

# ===================================
# Vercel AI (For AI features)
# ===================================
# OPENAI_API_KEY=your-openai-key
# HELICONE_API_KEY=your-helicone-key
EOF

echo -e "${GREEN}✓ Environment file created${NC}"

# Update package names
echo "Updating package names..."
find . -type f -name "package.json" -not -path "*/node_modules/*" -exec sed -i.bak "s/@listing-platform/@$PROJECT_NAME/g" {} +
find . -type f -name "*.bak" -delete

echo -e "${GREEN}✓ Package names updated${NC}"

echo ""
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}    Project: $PROJECT_NAME${NC}"
echo -e "${GREEN}    Taxonomy: $TAXONOMY_TYPE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Review and customize the configuration:"
echo -e "     ${BLUE}config/taxonomies/$TAXONOMY_TYPE.config.ts${NC}"
echo ""
echo "  2. Set up Supabase:"
echo "     - Create a new project at https://supabase.com"
echo "     - Update .env.local with your Supabase credentials"
echo "     - Run database migrations (see database/README.md)"
echo ""
echo "  3. Configure storage (Wasabi or alternative):"
echo "     - Sign up at https://wasabi.com"
echo "     - Update .env.local with your credentials"
echo ""
echo "  4. Install dependencies:"
echo -e "     ${BLUE}pnpm install${NC}"
echo ""
echo "  5. Start development server:"
echo -e "     ${BLUE}pnpm dev${NC}"
echo ""
echo "  6. Review documentation:"
echo "     - docs/CONFIGURATION_GUIDE.md"
echo "     - docs/CLONING_GUIDE.md"
echo "     - config/README.md"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
echo ""

