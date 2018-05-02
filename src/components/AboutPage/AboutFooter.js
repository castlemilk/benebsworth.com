


import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';

import AboutContact from './AboutContact';
import AboutSocial from './AboutSocial';

const AboutFooterWrapper = styled.div`
    text-align: center;
    display: inline-block;
    width: 50%;
`
export class AboutFooter extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isHover: false }
    }
    render() {
    return (
        <div>
    <AboutFooterWrapper>
        <Grid>
            <AboutSocial />
        </Grid>
    </AboutFooterWrapper>
    <AboutFooterWrapper>
        <Grid >
            <AboutContact />
        </Grid>
    </AboutFooterWrapper>
    </div>
    )
    }
}

export default AboutFooter
