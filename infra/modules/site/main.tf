# Bucket (private)
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}
resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ACM cert (must be us-east-1 for CloudFront)
resource "aws_acm_certificate" "cert" {
  provider                  = aws.us_east_1
  domain_name               = var.domain
  subject_alternative_names = [for a in var.aliases : a if a != var.domain]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}
resource "dnsimple_zone_record" "cert_validation" {
  for_each  = { for o in aws_acm_certificate.cert.domain_validation_options : o.domain_name => o }
  zone_name = var.dnsimple_zone
  name      = trimsuffix(replace(each.value.resource_record_name, ".${var.dnsimple_zone}.", ""), ".")
  type      = each.value.resource_record_type
  value     = trimsuffix(each.value.resource_record_value, ".")
  ttl       = 60
}
resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for r in dnsimple_zone_record.cert_validation : "${r.name}.${var.dnsimple_zone}"]
}

# CloudFront Function for clean URLs
resource "aws_cloudfront_function" "rewrite" {
  name    = "rewrite-${replace(var.domain, ".", "-")}"
  runtime = "cloudfront-js-2.0"
  code    = file("${path.module}/../../cloudfront-rewrite.js")
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "oac-${replace(var.domain, ".", "-")}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = var.aliases

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cert.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# Allow CloudFront (OAC) to read the bucket
data "aws_iam_policy_document" "s3" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.s3.json
}

# DNS alias for each hostname -> CloudFront.
# Apex (zone root) cannot be a CNAME; DNSimple supports ALIAS records at the
# apex, so use ALIAS when the hostname equals the zone, CNAME otherwise.
resource "dnsimple_zone_record" "alias" {
  for_each  = toset(var.aliases)
  zone_name = var.dnsimple_zone
  name      = trimsuffix(replace(each.value, var.dnsimple_zone, ""), ".")
  type      = each.value == var.dnsimple_zone ? "ALIAS" : "CNAME"
  value     = aws_cloudfront_distribution.cdn.domain_name
  ttl       = 300
}
