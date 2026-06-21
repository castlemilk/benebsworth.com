terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    dnsimple = {
      source  = "dnsimple/dnsimple"
      version = "~> 1.5"
    }
  }
  # Remote state so it survives fresh clones (no more empty-state landmine).
  backend "s3" {
    bucket       = "benebsworth-tfstate-299413881343"
    key          = "staging/terraform.tfstate"
    region       = "ap-southeast-2"
    encrypt      = true
    use_lockfile = true
  }
}
module "site" {
  source      = "../../modules/site"
  domain      = "next.benebsworth.com"
  aliases     = ["next.benebsworth.com"]
  bucket_name = "benebsworth-site-staging-299413881343"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
    dnsimple      = dnsimple
  }
}
output "distribution_id" {
  value = module.site.distribution_id
}
output "bucket" {
  value = module.site.bucket
}
