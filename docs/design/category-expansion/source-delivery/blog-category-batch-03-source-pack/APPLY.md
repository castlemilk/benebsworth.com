# Apply and verify

This packet represents local commit 65add2d059565f9ca7b8ad05c2e3fc242d76f5ac (tree 1a625e09b0cb971af885697381d606b4a68bee52) based on 92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76.

Use a clean isolated checkout at that exact base. Keep the dirty Mac checkout and other owners untouched. Inspect the complete source files and review notes before any integration.

```bash
git apply --check blog-category-batch-03.patch
git apply --index blog-category-batch-03.patch
python3 docs/design/category-expansion/batch-03/verify.py --manifest docs/design/category-expansion/batch-03/manifest.json --output /tmp/batch03-verification.json
sha256sum --check docs/design/category-expansion/batch-03/SHA256SUMS
```

The binary patch was applied in a temporary index and reconstructed the recorded exact tree. No remote branch or PR exists for this handoff. Verify the current legacy preview opt-in through existing authorised access before any push; this packet does not authorise changing it or deploying. See remote-preflight.json for exact blockers.

Ten selected images are under public/artwork/category-expansion-v1/batch-03/originals. One superseded compiler original is preserved under docs/design/category-expansion/batch-03/superseded. The contact sheets are secondary review derivatives; all separate images are included.
