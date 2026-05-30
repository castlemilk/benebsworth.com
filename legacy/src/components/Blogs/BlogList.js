import React from 'react'
import Link from 'gatsby-link'
import BlogCard from './BlogCard'

class BlogList extends React.Component {
  constructor (props) {
    super(props)
  }
  render () {
    const items = this.props.items.map(blogProps => (
      <BlogCard key={blogProps.key} {...blogProps} />
    ))
    return <div>{items}</div>
  }
}

export default BlogList
