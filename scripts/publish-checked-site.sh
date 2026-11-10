#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${EXPECTED_SHA:?set EXPECTED_SHA}"
: "${ARTICLE_PATH:?set ARTICLE_PATH to an existing published article route}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN in the authorized release environment}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID in the authorized release environment}"
[[ "${PUBLISH_CONFIRMATION:-}" == 'publish-benebsworth.com' ]] || { echo 'Explicit production confirmation is required' >&2; exit 1; }
[[ "${GITHUB_EVENT_NAME:-}" == 'workflow_dispatch' && "${GITHUB_REF:-}" == 'refs/heads/master' ]] || { echo 'Use the manual release workflow on master' >&2; exit 1; }
node scripts/site-release.mjs verify-artifact "$EXPECTED_SHA"
node scripts/site-release.mjs assert-analytics
node scripts/site-release.mjs check-article "$EXPECTED_SHA" "$ARTICLE_PATH"
node scripts/site-release.mjs preflight
remote_sha="$(git ls-remote origin refs/heads/master | cut -f1)"
[[ "$remote_sha" == "$EXPECTED_SHA" ]] || { echo 'Selected commit is no longer remote master; review the new commit' >&2; exit 1; }
# Existing Pages project and production branch; no infrastructure mutations.
# Explicit SHA/clean metadata replaces the legacy script's commit-dirty=true.
node_modules/.bin/wrangler pages deploy out --project-name=benebsworth --branch=master --commit-hash="$EXPECTED_SHA" --commit-dirty=false
node scripts/site-release.mjs verify-live "$EXPECTED_SHA" "$ARTICLE_PATH"
