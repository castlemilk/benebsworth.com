# Prod infrastructure, ADOPTED into Terraform on 2026-06-19 via `import` blocks
# + `-generate-config-out` (the live resources predate the OAC module and were
# never in state). This env is intentionally SELF-CONTAINED and decoupled from
# `modules/site` — prod uses an older architecture (public S3 *website-endpoint*
# bucket + CloudFront custom origin + legacy cache), whereas the module (used by
# staging) is S3-REST + OAC + a rewrite function. Resources live in adopted.tf.
# DNS (DNSimple) and the ACM cert are managed OUTSIDE Terraform (the distribution
# references the cert ARN literally), which is why this env needs no DNSimple token.
#
# State lives in S3 (remote backend) so it survives fresh clones — the empty-state
# landmine that stranded prod before adoption cannot recur.
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket       = "benebsworth-tfstate-299413881343"
    key          = "prod/terraform.tfstate"
    region       = "ap-southeast-2"
    encrypt      = true
    use_lockfile = true
  }
}

output "distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}
output "bucket" {
  value = aws_s3_bucket.site.bucket
}
