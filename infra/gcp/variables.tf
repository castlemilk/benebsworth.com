variable "project_id" {
  type        = string
  default     = "benebsworth-web"
  description = "GCP project hosting the hiking bucket."
}

variable "region" {
  type        = string
  default     = "australia-southeast1"
  description = "Bucket location."
}

variable "bucket_name" {
  type        = string
  default     = "benebsworth-hiking"
  description = "Globally-unique GCS bucket for hike photos + manifests."
}

variable "admin_email" {
  type        = string
  default     = "ben.ebsworth@gmail.com"
  description = "The only account granted write (objectAdmin) on the bucket."
}

variable "cors_origins" {
  type    = list(string)
  default = [
    "https://benebsworth.com",
    "https://www.benebsworth.com",
    "https://next.benebsworth.com",
    "http://localhost:3000",
  ]
  description = "Origins allowed to upload/read cross-origin (the site + local dev)."
}
