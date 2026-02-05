#!/bin/bash
# Direct script to create accounts@mypetjet.com user
# Usage: ./scripts/create-accounts-user-direct.sh <service_role_key>

set -e

SERVICE_ROLE_KEY="${1:-${REMOTE_SUPABASE_SERVICE_ROLE_KEY}}"
SUPABASE_URL="https://gakuwocsamrqcplrxvmh.supabase.co"
EMAIL="accounts@mypetjet.com"
PASSWORD="88888888"
FULL_NAME="Accounts User"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Service role key is required"
  echo ""
  echo "Usage:"
  echo "  $0 <service_role_key>"
  echo ""
  echo "Or set environment variable:"
  echo "  REMOTE_SUPABASE_SERVICE_ROLE_KEY=your_key $0"
  echo ""
  echo "Get the service role key from:"
  echo "  https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/settings/api"
  exit 1
fi

echo "🔧 Creating user: $EMAIL"
echo "📡 Connecting to: $SUPABASE_URL"
echo ""

# Create user via Supabase Auth Admin API
echo "📋 Creating user in Auth..."
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"full_name\": \"${FULL_NAME}\"
    }
  }")

# Check if user was created or already exists
if echo "$RESPONSE" | grep -q "already registered\|already exists"; then
  echo "⚠️  User already exists in Auth"
  # Try to get user ID by listing users
  USER_LIST=$(curl -s -X GET \
    "${SUPABASE_URL}/auth/v1/admin/users?email=${EMAIL}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")
  
  USER_ID=$(echo "$USER_LIST" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$USER_ID" ]; then
    echo "❌ Could not find user ID"
    exit 1
  fi
  
  echo "✅ Found existing user: $USER_ID"
  
  # Update password
  echo "📋 Updating password..."
  curl -s -X PUT \
    "${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"password\": \"${PASSWORD}\"}" > /dev/null
  echo "✅ Password updated"
else
  USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create user"
    echo "Response: $RESPONSE"
    exit 1
  fi
  
  echo "✅ User created: $USER_ID"
fi

echo ""
echo "✅ User setup complete!"
echo ""
echo "📧 Login Credentials:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
echo "👤 User ID: $USER_ID"
echo ""
echo "🎉 You can now sign in with these credentials!"
