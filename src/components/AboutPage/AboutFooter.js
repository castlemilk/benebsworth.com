


import React from 'react'
import Link from 'gatsby-link'
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import styled from 'styled-components';

import AboutContact from './AboutContact';
import AboutSocial from './AboutSocial';

const AboutFooterWrapper = styled.div`
    height: 200px;
    display: inline-block;
    width: 100%;
`
export class AboutFooter extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isHover: false }
    }
    render() {
    return (
    <AboutFooterWrapper>
    <AboutSocial />
    <AboutContact />
        
    </AboutFooterWrapper>
    )
    }
}

export default AboutFooter
