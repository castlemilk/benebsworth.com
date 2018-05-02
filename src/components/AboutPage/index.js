import React from 'react';
import PropTypes from 'prop-types';
import Grid from 'material-ui/Grid';
import styled from "styled-components"

import HeaderName from '../HeaderName';
import AboutBody from './AboutBody';
import AboutFooter from './AboutFooter';


export class AboutPage extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (<div>
            <Grid style={{ textAlign: 'center'}}>
                <HeaderName />
            </Grid>
            <Grid>
                <AboutBody />
            </Grid>
            <Grid>
                <AboutFooter />
            </Grid>     
        </div>)
    }
}


export default AboutPage