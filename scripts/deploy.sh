#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: deploy.sh [staging|prod]}"
if [ "$ENV" != "prod" ] && [ "$ENV" != "staging" ]; then
  echo "error: ENV must be 'prod' or 'staging' (got '$ENV')" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROFILE="${AWS_PROFILE:-default}"

if [ "$ENV" = "prod" ]; then BUCKET="benebsworth.com"; else BUCKET="next.benebsworth.com"; fi
DIST_ID="$(cd "infra/envs/$ENV" && terraform output -raw distribution_id)"

npm run build

# The legacy Gatsby archive build (build:archive) requires a Linux / Node-16
# environment with libvips available for sharp (Phase 5 finding). It frequently
# fails on a local macOS / newer-Node setup. If it fails the new site still
# deploys fine, so the archive step is skippable via SKIP_ARCHIVE=1 to keep a
# broken legacy build from blocking a deploy of the new site.
#
# When skipping, out/archive/ is not produced. Without an explicit exclude,
# `aws s3 sync --delete` would delete the previously-deployed archive/ prefix
# from the live bucket. Excluding archive/* makes --delete leave those keys
# untouched (sync never deletes keys that match an --exclude).
ARCHIVE_EXCLUDE=()
if [ "${SKIP_ARCHIVE:-}" = "1" ]; then
  echo "SKIP_ARCHIVE=1 set — skipping legacy archive build"
  ARCHIVE_EXCLUDE=(--exclude 'archive/*')
else
  npm run build:archive
fi

# Two passes. `output: 'export'` copies public/** (favicon, OG images,
# public/blog/**, public/projects/*) into out/ with NON-hashed names; only
# _next/static/** is content-hashed. So ONLY _next/static/* may be cached
# immutably; everything else (HTML, images, robots, sitemap, feed) gets a short
# cache so updates propagate.
#
# Pass 2's `--exclude '_next/static/*'` also stops its own --delete from wiping
# the immutable assets pass 1 just uploaded. The ARCHIVE_EXCLUDE expansion uses
# the bash 3.2-safe form so an empty array doesn't trip `set -u`.
aws --profile "$PROFILE" s3 sync out/ "s3://$BUCKET" --delete \
  "${ARCHIVE_EXCLUDE[@]+"${ARCHIVE_EXCLUDE[@]}"}" \
  --exclude '*' --include '_next/static/*' \
  --cache-control 'public,max-age=31536000,immutable'
aws --profile "$PROFILE" s3 sync out/ "s3://$BUCKET" --delete \
  "${ARCHIVE_EXCLUDE[@]+"${ARCHIVE_EXCLUDE[@]}"}" \
  --exclude '_next/static/*' \
  --cache-control 'public,max-age=60'

aws --profile "$PROFILE" cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*'
echo "deployed $ENV -> $BUCKET"
