import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import styled from "styled-components"

import HeaderName from '../HeaderName';

const BlogsWrapper = styled.div`

`
export class Blogs extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (<BlogsWrapper>
            <Grid style={{ textAlign: 'center'}}>
                <HeaderName />
            </Grid>
            items
        </BlogsWrapper>)
    }
}


export default Blogs