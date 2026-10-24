# Remote blog authoring and publishing

The canonical destination is https://github.com/castlemilk/benebsworth.com, branch `master`. Production is https://benebsworth.com; staging is https://next.benebsworth.com. The repository supplies the deployable site, not an HTML attachment or a separate Sites project.

## Small reviewable steps

1. Invoke `$blog "seed"` in this repository. Claude clients can discover the `/blog` adapter. Use `--dry-run` in the seed to inspect the plan without publication.
2. Commit a draft at `content/blog/<slug>/index.mdx`, keeping `release: false` and `draft: true`. Put matching images in `content/blog/<slug>/` and `public/blog/<slug>/`. Use the existing editorial skill and registered MDX components.
3. Produce the review pack: exact version, native-layout preview, article, images/captions, metadata, sources/provenance, test results, unresolved blockers and changes since review. A standalone HTML copy is optional and cannot replace MDX.
4. Ask the user whether this exact version is ready to publish. If critical checks are failed or not run, report that first. Do not treat authoring or pushing a draft as approval.
5. After approval, prepare the release commit with the publication flags changed. Show its exact SHA and any material differences; changed article/assets require renewed approval. Merge only validated, authorised changes.
6. Dispatch `Publish reviewed site` **from master**, providing that full 40-character SHA and the approved staging or production target. A different SHA, branch or repository fails closed. An ordinary push never deploys.
7. Verify the workflow result, Cloudflare deployment receipt, live article, image URLs, metadata, feed and sitemap. Report source, CI and live deployment separately.

## Pipeline

`Site checks` runs install, lint, types, prose, unit tests, the full prebuild/build/postbuild chain and browser tests without deployment secrets.

The manual publish workflow repeats the checks, creates a content-hashed static-output receipt and transfers that exact artifact to a separate publishing job. Before deployment secrets become available, it verifies the receipt and checks every current production sitemap route exists in the new output. Missing live pages or an unavailable sitemap stops deployment. This matters because local-only published content must be reconciled into the repository before a remote release.

Publication uses the existing Cloudflare Pages projects: `benebsworth-next` / branch `lab-expansion-8-posts` for staging and `benebsworth` / branch `master` for production. The existing local `deploy-pages.sh` remains unchanged; the remote path publishes already-checked output rather than rebuilding while credentials are exposed.

## Setup that must be verified before first publication

- Existing GitHub environment credentials named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, valid for the current Pages projects.
- Existing repository variable `NEXT_PUBLIC_GA_MEASUREMENT_ID`; production checks the generated loader.
- The desired reviewer protection on GitHub `production` and `staging` environments. Declaring an environment in YAML does not prove a reviewer gate exists.
- All currently live pages have source in this repository. The route guard must pass, not be disabled to force a release.
- Successful hosted checks for the exact release commit and a native-layout review of the proposed article.

No credential values, permissions, environment protections, billing settings or runner configuration are created by this change. Their presence and validity have not been verified. Configuring them needs separate authorisation. Do not paste credentials into chat or source files.

## Cuttlefish

These are standard GitHub Actions workflows, initially targeting `ubuntu-24.04`. They can be invoked remotely through GitHub without access to the author's Mac. Running the checks on Cuttlefish requires a verified existing runner label and matching Node/browser tooling. Do not invent a runner mapping or claim Cuttlefish adoption from source changes alone. Reuse the same checks and receipt when an authorised mapping is established.

## Verification limits

The initial MDX article remains a draft and is intentionally absent from the public static export. A successful general site build therefore does not by itself prove the draft's native rendered appearance. Its separate MDX compilation and asset tests establish syntax and assets; browser review remains a distinct check.
