import React from 'react'
import Helmet from 'react-helmet'
import PropTypes from 'prop-types'
import { SEOconfig } from '../../config'
const getSchemaOrgJSONLD = ({
  isBlogPost,
  url,
  title,
  image,
  description,
  datePublished
}) => {
  const schemaOrgJSONLD = [
    {
      '@context': 'http://schema.org',
      '@type': 'WebSite',
      url,
      name: title,
      alternateName: SEO.title
    }
  ]
  return isBlogPost
    ? [
      ...schemaOrgJSONLD,
      {
        '@context': 'http://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            item: {
              '@id': url,
              name: title,
              image
            }
          }
        ]
      },
      {
        '@context': 'http://schema.org',
        '@type': 'BlogPosting',
        url,
        name: title,
        alternateName: config.title,
        headline: title,
        image: {
          '@type': 'ImageObject',
          url: image
        },
        description,
        author: {
          '@type': 'Person',
          name: 'Ben Ebsworth'
        },
        publisher: {
          '@type': 'Organization',
          url: 'https://benebsworth.com',
          logo: config.logo,
          name: 'Ben Ebsworth'
        },
        mainEntityOfPage: {
          '@type': 'WebSite',
          '@id': config.url
        },
        datePublished
      }
    ]
    : schemaOrgJSONLD
}

const SEO = ({ postData, postImage, isBlogPost }) => {
  const postMeta = postData.frontmatter || {}

  const title = postMeta.title || SEOconfig.title
  const description =
    postMeta.description || postData.excerpt || SEOconfig.description
  const image = `${SEOconfig.url}${postImage}` || SEOconfig.image
  const url = postMeta.slug
    ? //   ? `${SEOconfig.url}${path.sep}${postMeta.slug}`
    ''
    : SEOconfig.url
  const datePublished = isBlogPost ? postMeta.datePublished : false

  const schemaOrgJSONLD = getSchemaOrgJSONLD({
    isBlogPost,
    url,
    title,
    image,
    description,
    datePublished
  })

  return (
    <Helmet>
      {/* General tags */}
      <meta name='description' content={description} />
      <meta name='image' content={image} />

      {/* Schema.org tags */}
      <script type='application/ld+json'>
        {JSON.stringify(schemaOrgJSONLD)}
      </script>

      {/* OpenGraph tags */}
      <meta property='og:url' content={url} />
      {isBlogPost ? <meta property='og:type' content='article' /> : null}
      <meta property='og:title' content={title} />
      <meta property='og:description' content={description} />
      <meta property='og:image' content={image} />
      <meta property='fb:app_id' content={SEOconfig.fbAppID} />

      {/* Twitter Card tags */}
      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:creator' content={SEOconfig.twitter} />
      <meta name='twitter:title' content={title} />
      <meta name='twitter:description' content={description} />
      <meta name='twitter:image' content={image} />
    </Helmet>
  )
}

SEO.propTypes = {
  isBlogPost: PropTypes.bool,
  postData: PropTypes.shape({
    frontmatter: PropTypes.any,
    excerpt: PropTypes.any
  }).isRequired,
  postImage: PropTypes.string
}

SEO.defaultProps = {
  isBlogPost: false,
  postImage: null
}

export default SEO
