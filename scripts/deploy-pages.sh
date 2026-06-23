#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: deploy-pages.sh [staging|prod]}"
case "$ENV" in
  staging) PROJECT="benebsworth-next" ;;
  prod)    PROJECT="benebsworth" ;;
  *) echo "error: ENV must be 'staging' or 'prod' (got '$ENV')" >&2; exit 1 ;;
esac
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
npm run build
npx wrangler pages deploy out --project-name="$PROJECT" --commit-dirty=true
echo "deployed $ENV -> Cloudflare Pages project $PROJECT"
