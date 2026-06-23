terraform {
  required_version = ">= 1.5"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket       = "benebsworth-tfstate-299413881343"
    key          = "cloudflare/terraform.tfstate"
    region       = "ap-southeast-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "cloudflare" {
  # Token if provided, else fall back to Global API Key + email.
  api_token = var.cloudflare_api_token != "" ? var.cloudflare_api_token : null
  api_key   = var.cloudflare_api_token == "" && var.cloudflare_global_api_key != "" ? var.cloudflare_global_api_key : null
  email     = var.cloudflare_api_token == "" && var.cloudflare_email != "" ? var.cloudflare_email : null
}
