# Live prod resources, adopted 2026-06-19 (see main.tf). Edit + `terraform apply` to change prod.
resource "aws_s3_bucket_policy" "site" {
  bucket = "benebsworth.com"
  policy = jsonencode({
    Statement = [{
      Action    = "s3:GetObject"
      Effect    = "Allow"
      Principal = "*"
      Resource  = "arn:aws:s3:::benebsworth.com/*"
      Sid       = "PublicReadGetObject"
    }]
    Version = "2012-10-17"
  })
}

resource "aws_s3_bucket_website_configuration" "site" {
  bucket                = "benebsworth.com"
  expected_bucket_owner = null
  error_document {
    key = "index.html"
  }
  index_document {
    suffix = "index.html"
  }
}

resource "aws_cloudfront_response_headers_policy" "security" {
  comment = "Security headers + CSP (applied via CLI; mirrors infra/modules/site)"
  name    = "security-benebsworth-com"
  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com; font-src 'self'; connect-src 'self'; frame-src 'none'; upgrade-insecure-requests"
      override                = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      override        = true
      referrer_policy = "strict-origin-when-cross-origin"
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
      preload                    = true
    }
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  aliases             = ["benebsworth.com", "www.benebsworth.com"]
  comment             = null
  default_root_object = "index.html"
  enabled             = true
  http_version        = "http2"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_200"
  retain_on_delete    = false
  staging             = false
  tags                = {}
  tags_all            = {}
  wait_for_deployment = true
  web_acl_id          = null
  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD"]
    cache_policy_id            = null
    cached_methods             = ["GET", "HEAD"]
    compress                   = false
    default_ttl                = 86400
    field_level_encryption_id  = null
    max_ttl                    = 31536000
    min_ttl                    = 0
    origin_request_policy_id   = null
    realtime_log_config_arn    = null
    response_headers_policy_id = "b577b51c-65b3-4b6c-9993-e07a1c1dbe58"
    smooth_streaming           = false
    target_origin_id           = "S3-benebsworth.com"
    trusted_key_groups         = []
    trusted_signers            = []
    viewer_protocol_policy     = "redirect-to-https"
    forwarded_values {
      headers                 = []
      query_string            = false
      query_string_cache_keys = []
      cookies {
        forward           = "none"
        whitelisted_names = []
      }
    }
    grpc_config {
      enabled = false
    }
  }
  origin {
    connection_attempts      = 3
    connection_timeout       = 10
    domain_name              = "benebsworth.com.s3-website-ap-southeast-2.amazonaws.com"
    origin_access_control_id = null
    origin_id                = "S3-benebsworth.com"
    origin_path              = null
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_keepalive_timeout = 5
      origin_protocol_policy   = "http-only"
      origin_read_timeout      = 30
      origin_ssl_protocols     = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }
  restrictions {
    geo_restriction {
      locations        = []
      restriction_type = "none"
    }
  }
  viewer_certificate {
    acm_certificate_arn            = "arn:aws:acm:us-east-1:299413881343:certificate/a6f0b992-a05b-4b27-8f93-38cc028a3423"
    cloudfront_default_certificate = false
    iam_certificate_id             = null
    minimum_protocol_version       = "TLSv1.2_2021"
    ssl_support_method             = "sni-only"
  }
}

resource "aws_s3_bucket" "site" {
  bucket              = "benebsworth.com"
  force_destroy       = null
  object_lock_enabled = false
  tags                = {}
  tags_all            = {}
}
