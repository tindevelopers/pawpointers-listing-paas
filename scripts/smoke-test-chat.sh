#!/usr/bin/env bash
# Smoke test: portal chat API and Abacus custom chatbot integration.
# Run after starting the portal (e.g. pnpm dev) so localhost:3030 is up.

set -e
BASE="${1:-http://localhost:3030}"

echo "=== Smoke test: Chat API + Abacus custom bot ==="
echo "Base URL: $BASE"
echo ""

echo "1. GET /api/chat (health + provider)..."
GET_RESP=$(curl -s "$BASE/api/chat")
echo "$GET_RESP" | head -c 500
echo ""
ENABLED=$(echo "$GET_RESP" | grep -o '"enabled":true' || true)
PROVIDER=$(echo "$GET_RESP" | grep -o '"provider":"[^"]*"' || true)
if [ -z "$ENABLED" ]; then
  echo "FAIL: Chat not enabled (check env: AI_CHAT_PROVIDER, ABACUS_* or gateway/OpenAI vars)."
  exit 1
fi
echo "OK: Chat enabled. $PROVIDER"
echo ""

echo "2. POST /api/chat (send message, expect 200 + non-empty reply)..."
POST_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, please say hi back."}')
HTTP_CODE=$(echo "$POST_RESP" | tail -n1)
BODY=$(echo "$POST_RESP" | sed '$d')
SUCCESS=$(echo "$BODY" | grep -o '"success":true' || true)
MESSAGE=$(echo "$BODY" | grep -o '"message":"[^"]*"' | head -1)

if [ "$HTTP_CODE" != "200" ] || [ -z "$SUCCESS" ]; then
  echo "FAIL: POST returned HTTP $HTTP_CODE or success:false"
  echo "$BODY" | head -c 400
  exit 1
fi
if [ -z "$MESSAGE" ]; then
  echo "FAIL: No message in response."
  exit 1
fi
echo "OK: HTTP 200, success: true, reply received."
echo "Reply snippet: ${MESSAGE:0:80}..."
echo ""
echo "=== Smoke test passed. Chat widget is wired end-to-end; provider = $PROVIDER ==="
