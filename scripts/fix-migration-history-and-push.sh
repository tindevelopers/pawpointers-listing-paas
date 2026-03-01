#!/bin/bash
# Fix migration history table and push recent migrations.
#
# Usage:
#   ./scripts/fix-migration-history-and-push.sh [PROJECT_REF]
#   PROJECT_REF=omczmkjrpsykpwiyptfj ./scripts/fix-migration-history-and-push.sh
#
# Prerequisites: supabase login, and (if migration history is missing) run
# supabase/fix_migration_history.sql in Dashboard SQL Editor once.

set -e

PROJECT_REF="${PROJECT_REF:-$1}"

if [ -z "$PROJECT_REF" ]; then
  echo "Usage: PROJECT_REF=your-ref ./scripts/fix-migration-history-and-push.sh"
  echo "   or: ./scripts/fix-migration-history-and-push.sh your-ref"
  echo ""
  echo "Get PROJECT_REF from: Supabase Dashboard → Project Settings → General"
  exit 1
fi

echo "🔧 Fix migration history and push migrations"
echo "   Project ref: $PROJECT_REF"
echo ""

# Ensure project is linked (project ref file + config.toml for CLI)
mkdir -p .supabase
echo "$PROJECT_REF" > .supabase/project-ref

# Ensure config.toml has project_id so CLI sees the link
if grep -q "^# project_id\|^project_id" supabase/config.toml 2>/dev/null; then
  # Replace comment or existing project_id with current ref (macOS and Linux)
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "s/^# project_id.*/project_id = \"$PROJECT_REF\"/; s/^project_id = .*/project_id = \"$PROJECT_REF\"/" supabase/config.toml
  else
    sed -i.bak "s/^# project_id.*/project_id = \"$PROJECT_REF\"/; s/^project_id = .*/project_id = \"$PROJECT_REF\"/" supabase/config.toml && rm -f supabase/config.toml.bak
  fi
else
  # No project_id line yet; add after line 4 (after the comment block)
  (head -n 4 supabase/config.toml; echo "project_id = \"$PROJECT_REF\""; tail -n +5 supabase/config.toml) > supabase/config.toml.tmp && mv supabase/config.toml.tmp supabase/config.toml
fi

echo "✅ Using project ref: $PROJECT_REF"
echo "   To store DB password for push, run: supabase link --project-ref $PROJECT_REF"

echo ""
echo "📋 If you see errors about 'schema_migrations' or 'supabase_migrations', run this SQL in Dashboard first:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo "   File: supabase/fix_migration_history.sql"
echo ""
echo "📋 Pushing migrations (--include-all to include all local files)..."
echo ""

if supabase db push --linked --include-all --yes 2>&1; then
  echo ""
  echo "✅ Migrations pushed successfully."
  echo "   Check: supabase db remote status"
else
  echo ""
  echo "❌ Push failed. Try:"
  echo "   1. Run supabase/fix_migration_history.sql in Dashboard SQL Editor, then run this script again."
  echo "   2. Or run: supabase link --project-ref $PROJECT_REF  (enter DB password), then: supabase db push --linked --include-all"
  exit 1
fi
