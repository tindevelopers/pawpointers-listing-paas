#!/bin/bash
# Script to push migrations using Supabase CLI
# This requires authentication with Supabase CLI

set -e

PROJECT_REF="gakuwocsamrqcplrxvmh"

echo "🔧 Pushing migrations to remote Supabase database..."
echo "Project: $PROJECT_REF"
echo ""

# Check if linked
if [ ! -f ".supabase/linked" ] && [ ! -f ".supabase/project-ref" ]; then
  echo "📋 Linking project..."
  echo "   This will prompt for authentication"
  supabase link --project-ref "$PROJECT_REF" || {
    echo ""
    echo "❌ Failed to link project"
    echo ""
    echo "Alternative: Use Supabase Dashboard SQL Editor"
    echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
    echo "   2. Copy contents of: supabase/all_migrations_combined.sql"
    echo "   3. Paste and run"
    exit 1
  }
fi

echo ""
echo "📤 Pushing migrations..."
supabase db push --linked || {
  echo ""
  echo "❌ Failed to push migrations"
  echo ""
  echo "Try manually:"
  echo "   1. Ensure you're authenticated: supabase login"
  echo "   2. Link project: supabase link --project-ref $PROJECT_REF"
  echo "   3. Push migrations: supabase db push"
  exit 1
}

echo ""
echo "✅ Migrations pushed successfully!"

