import React from 'react'
import { StaticQuery, graphql } from 'gatsby'

import { rhythm } from '../utils/typography'

function Bio () {
  return (
    <StaticQuery
      query={bioQuery}
      render={data => {
        const { author, social, twitter } = data.site.siteMetadata
        return (
          <div
            style={{
              display: `flex`,
              marginBottom: rhythm(2.5),
              alignItems: `center`,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: `50%`,
                backgroundColor: `#222`,
                marginRight: rhythm(1 / 2),
                flexShrink: 0,
                display: `flex`,
                alignItems: `center`,
                justifyContent: `center`,
                fontSize: 20,
              }}
            >
              {author ? author[0] : `B`}
            </div>
            <p>
              Written by <strong>{author}</strong>, thoughts are their own and
              any material is representative of an attempt to self-educate and
              explore ideas and technology
              {` `}
              <a href={`https://twitter.com/${social?.twitter || 'benebsworth'}`}>
                You should follow {author?.split(' ')[0]} on Twitter
              </a>
            </p>
          </div>
        )
      }}
    />
  )
}

const bioQuery = graphql`
  query BioQuery {
    site {
      siteMetadata {
        author
        social {
          twitter
        }
      }
    }
  }
`

export default Bio
