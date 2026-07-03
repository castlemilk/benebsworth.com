output "bucket" {
  value       = google_storage_bucket.hiking.name
  description = "→ NEXT_PUBLIC_HIKE_BUCKET"
}

output "public_base" {
  value       = "https://storage.googleapis.com/${google_storage_bucket.hiking.name}"
  description = "→ NEXT_PUBLIC_HIKE_PUBLIC_BASE"
}
