#!/usr/bin/env bash
set -euo pipefail
OUT="${1:?provide verified output directory}"
: "${CLOUDFLARE_API_TOKEN:?existing Cloudflare credential is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?existing Cloudflare account is required}"
: "${GITHUB_SHA:?source commit is required}"
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
case "${DEPLOY_TARGET:-}" in
  staging) PROJECT=benebsworth-next; BRANCH=lab-expansion-8-posts ;;
  prod)
    PROJECT=benebsworth; BRANCH=master
    [[ "${NEXT_PUBLIC_GA_MEASUREMENT_ID:-}" =~ ^G-[A-Z0-9]+$ ]] || { echo 'Missing valid production GA4 configuration'; exit 1; }
    grep -r -q --include='*.html' --fixed-strings "https://www.googletagmanager.com/gtag/js?id=${NEXT_PUBLIC_GA_MEASUREMENT_ID}" "$OUT" || { echo 'Production GA4 loader absent'; exit 1; }
    ;;
  *) echo 'Unknown deployment target'; exit 1 ;;
esac
# The build was checked in a separate job without deployment credentials.
# This is the same Cloudflare Pages project/branch mapping as deploy-pages.sh.
node_modules/.bin/wrangler pages deploy "$OUT" --project-name="$PROJECT" --branch="$BRANCH" --commit-hash="$GITHUB_SHA" --commit-dirty=false
