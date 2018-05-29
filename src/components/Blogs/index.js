import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import styled from "styled-components"
import Helmet from 'react-helmet'
import icon16 from '../../assets/images/favicon.png';

import { blogs } from './tests/fixtures'
import BlogList from './BlogList';
import HeaderName from '../HeaderName';

const BlogsWrapper = styled.div`
`
const blogPosts = [
    {
        title: 'dog',
        description: 'cats dont like dogs',
        image: 'image would go here',
        link: 'link here',
        key: '1'
    },
    {
        title: 'dog',
        description: 'cats dont like dogs',
        image: 'image would go here',
        link: 'link here',
        key: '2'
    },
    {
        title: 'dog',
        description: 'cats dont like dogs',
        image: 'image would go here',
        link: 'link here',
        key: '3'
    }
]
export class Blogs extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (<BlogsWrapper>
            <Helmet
                title='Ben Ebsworth [Blog]'
                meta={[
                  { name: 'description', content: 'Blog' },
                  { name: 'keywords', content: 'Blog, technology, software engineering' },
                ]}
               >
                <link rel="icon" type="image/png" href={`${icon16}`} sizes="16x16" />
              </Helmet>
            <Grid style={{ textAlign: 'center'}}>
                <HeaderName />
            </Grid>
            <BlogList items={blogs} />
        </BlogsWrapper>)
    }
}


export default Blogs