#!/usr/bin/env bash
set -euo pipefail
# Build the legacy Gatsby site with /archive prefix and place it in out/archive.
#
# BUILD REQUIREMENTS (Node 16 is necessary but NOT sufficient — see below):
#   1. Node <=16.x (tested target 16.20.2 / nvm lts/gallium). The Gatsby v2 JS
#      runtime does NOT run on Node 18+/20+/22+.
#   2. System libvips installed (gatsby-plugin-sharp -> old `sharp` compiles
#      against it via node-gyp): `apt-get install libvips-dev` on Debian/Ubuntu,
#      `brew install vips` on macOS.
#   3. A toolchain where the bundled old `sharp` native sources actually compile.
#      Verified on this box (Darwin 25.5, Node 16.20.2): the build FAILS — sharp's
#      node-gyp build errors with `fatal error: 'vips/vips8' file not found` and
#      V8 header incompatibilities against the current clang. The reliable path
#      for Phase 6 is a Linux CI image, e.g. `node:16-bullseye` +
#      `apt-get install libvips-dev`, NOT this dev machine.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/legacy"

# Legacy toolchain needs an older Node; pin via nvm if available.
# NOTE: `nvm` is a shell function, not a binary, so `command -v nvm` fails in a
# non-interactive script. Source nvm.sh first so `nvm use` actually runs.
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
fi
if command -v nvm >/dev/null 2>&1; then
  nvm use 16 || nvm install 16 || nvm use 14 || nvm install 14 || true
fi

npm install --legacy-peer-deps
npx gatsby clean
npx gatsby build --prefix-paths
mkdir -p "$ROOT/out/archive"
cp -R public/* "$ROOT/out/archive/"
echo "archive built into out/archive"
