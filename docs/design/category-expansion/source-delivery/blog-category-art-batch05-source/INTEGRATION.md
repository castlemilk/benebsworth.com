# Batch 05 source handoff

Local revision: `831b30a2bb287d30c73a3df394a02da33c22640c`. Tree: `f0cb4d8c2d68cfd16a66089723e8bb909a41953a`. Baseline: `92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76`.

The patch adds only the two assigned Batch 05 asset/docs paths. Its application was verified against a separate temporary index seeded from the baseline; the reconstructed tree equals the local commit tree exactly. No remote ref was created.

Use an isolated checkout or worktree of the correct repository at the baseline. Inspect `HANDOFF.json`, the asset manifest, exact requests and visual observations before applying `blog-category-art-batch05.patch`. The patch is a standard binary git-format-patch file, suitable for `git apply --check` followed by `git am` in a clean isolated checkout. Applying it does not activate any registry or consumer.

Do not publish a branch until the preview workflow opt-in is verified through an authorized existing path. Preserve all browser, merge and deployment holds. Current proposed study labels are not taxonomy additions.

The complete source files accompany the patch. Open `docs/design/category-expansion/batch-05/gallery.html` after extraction to inspect the local gallery. Verify the supplied SHA256SUMS from the extracted root.
