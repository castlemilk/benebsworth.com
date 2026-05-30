variable "domain" {
  type = string # e.g. next.benebsworth.com
}

variable "aliases" {
  type = list(string) # all CNAMEs on the distribution
}

variable "bucket_name" {
  type = string
}

variable "bucket_region" {
  type    = string
  default = "ap-southeast-2"
}

variable "dnsimple_zone" {
  type    = string
  default = "benebsworth.com"
}
