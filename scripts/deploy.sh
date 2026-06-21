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

# Allow env-var overrides so deploys work even when Terraform state is empty
# locally (common after repo clones). CI/CD or a populated terraform state will
# still provide the correct values.
DIST_ID="${DIST_ID:-$(cd "infra/envs/$ENV" && terraform output -raw distribution_id 2>/dev/null || echo "")}"
BUCKET="${BUCKET:-$(cd "infra/envs/$ENV" && terraform output -raw bucket 2>/dev/null || echo "")}"

if [ -z "$DIST_ID" ] || [ -z "$BUCKET" ]; then
  echo "error: DIST_ID and BUCKET must be set — either via env vars or terraform output" >&2
  echo "  DIST_ID=${DIST_ID:-<empty>}" >&2
  echo "  BUCKET=${BUCKET:-<empty>}" >&2
  exit 1
fi

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

# Three passes. `output: 'export'` copies public/** (favicon, OG images,
# public/blog/**, public/projects/*) into out/ with NON-hashed names; only
# _next/static/** is content-hashed.
#
#   Pass 1 — _next/static/*  : content-hashed → immutable, 1 year.
#   Pass 2 — media (images/fonts/video) : not hashed, but every deploy issues a
#            CloudFront invalidation (/*) so the edge is always fresh; only
#            BROWSER repeat-loads use this window. 1 day is a big win over the
#            old 60s without leaving redesign iterations stale for long — raise
#            to a week+ once content settles.
#   Pass 3 — everything else (HTML, sitemap, feed, robots, llms, .md siblings)
#            : short 60s cache so content/markup updates propagate fast.
#
# Each pass's filters partition the keyspace, so the per-pass `--delete` never
# wipes another pass's freshly-uploaded keys. The ARCHIVE_EXCLUDE expansion uses
# the bash 3.2-safe form so an empty array doesn't trip `set -u`.
MEDIA_GLOBS=('*.webp' '*.png' '*.jpg' '*.jpeg' '*.gif' '*.svg' '*.avif' '*.ico' '*.woff' '*.woff2' '*.mp4' '*.webm')
MEDIA_INCLUDE=(); MEDIA_EXCLUDE=()
for g in "${MEDIA_GLOBS[@]}"; do MEDIA_INCLUDE+=(--include "$g"); MEDIA_EXCLUDE+=(--exclude "$g"); done

aws --profile "$PROFILE" s3 sync out/ "s3://$BUCKET" --delete \
  "${ARCHIVE_EXCLUDE[@]+"${ARCHIVE_EXCLUDE[@]}"}" \
  --exclude '*' --include '_next/static/*' \
  --cache-control 'public,max-age=31536000,immutable'
aws --profile "$PROFILE" s3 sync out/ "s3://$BUCKET" --delete \
  "${ARCHIVE_EXCLUDE[@]+"${ARCHIVE_EXCLUDE[@]}"}" \
  --exclude '*' "${MEDIA_INCLUDE[@]}" --exclude '_next/static/*' \
  --cache-control 'public,max-age=86400'
aws --profile "$PROFILE" s3 sync out/ "s3://$BUCKET" --delete \
  "${ARCHIVE_EXCLUDE[@]+"${ARCHIVE_EXCLUDE[@]}"}" \
  --exclude '_next/static/*' "${MEDIA_EXCLUDE[@]}" \
  --cache-control 'public,max-age=60'

aws --profile "$PROFILE" cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*'
echo "deployed $ENV -> $BUCKET"
