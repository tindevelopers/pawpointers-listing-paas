#!/usr/bin/env bash
# Add Abacus chat env vars to Vercel (production + preview).
# Run from repo root after linking:  vercel link   (choose team + project, e.g. pawpointers-portal)
set -e
SCOPE="${VERCEL_SCOPE:-tindeveloper}"

if [ ! -f .vercel/project.json ]; then
  echo "Not linked to a Vercel project. Run:  vercel link"
  echo "Then run this script again."
  exit 1
fi

echo "Adding chat env vars for Production and Preview..."
echo ""

echo "abacus" | vercel env add AI_CHAT_PROVIDER production -S "$SCOPE" -y
echo "abacus" | vercel env add AI_CHAT_PROVIDER preview -S "$SCOPE" -y
echo "Added AI_CHAT_PROVIDER=abacus"

echo "13b3c8ef80" | vercel env add ABACUS_DEPLOYMENT_ID production -S "$SCOPE" -y
echo "13b3c8ef80" | vercel env add ABACUS_DEPLOYMENT_ID preview -S "$SCOPE" -y
echo "Added ABACUS_DEPLOYMENT_ID=13b3c8ef80"

echo ""
echo "Paste your ABACUS_DEPLOYMENT_TOKEN when prompted (production, then preview)."
vercel env add ABACUS_DEPLOYMENT_TOKEN production -S "$SCOPE" --sensitive
vercel env add ABACUS_DEPLOYMENT_TOKEN preview -S "$SCOPE" --sensitive
echo ""
echo "Done. Redeploy for changes to take effect."
