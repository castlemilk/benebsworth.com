# Batch 02 source and ownership audit

Audit date: 17 November 2026 (Australia/Melbourne).

Repository: [castlemilk/benebsworth.com](https://github.com/castlemilk/benebsworth.com), default branch `master`. Fresh remote and clean isolated clone both resolved to **`92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76`**, the PR157 ART04 recovery merge. The dirty Mac checkout was not accessed or modified.

## Instructions and identity

Read `CLAUDE.md`, `DESIGN.md`, `docs/design/VISUAL-REVIEW.md`, `.impeccable.md`, `.agents/skills/blog-development/SKILL.md`, `lib/topics.ts`, and the recovered-art README/manifest. Root `AGENTS.md` returned 404; the recursive source tree contained no `AGENTS.md`.

The latest Blog/Lab direction in `DESIGN.md` is an open research folio: graphite and warm ivory, restrained red detail, meaningful negative space, Source Serif 4, Barlow Condensed and short selectable Caveat notes. Generated image plates remain free of labels, numbers and callouts. Hiking retains its separate natural stone/forest trail-journal identity. Preserve approved custom-v6 symbols and official technology assets. These new raster concepts are metaphorical artwork studies, not scientific evidence, real graph topology, operational status or vendor endorsement.

## Exact existing-topic mapping

Source: [lib/topics.ts at the audited revision](https://github.com/castlemilk/benebsworth.com/blob/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76/lib/topics.ts). All ten keys below already exist among the current twenty topics. No taxonomy or registry edits are needed.

| Key | Existing label | Existing icon |
| --- | --- | --- |
| `kubernetes` | Kubernetes | `/topics/kubernetes.png` |
| `istio` | Service Mesh | `/topics/istio.png` |
| `tekton` | CI/CD · Tekton | `/topics/tekton.png` |
| `kustomize` | Config · Kustomize | `/topics/kustomize.png` |
| `minikube` | Local Dev | `/topics/minikube.png` |
| `gcp` | Google Cloud | `/topics/gcp.png` |
| `react` | React | `/topics/react.png` |
| `technology` | Engineering | `/topics/technology.png` |
| `general` | Field Notes | `/topics/technology.png` |
| `hiking` | Hiking | `/topics/technology.png` |

## Concurrent owners

The fresh open-PR query returned these four draft lanes. Their files remain outside Batch 02 ownership.

| Lane | PR | Exact head |
| --- | --- | --- |
| Graph source/model | [158](https://github.com/castlemilk/benebsworth.com/pull/158) | `85eda8e00d4f2408aef841144bbae5a3a01f6713` |
| Editorial component workbench | [159](https://github.com/castlemilk/benebsworth.com/pull/159) | `28915abdfde858dd84d0a49066708eb8c3baad38` |
| Motion/accessibility workbench | [160](https://github.com/castlemilk/benebsworth.com/pull/160) | `903f7503236fc16855ce2dbfb8049592e902a617` |
| Graph views | [161](https://github.com/castlemilk/benebsworth.com/pull/161) | `f7dd7e57861891ccb81a7c9fb08467a555999190` |

No remote `art/blog-category-expansion-batch-02` branch was returned, and no `category-expansion` paths existed on the audited master. Batch ownership remains `docs/design/category-expansion/batch-02/` and `public/artwork/category-expansion-v1/batch-02/` only.

## ART04 family context and limits

The six exact recovered PNGs are present under `docs/design/art04-recovered-originals/originals/`: circuit, black hole, atom, floppy disk, branching graph and brain. Running `python3 docs/design/art04-recovered-originals/verify.py` passed for all six. No original bytes were changed.

Original full generation prompts/settings and companion authored SVGs were not recovered. This batch must not invent them or describe the recovered rasters as editable vectors. The recovery [README](https://github.com/castlemilk/benebsworth.com/blob/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76/docs/design/art04-recovered-originals/README.md) and [manifest](https://github.com/castlemilk/benebsworth.com/blob/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76/docs/design/art04-recovered-originals/manifest.json) record their actual completeness.

Direct local-image inspection of the circuit and floppy showed graphite/ivory tactile linework with restrained red detail. The circuit has a broad pale soft halo when displayed against dark; the floppy has small coloured fringes at some edges. These are observed source-image limitations, not browser findings. Use the family material and silhouettes as context, while requiring independent alpha/edge inspection for new assets. Do not inherit a no-halo claim from the recovered work.

## Remote publication boundary

The source `vercel.json` sets `git.deploymentEnabled` to `false`. Production publishing is an explicit `workflow_dispatch`, while the reviewed editorial publisher only auto-publishes its fixed `codex/gamma-blog-editorial-20261027` branch.

However, `.github/workflows/vercel-preview.yml` triggers on non-master pushes and can deploy when repository variable `VERCEL_PREVIEW_CI_ENABLED == 'true'`. Draft-PR status does not disable that push trigger. PR158 records an earlier read of `false`; that is historical evidence, not a fresh value confirmed by this audit.

Fresh variable access was unavailable:

- GitHub connector `fetch` rejected the `/actions/variables/VERCEL_PREVIEW_CI_ENABLED` endpoint as unsupported with HTTP 400.
- `gh api` could not authenticate because this environment has no configured CLI token. No login or credential change was attempted.

The authenticated GitHub connector reports repository push permission, but this does not establish that a push cannot deploy. Preserve the local branch and complete patch/assets handoff unless already available metadata separately verifies the preview flag. Do not change settings or permissions to resolve this gate.

No remote branch, push, PR, merge, workflow dispatch or deployment was performed by this audit. No browser or native-app interaction occurred. Actual consuming-page light/dark, crop and narrow-screen browser checks remain unavailable; local image inspection and file-integrity checks are separate evidence.
