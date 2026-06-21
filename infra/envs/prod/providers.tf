# Prod is AWS-only (DNS + ACM are managed outside Terraform). CloudFront is a
# global service but the default provider manages it fine.
provider "aws" {
  region  = "ap-southeast-2"
  profile = "default"
}
