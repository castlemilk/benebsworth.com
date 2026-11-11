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
# `next build` runs locally before Wrangler uploads the static export. Load the
# project env here as well as through Task's dotenv support so the npm deploy
# aliases cannot accidentally build without public build-time configuration.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

GA_ID="${NEXT_PUBLIC_GA_MEASUREMENT_ID:-}"
if [[ "$ENV" == "prod" && ! "$GA_ID" =~ ^G-[A-Z0-9]+$ ]]; then
  echo "error: NEXT_PUBLIC_GA_MEASUREMENT_ID must be set to a GA4 ID (G-...) for production deploys" >&2
  echo "       add it to .env or export it before running the deploy" >&2
  exit 1
fi

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"

# Production only ever serves the tip of origin/master, and only moves forward.
# A local prod deploy from a stale checkout or a side branch once looked like
# "the redesign got wiped" (docs/postmortem/0010). The checked GitHub workflow
# ("Publish checked site") is the normal path; this is the local fallback.
if [[ "$ENV" == "prod" ]]; then
  git fetch --quiet origin master
  HEAD_SHA="$(git rev-parse HEAD)"
  if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
    echo "error: production deploys need a clean, fully committed checkout" >&2; exit 1
  fi
  if [[ "$HEAD_SHA" != "$(git rev-parse origin/master)" ]]; then
    echo "error: HEAD ($HEAD_SHA) is not the tip of origin/master." >&2
    echo "       Merge to master and deploy master; prefer the 'Publish checked site' workflow." >&2
    exit 1
  fi
  node scripts/site-release.mjs assert-forward "$HEAD_SHA"
fi
# Always a from-scratch build. `task build` fingerprints its inputs and would
# legitimately skip, but a deploy is the one place where "out/ is exactly this
# working tree, with no stale chunk from an earlier run" is worth the extra ~60s.
task build:clean

if [[ "$ENV" == "prod" ]] && ! rg --quiet --fixed-strings --glob '*.html' \
  "https://www.googletagmanager.com/gtag/js?id=${GA_ID}" out; then
  echo "error: production build does not contain the configured GA4 loader" >&2
  exit 1
fi

if [[ "$ENV" == "prod" ]]; then
  # The receipt (out/build-info.json) is what the forward-only check reads next time.
  node scripts/site-release.mjs stamp-local "$HEAD_SHA" > /dev/null
  npx wrangler pages deploy out --project-name="$PROJECT" --branch="$BRANCH" --commit-hash="$HEAD_SHA" --commit-dirty=false
else
  npx wrangler pages deploy out --project-name="$PROJECT" --branch="$BRANCH" --commit-dirty=true
fi
echo "deployed $ENV -> Cloudflare Pages project $PROJECT"
