output "bucket" {
  value = aws_s3_bucket.site.id
}
output "distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}
output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}
