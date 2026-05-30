#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: deploy.sh [staging|prod]}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "$ENV" = "prod" ]; then BUCKET="benebsworth.com"; else BUCKET="next.benebsworth.com"; fi
DIST_ID="$(cd "infra/envs/$ENV" && terraform output -raw distribution_id)"

npm run build

# The legacy Gatsby archive build (build:archive) requires a Linux / Node-16
# environment with libvips available for sharp (Phase 5 finding). It frequently
# fails on a local macOS / newer-Node setup. If it fails the new site still
# deploys fine, so the archive step is skippable via SKIP_ARCHIVE=1 to keep a
# broken legacy build from blocking a deploy of the new site.
if [ "${SKIP_ARCHIVE:-}" = "1" ]; then
  echo "SKIP_ARCHIVE=1 set — skipping legacy archive build"
else
  npm run build:archive
fi

# HTML: short cache; hashed assets: long immutable cache
aws --profile ben s3 sync out/ "s3://$BUCKET" --delete \
  --exclude '*.html' --cache-control 'public,max-age=31536000,immutable'
aws --profile ben s3 sync out/ "s3://$BUCKET" --delete \
  --exclude '*' --include '*.html' --cache-control 'public,max-age=60'

aws --profile ben cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*'
echo "deployed $ENV -> $BUCKET"
