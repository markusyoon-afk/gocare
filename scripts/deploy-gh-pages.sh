#!/usr/bin/env bash
# Deploy GoCARE to GitHub Pages under the markusyoon-afk account.
#
# YOU run this (not the assistant) — it publishes to a PUBLIC URL. The app carries
# "CONFIDENTIAL // CUI" markings and unpublished validation figures; the whole
# bundle is downloadable by anyone with the link (the access code is only a
# deterrent). Deploy only if that content is cleared for a shared link.
#
# Usage (from the gocare/ folder, in Git Bash):
#   bash scripts/deploy-gh-pages.sh
#
# Reuses the SURV device-flow token by default; override with:  GH_TOKEN=xxxx bash scripts/deploy-gh-pages.sh
set -euo pipefail

OWNER="markusyoon-afk"
REPO="gocare"
TOKEN="${GH_TOKEN:-$(cat "$HOME/Projects/surv/.git/gh_token.txt" 2>/dev/null | tr -d '[:space:]' || true)}"
if [ -z "$TOKEN" ]; then echo "No token found. Set GH_TOKEN=... and re-run."; exit 1; fi

AUTH="Authorization: token $TOKEN"
PUSH_URL="https://x-access-token:$TOKEN@github.com/$OWNER/$REPO.git"

echo "==> Building..."
npm run build

echo "==> Ensuring repo $OWNER/$REPO exists (public)..."
code=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "https://api.github.com/repos/$OWNER/$REPO")
if [ "$code" = "404" ]; then
  curl -s -X POST -H "$AUTH" -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$REPO\",\"description\":\"GoCARE — GoDx clinical software ecosystem (demo)\",\"private\":false,\"has_issues\":false,\"has_wiki\":false}" >/dev/null
  echo "    created."
else
  echo "    exists (HTTP $code)."
fi

echo "==> Pushing source to main..."
git branch -M main
git push -q "$PUSH_URL" main

echo "==> Publishing built site to gh-pages..."
rm -rf .deploy-tmp
cp -r dist .deploy-tmp
cd .deploy-tmp
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email="markusyoon@gmail.com" -c user.name="Markus Yoon" commit -q -m "deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -q -f "$PUSH_URL" gh-pages
cd ..
rm -rf .deploy-tmp

echo "==> Enabling GitHub Pages (gh-pages branch)..."
curl -s -X POST -H "$AUTH" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$OWNER/$REPO/pages" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}' >/dev/null || true

echo ""
echo "Done. Live in ~1-2 min at:  https://$OWNER.github.io/$REPO/"
echo "Access code: godx-demo-2026"
