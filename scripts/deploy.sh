#!/bin/bash
set -e
cd "$(dirname "$0")/.."

MSG="${1:-Update family tree}"

git add .

if git diff --staged --quiet; then
  echo "Nothing to deploy — no changes found."
  exit 0
fi

git commit -m "$MSG"
git push

echo ""
echo "Deployed! Vercel will update your live site in about 1–2 minutes."
