// import React from 'react'
// import Link from 'gatsby-link'
// import Helmet from 'react-helmet';
// import Blogs from '../../components/Blogs'

// const BlogIndexPage = () => (
//   <div >
//     <Helmet
//         key="app-head"
//         titleTemplate="%s · Blog"
//         defaultTitle="Ben Ebsworth"
//         meta={[
//                   { name: 'description', content: 'Ben Ebsworth Blogs' },
//                   { name: 'keywords', content: 'Blog, technology, software engineering, about, personal, ben ebsworth, ' },
//                 ]}
//       >
//         <meta charSet="utf-8" />
//         <meta name="viewport" content="initial-scale=1.0, width=device-width" />
//         <title>Ben Ebsworth</title>
//         <meta name="apple-mobile-web-app-title" content="benebsworth.com" />
//         <meta name="application-name" content="benebsworth.com" />
//         <meta name="theme-color" content="#c800ec" />
//         <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
//         <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32x32.png" />
//         <link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16x16.png" />
//         <link rel="mask-icon" href="/static/safari-pinned-tab.svg" color="#c800ec" />
//       </Helmet>
//       <Blogs />
//   </div>
// )

// export default BlogIndexPage
import React from "react"
import { Link, graphql } from "gatsby"

import Bio from "../../components/bio"
import Layout from "../../components/layout"
import SEO from "../../components/seo"
import { rhythm } from "../../utils/typography"

class BlogIndex extends React.Component {
  render() {
    const { data } = this.props
    const siteTitle = data.site.siteMetadata.title
    const posts = data.allMarkdownRemark.edges

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title="All posts"
          keywords={[`blog`, `gatsby`, `javascript`, `react`]}
        />
        <Bio />
        {posts.map(({ node }) => {
          const title = node.frontmatter.title || node.fields.slug
          return (
            <div key={node.fields.slug}>
              <h3
                style={{
                  marginBottom: rhythm(1 / 4),
                  color: 'var(--green)',
                }}
              >
                <Link style={{ boxShadow: `none` ,  color: 'var(--green)'}} to={node.fields.slug}>
                  {title}
                </Link>
              </h3>
              <small>{node.frontmatter.date}</small>
              <p
                dangerouslySetInnerHTML={{
                  __html: node.frontmatter.description || node.excerpt,
                }}
              />
            </div>
          )
        })}
      </Layout>
    )
  }
}

export default BlogIndex

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      edges {
        node {
          excerpt
          fields {
            slug
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            description
          }
        }
      }
    }
  }
`

