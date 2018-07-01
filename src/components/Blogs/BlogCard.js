import React from 'react'
import Link from 'gatsby-link'
import styled from "styled-components"
import Paper from '@material-ui/core/Paper';

const BlogWrapper = styled.div`
display: inline-block;
width: 1024px;
    .blog-card-image {
        margin: 5px;
        float: left;
        display: flex;
    }
    .blog-text-wrapper {
        display: inline-block;
        text-align: left;
    }
    .blog-card-title {
        font-size: 30px;
        font-family: 'Days One';
        width: 100%;
        margin-left: 5px;
        text-align: left;
        align-content: top;
    }
    .blog-card-description {
        font-size: 15px;
        margin-left: 10px;
        font-family: 'Days One';
        text-align: left;
    }
`
const Wrapper = styled.div`
justify-content: center;
align-items: center;
flex-wrap: wrap;
display: flex;
margin-bottom: 10px;

`

const BlogCard = ({ title, description, image }) => (
    <Wrapper>
        <Paper>
            <BlogWrapper>
            <div className='blog-card-image' >
                <img src={image} />
            </div>
            <div className='blog-text-wrapper' >
            <div className='blog-card-title' >
                {title}
            </div>
            <div className='blog-card-description' >
                <p>{description}</p>
            </div>
            </div>
            </BlogWrapper>
        </Paper>
    </Wrapper>
)

export default BlogCard
