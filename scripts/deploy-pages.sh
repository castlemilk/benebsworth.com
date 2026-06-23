#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: deploy-pages.sh [staging|prod]}"
# BRANCH must equal each project's production_branch (see infra/cloudflare/pages.tf)
# so wrangler publishes a PRODUCTION deployment (served on the custom domain),
# not a per-branch preview — regardless of which git branch we deploy from.
case "$ENV" in
  staging) PROJECT="benebsworth-next"; BRANCH="lab-expansion-8-posts" ;;
  prod)    PROJECT="benebsworth";      BRANCH="master" ;;
  *) echo "error: ENV must be 'staging' or 'prod' (got '$ENV')" >&2; exit 1 ;;
esac
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
npm run build
npx wrangler pages deploy out --project-name="$PROJECT" --branch="$BRANCH" --commit-dirty=true
echo "deployed $ENV -> Cloudflare Pages project $PROJECT"
