---
name: deploy
description: Deploy benebsworth.com to production or staging using Terraform and the AWS CLI.
---

# Deploy benebsworth.com

The site uses a fully static export (`next build`) deployed to an AWS S3 bucket and served via CloudFront.

## Architecture & Process
1. **Infrastructure**: AWS resources (S3, CloudFront) are managed via Terraform in `infra/envs/prod` and `infra/envs/staging`.
2. **Build**: The site builds to the `out/` directory. Legacy Gatsby archive build (`build:archive`) is run alongside it unless `SKIP_ARCHIVE=1` is passed.
3. **Deploy script**: `npm run deploy:prod` or `npm run deploy:next` (for staging) wraps the `scripts/deploy.sh` script.

## Steps to Deploy

### 1. Verify Terraform state
The `deploy.sh` script relies on terraform output for the `DIST_ID` and `BUCKET`.
Ensure that `infra/envs/prod` (or staging) is initialized and outputs the correct values.
If Terraform state is unpopulated locally, you can export these variables directly before running the deploy script:
```bash
export DIST_ID="<your-cloudfront-id>"
export BUCKET="<your-s3-bucket-name>"
```

### 2. Run the deployment
To deploy to production:
```bash
SKIP_ARCHIVE=1 npm run deploy:prod
```
> **Note:** The legacy Gatsby archive (`build:archive`) frequently fails on macOS with modern Node versions due to Sharp/libvips. Passing `SKIP_ARCHIVE=1` bypasses this step while preserving the existing archive on S3 using `--exclude 'archive/*'`.

To deploy to staging:
```bash
SKIP_ARCHIVE=1 npm run deploy:next
```

The script will:
- Build the Next.js static bundle (`out/`)
- Perform a two-pass S3 sync (one for immutable hashed assets `_next/static/`, one for everything else with a short TTL)
- Issue a CloudFront cache invalidation for `/*`
