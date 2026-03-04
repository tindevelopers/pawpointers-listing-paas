#!/bin/bash
# Seed unclaimed listings into the REMOTE Supabase database via CLI.
# Requires: project linked (supabase link), supabase login
# Uses: supabase/seed.sql (inserts 10 unclaimed listings when tenant exists)

set -e

echo "Seeding unclaimed listings to REMOTE Supabase database..."
echo ""

# Ensure we're linked
if [ ! -f .supabase/project-ref ]; then
  echo "Project not linked. Run: supabase link --project-ref <your-project-ref>"
  echo "Get project ref from: https://app.supabase.com → your project → Settings → General"
  exit 1
fi

PROJECT_REF=$(cat .supabase/project-ref)
echo "Linked project: $PROJECT_REF"
echo ""

# Push migrations (skips if up to date) and run seed
supabase db push --linked --include-seed

echo ""
echo "Done. Unclaimed listings seeded to remote database."
echo ""
echo "For localhost to use REMOTE Supabase, ensure .env.local has:"
echo "  NEXT_PUBLIC_SUPABASE_URL=https://${PROJECT_REF}.supabase.co"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>"
echo ""
echo "Then run: pnpm dev"
echo "Visit Portal (e.g. http://localhost:3030), sign in, open a listing to see 'Claim this business'."
