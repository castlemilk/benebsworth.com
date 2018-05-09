import React from 'react'
import Link from 'gatsby-link'
import styled from "styled-components"
import Paper from 'material-ui/Paper';

const BlogWrapper = styled.div`
height: 100px;
width: 300px;
`

const BlogCard = ({ title, description, image }) => (
 
    <Paper>
        <BlogWrapper>
        {title}<br/>
        {description}<br/>
        {image}
        </BlogWrapper>
    </Paper>
)

export default BlogCard
