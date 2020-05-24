import React from 'react'
import { Link, graphql } from 'gatsby'
import { MDXRenderer } from "gatsby-plugin-mdx"
import Bio from '../components/bio'
import Layout from '../components/layout'
import SEO from '../components/seo'
import Labels from '../components/Labels'
import { rhythm, scale } from '../utils/typography'
class BlogPostTemplate extends React.Component {
  render () {
    const post = this.props.data.mdx
    const siteTitle = this.props.data.site.siteMetadata.title
    const { previous, next } = this.props.pageContext
    const labels = post.frontmatter.labels || ''
    const keywords = post.frontmatter.keywords || ''
    const tags = labels.split(',').concat(
      keywords.split(',').filter(function (item) {
        return labels.indexOf(item) < 0
      })
    )
    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title={post.frontmatter.title}
          description={post.frontmatter.description || post.excerpt}
          keywords={tags}
        />
        <h1 style={{ color: 'var(--textTitle)', marginBottom: rhythm(0.2) }}>
          {post.frontmatter.title}
        </h1>
        <Labels labels={post.frontmatter.labels.split(',')} />
        <p
          style={{
            ...scale(-1 / 5),
            display: `block`,
            marginBottom: rhythm(1)
          }}
        >
          {post.frontmatter.date}
        </p>
        {/* <div dangerouslySetInnerHTML={{ __html: post.html }} /> */}
        <MDXRenderer>{post.body}</MDXRenderer>
        {/* <div>{renderAst(post.html)}</div> */}
        <hr
          style={{
            marginBottom: rhythm(1)
          }}
        />
        <Bio />
        <ul
          style={{
            display: `flex`,
            flexWrap: `wrap`,
            justifyContent: `space-between`,
            listStyle: `none`,
            padding: 0
          }}
        >
          <li>
            {previous && (
              <Link
                style={{
                  boxShadow: 'none',
                  textDecoration: 'none',
                  color: 'var(--green)'
                }}
                to={previous.fields.slug}
                rel='prev'
              >
                ← {previous.frontmatter.title}
              </Link>
            )}
          </li>
          <li>
            {next && (
              <Link to={next.fields.slug} rel='next'>
                {next.frontmatter.title} →
              </Link>
            )}
          </li>
        </ul>
      </Layout>
    )
  }
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
        author
      }
    }
    mdx(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      body
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        description
        labels
        keywords
      }
    }
  }
`
