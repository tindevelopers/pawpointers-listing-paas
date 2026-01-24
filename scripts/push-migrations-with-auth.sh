#!/bin/bash
# Script to push migrations using Supabase CLI with authentication

set -e

PROJECT_REF="gakuwocsamrqcplrxvmh"

echo "🔧 Pushing migrations to remote Supabase database..."
echo "Project: $PROJECT_REF"
echo ""

# Step 1: Check if authenticated
echo "📋 Step 1: Checking authentication..."
if ! supabase projects list 2>&1 | grep -q "LINKED\|REFERENCE"; then
  echo "⚠️  Not authenticated with Supabase CLI"
  echo ""
  echo "Please authenticate first:"
  echo "  1. Run: supabase login"
  echo "  2. This will open a browser for authentication"
  echo "  3. Then run this script again"
  echo ""
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Step 2: Link project
echo "📋 Step 2: Linking project..."
if [ ! -f ".supabase/linked" ]; then
  echo "   Linking project $PROJECT_REF..."
  supabase link --project-ref "$PROJECT_REF" || {
    echo ""
    echo "❌ Failed to link project"
    echo ""
    echo "This might mean:"
    echo "  - The project doesn't exist in your account"
    echo "  - You don't have access to this project"
    echo ""
    echo "Alternative: Use Supabase Dashboard SQL Editor"
    echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
    echo "   2. Copy contents of: supabase/all_migrations_combined.sql"
    echo "   3. Paste and run"
    exit 1
  }
  echo "✅ Project linked"
else
  echo "✅ Project already linked"
fi

echo ""

# Step 3: Push migrations
echo "📋 Step 3: Pushing migrations..."
supabase db push --linked --include-all || {
  echo ""
  echo "❌ Failed to push migrations"
  echo ""
  echo "Try manually:"
  echo "   supabase db push --linked --include-all"
  exit 1
}

echo ""
echo "✅ Migrations pushed successfully!"
echo ""
echo "Next: Create admin user"
echo "   npx tsx scripts/create-admin-with-migrations.ts"

