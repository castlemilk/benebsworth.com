terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws, aws.us_east_1]
    }
    dnsimple = {
      source  = "dnsimple/dnsimple"
      version = "~> 1.5"
    }
  }
}
