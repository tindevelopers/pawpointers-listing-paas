#!/bin/bash

# Configure Remote Supabase Database Connection
# Usage: ./scripts/configure-remote-supabase.sh

set -e

PROJECT_REF="gakuwocsamrqcplrxvmh"
SUPABASE_URL="https://gakuwocsamrqcplrxvmh.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjU4NzMsImV4cCI6MjA4NDYwMTg3M30.83Ka_MlIYx_oR2V5FaF0b1G7J_hmmaCq3WwvtFl39p0"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyNTg3MywiZXhwIjoyMDg0NjAxODczfQ.-OMdZwRNGVNY7GSjeLOo6zUYDVKwcCFuHNp4U2SWTbA"

echo "🔧 Configuring remote Supabase connection..."
echo "Project ID: $PROJECT_REF"
echo "URL: $SUPABASE_URL"
echo ""

# Create root .env.local
echo "📝 Creating root .env.local..."
cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

# Portal Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3001
EOF

# Create portal .env.local
echo "📝 Creating apps/portal/.env.local..."
cat > apps/portal/.env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

# Portal Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3001
EOF

# Create admin .env.local
echo "📝 Creating apps/admin/.env.local..."
cat > apps/admin/.env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_KEY=$SERVICE_KEY
EOF

# Update supabase config.toml
echo "📝 Updating supabase/config.toml..."
sed -i '' "s/project_id = \".*\"/project_id = \"$PROJECT_REF\"/" supabase/config.toml

# Create .supabase directory and project-ref file
echo "📝 Creating .supabase/project-ref..."
mkdir -p .supabase
echo "$PROJECT_REF" > .supabase/project-ref

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Verify connection: pnpm supabase db remote status"
echo "2. Push migrations: pnpm supabase db push"
echo "3. Start dev servers: pnpm dev"
echo ""
