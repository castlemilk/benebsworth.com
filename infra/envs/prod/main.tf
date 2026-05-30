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
}
module "site" {
  source      = "../../modules/site"
  domain      = "benebsworth.com"
  aliases     = ["benebsworth.com", "www.benebsworth.com"]
  bucket_name = "benebsworth.com"
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
