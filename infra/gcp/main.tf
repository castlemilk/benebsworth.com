# Hiking photo storage — a public-read GCS bucket the site reads galleries from,
# and which the admin (ben.ebsworth@gmail.com) writes to directly from the browser
# using their own OAuth token. Write access is THIS bucket IAM (objectAdmin to the
# admin only) + the CORS rule below — there is no server.
#
# Bootstrap (done once, outside TF — see docs/hiking-admin-setup.md):
#   project benebsworth-web + billing, storage API, and the tfstate bucket
#   gs://benebsworth-web-tfstate (the GCS backend for this state).
#
# NOT managed here: the Google OAuth *Web client* (browser sign-in) — Terraform's
# google provider has no resource for a generic browser OAuth client, so it stays
# a console step (docs/hiking-admin-setup.md §3).

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
  backend "gcs" {
    bucket = "benebsworth-web-tfstate"
    prefix = "hiking"
  }
}

provider "google" {
  # Authenticates via Application Default Credentials (ben.ebsworth@gmail.com).
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_storage_bucket" "hiking" {
  name                        = var.bucket_name
  project                     = var.project_id
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited" # must allow the allUsers read binding below
  force_destroy               = false

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "OPTIONS"]
    response_header = ["Content-Type", "Authorization", "Cache-Control", "ETag"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.storage]
}

# Public read — galleries are served straight from the bucket.
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.hiking.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Write — the admin's own Google account only. THIS is the security boundary.
resource "google_storage_bucket_iam_member" "admin_write" {
  bucket = google_storage_bucket.hiking.name
  role   = "roles/storage.objectAdmin"
  member = "user:${var.admin_email}"
}
